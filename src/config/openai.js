import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.warn('WARNING: OpenAI API key not set in environment variables.');
  console.warn('Please set OPENAI_API_KEY in your .env file');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});