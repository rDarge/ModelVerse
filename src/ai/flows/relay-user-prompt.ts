
// src/ai/flows/relay-user-prompt.ts
'use server';

/**
 * @fileOverview Relays a user prompt (text and/or image) along with conversation history to a selected LLM and returns the response.
 * It filters out image data for models that do not support image inputs and allows model configuration.
 *
 * - relayUserPrompt - A function that relays the user's prompt and history to the selected LLM.
 * - RelayUserPromptInput - The input type for the relayUserPrompt function.
 * - RelayUserPromptOutput - The return type for the relayUserPrompt function.
 * - ModelConfig - The type for model configuration parameters.
 */

import {ai} from '@/ai/genkit';
import {GenerateOptions, MessageData, Part} from 'genkit';
import {z} from 'genkit';

const ChatTurnSchema = z.object({
  role: z.enum(['user', 'model']).describe("The role of the entity that generated this part of the conversation. 'user' for user input, 'model' for AI responses."),
  text: z.string().optional().describe("The text content of this turn."),
  photoDataUri: z.string().optional().describe(
    "An optional photo for this turn, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

const ModelConfigSchema = z.object({
  maxOutputTokens: z.number().int().positive().optional().describe('Maximum number of tokens to generate.'),
  temperature: z.number().min(0).max(2).optional().describe('Controls randomness. Lower is more deterministic.'),
  topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter.'),
  topK: z.number().int().positive().optional().describe('Top-k sampling parameter.'),
}).deepPartial(); // Use deepPartial to ensure all nested fields are optional if any.
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

const RelayUserPromptInputSchema = z.object({
  prompt: z.string().optional().describe('The current user text prompt to relay to the LLM.'),
  model: z.string().describe('The selected LLM model to use.'),
  photoDataUri: z.string().optional().describe(
    "An optional photo for the current prompt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  history: z.array(ChatTurnSchema).optional().describe("The conversation history before the current prompt."),
  modelConfig: ModelConfigSchema.optional().describe('Optional model configuration parameters.'),
});
export type RelayUserPromptInput = z.infer<typeof RelayUserPromptInputSchema>;

const RelayUserPromptOutputSchema = z.object({
  response: z.string().describe('The response from the LLM.'),
});
export type RelayUserPromptOutput = z.infer<typeof RelayUserPromptOutputSchema>;

export async function relayUserPrompt(input: RelayUserPromptInput): Promise<RelayUserPromptOutput> {
  return relayUserPromptFlow(input);
}

// Define models that do not support image inputs
const TEXT_ONLY_MODELS = [
  'openai/gpt-3.5-turbo',
  'openai/grok-3',
  'anthropic/claude-3-haiku-20240307'
];

const relayUserPromptFlow = ai.defineFlow(
  {
    name: 'relayUserPromptFlow',
    inputSchema: RelayUserPromptInputSchema,
    outputSchema: RelayUserPromptOutputSchema,
  },
  async (input) => {
    const { prompt: currentPromptText, photoDataUri: currentPhotoDataUriFromUser, model, history: pastHistoryTurns, modelConfig } = input;

    const isTextOnlyModel = TEXT_ONLY_MODELS.includes(model);

    let finalPhotoDataUriForCurrentPrompt = currentPhotoDataUriFromUser;
    const trimmedCurrentPromptText = currentPromptText?.trim();

    if (isTextOnlyModel && finalPhotoDataUriForCurrentPrompt) {
      if (!trimmedCurrentPromptText) {
        return { response: "The selected model does not support images. Please provide a text prompt or select a different model." };
      }
      finalPhotoDataUriForCurrentPrompt = undefined;
    }

    const pastMessagesForAI: MessageData[] = [];
    if (pastHistoryTurns) {
      for (const turn of pastHistoryTurns) {
        const historicalTurnContentParts: Part[] = [];
        if (turn.text && turn.text.trim() !== "") {
          historicalTurnContentParts.push({ text: turn.text.trim() });
        }
        if (turn.photoDataUri && !isTextOnlyModel) {
          historicalTurnContentParts.push({ media: { url: turn.photoDataUri } });
        }
        if (historicalTurnContentParts.length > 0) {
          pastMessagesForAI.push({ role: turn.role, content: historicalTurnContentParts });
        }
      }
    }

    const currentPromptPartsForAI: Part[] = [];
    const effectiveCurrentPromptText = trimmedCurrentPromptText || (finalPhotoDataUriForCurrentPrompt && !trimmedCurrentPromptText ? "Describe this image." : "");

    if (effectiveCurrentPromptText) {
      currentPromptPartsForAI.push({ text: effectiveCurrentPromptText });
    }
    if (finalPhotoDataUriForCurrentPrompt) {
      currentPromptPartsForAI.push({ media: { url: finalPhotoDataUriForCurrentPrompt } });
    }

    if (currentPromptPartsForAI.length === 0 && pastMessagesForAI.length === 0) {
        return { response: "Please provide a prompt." };
    }
    
    const generateOptions: GenerateOptions<any, any> = {
      model: model,
      prompt: currentPromptPartsForAI,
    };

    if (pastMessagesForAI.length > 0) {
      generateOptions.messages = pastMessagesForAI;
    }

    if (modelConfig) {
      // Filter out undefined values from modelConfig before assigning
      const cleanConfig: Record<string, any> = {};
      for (const key in modelConfig) {
        if (modelConfig[key as keyof ModelConfig] !== undefined) {
          cleanConfig[key] = modelConfig[key as keyof ModelConfig];
        }
      }
      if (Object.keys(cleanConfig).length > 0) {
        generateOptions.config = cleanConfig;
      }
    }
    
    const {text} = await ai.generate(generateOptions);
    
    return {response: text!};
  }
);
