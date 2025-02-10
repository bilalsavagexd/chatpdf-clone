import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: 'eu-north-1',
    credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
    }
});

export async function uploadToS3(file: File) {
    try {
        const file_key = 'uploads/' + Date.now().toString() + file.name.replace(' ', '-');
        
        // Convert File to ArrayBuffer for upload
        const fileArrayBuffer = await file.arrayBuffer();

        const command = new PutObjectCommand({
            Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
            Key: file_key,
            Body: Buffer.from(fileArrayBuffer),
        });

        await s3Client.send(command);
        console.log('successfully uploaded to S3!', file_key);

        return {
            file_key,
            file_name: file.name,
        };
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error;
    }
}

export function getS3Url(file_key: string) {
    const url = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.eu-north-1.amazonaws.com/${file_key}`;
    return url;
}