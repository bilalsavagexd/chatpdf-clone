import { Pinecone, PineconeRecord} from '@pinecone-database/pinecone';
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document, RecursiveCharacterTextSplitter } from '@pinecone-database/doc-splitter';
import { generateEmbedding } from './embeddings';
import md5 from 'md5';
import { convertToAscii } from './utils';

export const getPineconeClient = () => {
    return new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  };

type PDFPage = {
    pageContent: string;
    metadata : {
        loc: {pageNumber: number}
    }
}

export async function loadS3IntoPinecone(fileKey: string) {
  try {
    console.log('Downloading from S3...');
    const fileName = await downloadFromS3(fileKey);
    if (!fileName) {
      throw new Error("Failed to download file from S3");
    }

    const loader = new PDFLoader(fileName);
    const pages = (await loader.load()) as PDFPage[];

    // 2. Split and segment the pdf into documents
    const documents = await Promise.all(pages.map(prepareDocument));

    // 3. Vectorise and embed indivisual documents:
    const vectors = await Promise.all(documents.flat().map(embedDocument))

    // 4. Upload to Pinecone
    const client = await getPineconeClient();
    const pineconeIndex = await client.index(process.env.PINECONE_INDEX_NAME!);
    const namespace = pineconeIndex.namespace(convertToAscii(fileKey));

    console.log('Inserting Vectors to pinecone')

    await namespace.upsert(vectors);

    return documents[0];


    
    
    return pages;
  } catch (error) {
    console.error('Error in loadS3IntoPinecone:', error);
    throw error;
  }
  
}

export async function embedDocument(doc: Document) {
    try {
        const embeddings = await generateEmbedding(doc.pageContent)
        const hash = md5(doc.pageContent);

        return {
            id: hash,
            values: embeddings,
            metadata: {
                text: doc.metadata.text,
                pageNumber: doc.metadata.pageNumber
            }
        } as PineconeRecord;
    } catch (error) {
        console.log ('error in embedDocument', error);
        throw error
    }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
    const enc = new TextEncoder();
    return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
  };

async function prepareDocument (page: PDFPage) {
    let { pageContent, metadata } = page;
    pageContent = pageContent.replace(/\n/g, '');

    // Split the docs
    const splitter = new RecursiveCharacterTextSplitter()
    const docs = await splitter.splitDocuments([
        new Document({
            pageContent,
            metadata: {
                pageNumber: metadata.loc.pageNumber,
                text: truncateStringByBytes(pageContent, 36000),
            }
        })
    ]);
    return docs;
}