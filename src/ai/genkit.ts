import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import openAI from 'genkitx-openai';

const plugins = [];

if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI());
} else {
  console.warn(
    'GEMINI_API_KEY not found in environment variables. Gemini models will be unavailable.'
  );
}

if (process.env.OPENAI_API_KEY) {
  plugins.push(openAI({apiKey: process.env.OPENAI_API_KEY as string}));
} else {
  console.warn(
    'OPENAI_API_KEY not found in environment variables. OpenAI models will be unavailable.'
  );
}

export const ai = genkit({
  plugins: plugins,
  // Removing global default model:
  // model: 'googleai/gemini-2.0-flash', 
});
