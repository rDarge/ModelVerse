
import {genkit, type ModelInfo, GenerationCommonConfigSchema} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import openAI from 'genkitx-openai';

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
// This addresses the "Plugin openai already registered" error.
// It means you can use EITHER standard OpenAI models OR Grok via genkitx-openai,
// but not both simultaneously if they require different API keys/base URLs.

if (process.env.XAI_API_KEY) {
  // Configure for Grok if XAI_API_KEY is present
  const grokModelInfo: ModelInfo = {
    label: 'Grok 3',
    versions: ['grok-3'], // This should match the model identifier Grok's API expects
    supports: {
      multiturn: true,
      tools: false, // Assuming no tool support via this API for now
      media: false, // Assuming no media support
      systemRole: true, // Common for chat models
      output: ['text'],
    },
  };
  const grokConfigSchema = GenerationCommonConfigSchema.extend({});

  plugins.push(
    openAI({
      apiKey: process.env.XAI_API_KEY as string,
      baseURL: 'https://api.x.ai/v1',
      models: [
        // The 'name' here is how Genkit will refer to the model, e.g., 'openai/grok-3'
        // The actual model identifier sent to the API is specified in `versions` or handled by the API.
        { name: 'grok-3', info: grokModelInfo, configSchema: grokConfigSchema },
      ],
    })
  );
  console.log('genkitx-openai plugin loaded and configured for Grok models.');
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
