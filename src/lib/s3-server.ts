import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import { Readable } from 'stream';
import os from 'os'; // Import the 'os' module to get the temporary directory
import path from 'path'; // Import the 'path' module for path manipulation

export async function downloadFromS3(file_key: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const s3 = new S3Client({
        region: "eu-north-1",
        credentials: {
          accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
        },
      });

      const params = {
        Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
        Key: file_key,
      };

      const obj = new GetObjectCommand(params);

      // Use the system's temporary directory
      const tmpDir = os.tmpdir();
      const file_name = path.join(tmpDir, `pdf-${Date.now().toString()}.pdf`);

      // Ensure the temporary directory exists
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const response = await s3.send(obj);

      // Create a writable stream to save the file
      const fileStream = fs.createWriteStream(file_name);

      // Pipe the S3 response body (Readable stream) to the file stream
      (response.Body as Readable).pipe(fileStream);

      // Handle the file stream events
      fileStream.on('finish', () => {
        resolve(file_name); // Resolve with the file path once the file is written
      });

      fileStream.on('error', (error) => {
        reject(error); // Reject if there's an error writing the file
      });
    } catch (error) {
      console.error(error);
      reject(error); // Reject if there's an error with the S3 request
    }
  });
}