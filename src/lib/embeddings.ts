import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateEmbedding (text: string) {
    try {
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        let input = text.replace(/\n/g, ' ');

        const result = await model.embedContent(input);

        const embedding = result.embedding;
        return embedding.values; 
           
    } catch (error) {
        console.log('error calling google genai embeddings api', error);
        throw error
    }
 }