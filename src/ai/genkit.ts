
import {genkit, type ModelInfo, GenerationCommonConfigSchema} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import openAI from 'genkitx-openai';
import { config } from 'dotenv';
config(); // Ensure environment variables are loaded

const plugins = [];

// Google AI (Gemini)
if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI());
  console.log('Google AI (Gemini) plugin loaded.');
} else {
  console.warn(
    'GEMINI_API_KEY not found in environment variables. Gemini models will be unavailable.'
  );
}

// Configure and add ONE instance for OpenAI-compatible models (OpenAI or Grok)
if (process.env.XAI_API_KEY) {
  // Configure for Grok if XAI_API_KEY is present
  const grok3ModelInfo: ModelInfo = {
    label: 'Grok 3',
    versions: ['grok-3'],
    supports: {
      multiturn: true,
      tools: false,
      media: false,
      systemRole: true,
      output: ['text'],
    },
  };
  const grok3ConfigSchema = GenerationCommonConfigSchema.extend({});

  const grok2VisionModelInfo: ModelInfo = {
    label: 'Grok 2 Vision',
    versions: ['grok-2-vision-latest'],
    supports: {
      multiturn: true,
      tools: false,
      media: true, // Vision model
      systemRole: true,
      output: ['text'],
    },
  };
  const grok2VisionConfigSchema = GenerationCommonConfigSchema.extend({});

  plugins.push(
    openAI({
      apiKey: process.env.XAI_API_KEY as string,
      baseURL: 'https://api.x.ai/v1',
      models: [
        { name: 'grok-3', info: grok3ModelInfo, configSchema: grok3ConfigSchema },
        { name: 'grok-2-vision-latest', info: grok2VisionModelInfo, configSchema: grok2VisionConfigSchema },
      ],
    })
  );
  console.log('genkitx-openai plugin loaded and configured for Grok models (grok-3, grok-2-vision-latest).');
  if (process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY is also set, but genkitx-openai is currently configured for Grok. Standard OpenAI models will not be available through this instance.');
  }
} else if (process.env.OPENAI_API_KEY) {
  // Else, if XAI_API_KEY is not set, configure for standard OpenAI if OPENAI_API_KEY is present
  plugins.push(openAI({ apiKey: process.env.OPENAI_API_KEY as string }));
  console.log('genkitx-openai plugin loaded and configured for standard OpenAI models.');
} else {
  // Neither XAI_API_KEY nor OPENAI_API_KEY is present for genkitx-openai
  console.warn(
    'Neither XAI_API_KEY nor OPENAI_API_KEY were found. Models requiring genkitx-openai (e.g., OpenAI official models, Grok) will be unavailable.'
  );
}

export const ai = genkit({
  plugins: plugins,
});

