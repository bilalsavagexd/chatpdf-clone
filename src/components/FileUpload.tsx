'use client'
import React from 'react';
import axios from 'axios';
import { uploadToS3 } from "@/lib/s3";
import { toast } from "react-hot-toast";
import { useDropzone } from 'react-dropzone';
import { Inbox, Loader2 } from "lucide-react";
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

const FileUpload = () => {
    const router = useRouter();
    const [uploading, setUploading] = React.useState(false);
    const { mutate, isPending } = useMutation({
        mutationFn: async ({
            file_key,
            file_name
        }: {
            file_key: string,
            file_name: string
        }) => {
            const response = await axios.post('/api/create-chat', {
                file_key,
                file_name
            });
            return response.data;
        },
    });

    const { getRootProps, getInputProps } = useDropzone({
        // Syntax to ensure user can upload only 1 pdf file:
        accept: { 'application/pdf': [".pdf"] },
        maxFiles: 1,
        onDrop: async (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (file.size > 10 * 1024 * 1024) {
                toast.error('Please upload a smaller file');
                return;
            }

            try {
                setUploading(true);
                const data = await uploadToS3(file);
                if (!data?.file_key || !data?.file_name) {
                    toast.error("Something went wrong");
                    return;
                }
                mutate(data, {
                    onSuccess: ({chat_id}) => {
                        toast.success('Chat Created');
                        router.push(`/chat/${chat_id}`);
                    },
                    onError: (err) => {
                        toast.error("Error Creating Chat");
                        console.error(err);
                    }
                });
            } catch (error) {
                console.error(error);
                toast.error("Error uploading file");
            } finally {
                setUploading(false);
            }
        }
    });

    return (
        <div className="p-2 bg-white rounded-xl">
            <div {...getRootProps({
                className: 'border-dashed border-2 rounded-xl cursor-pointer bg-gray-50 py-8 flex justify-center items-center flex-col'
            })}>
                <input {...getInputProps()} />
                {(uploading || isPending) ? (
                    <>
                        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                        <p className="mt-2 text-sm text-slate-400">
                            Spilling Tea to LLM...
                        </p>
                    </>
                ) : (
                    <>
                        <Inbox className="w-10 h-10 text-blue-500" />
                        <p className="mt-2 text-sm text-slate-400">Drop PDF Here</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default FileUpload;