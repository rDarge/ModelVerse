
// src/ai/flows/relay-user-prompt.ts
'use server';

/**
 * @fileOverview Relays a user prompt (text and/or image) along with conversation history to a selected LLM and returns the response.
 * It filters out image data for models that do not support image inputs.
 *
 * - relayUserPrompt - A function that relays the user's prompt and history to the selected LLM.
 * - RelayUserPromptInput - The input type for the relayUserPrompt function.
 * - RelayUserPromptOutput - The return type for the relayUserPrompt function.
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

const RelayUserPromptInputSchema = z.object({
  prompt: z.string().optional().describe('The current user text prompt to relay to the LLM.'),
  model: z.string().describe('The selected LLM model to use.'),
  photoDataUri: z.string().optional().describe(
    "An optional photo for the current prompt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  history: z.array(ChatTurnSchema).optional().describe("The conversation history before the current prompt."),
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
  'anthropic/claude-3-haiku-20240307' // Assuming this variant is text-only
];

const relayUserPromptFlow = ai.defineFlow(
  {
    name: 'relayUserPromptFlow',
    inputSchema: RelayUserPromptInputSchema,
    outputSchema: RelayUserPromptOutputSchema,
  },
  async (input) => {
    const { prompt: currentPromptText, photoDataUri: currentPhotoDataUriFromUser, model, history: pastHistoryTurns } = input;

    const isTextOnlyModel = TEXT_ONLY_MODELS.includes(model);

    let finalPhotoDataUriForCurrentPrompt = currentPhotoDataUriFromUser;
    const trimmedCurrentPromptText = currentPromptText?.trim();

    if (isTextOnlyModel && finalPhotoDataUriForCurrentPrompt) {
      // If the model is text-only and an image was provided for the current prompt
      if (!trimmedCurrentPromptText) {
        // User provided only an image to a text-only model
        return { response: "The selected model does not support images. Please provide a text prompt or select a different model." };
      }
      // If text was also provided, strip the image and proceed with text only for the current prompt
      finalPhotoDataUriForCurrentPrompt = undefined;
    }

    // 1. Prepare past history for the 'messages' field (MessageData[])
    const pastMessagesForAI: MessageData[] = [];
    if (pastHistoryTurns) {
      for (const turn of pastHistoryTurns) {
        const historicalTurnContentParts: Part[] = [];
        if (turn.text && turn.text.trim() !== "") {
          historicalTurnContentParts.push({ text: turn.text.trim() });
        }
        // Only include photo from history if the model is NOT text-only and photo exists
        if (turn.photoDataUri && !isTextOnlyModel) {
          historicalTurnContentParts.push({ media: { url: turn.photoDataUri } });
        }
        // Only add a turn to history if it has actual content
        if (historicalTurnContentParts.length > 0) {
          pastMessagesForAI.push({ role: turn.role, content: historicalTurnContentParts });
        }
      }
    }

    // 2. Prepare current prompt for the 'prompt' field (Part[])
    const currentPromptPartsForAI: Part[] = [];
    // Use a default prompt "Describe this image." only if there's an image (and it's allowed) and no text.
    const effectiveCurrentPromptText = trimmedCurrentPromptText || (finalPhotoDataUriForCurrentPrompt && !trimmedCurrentPromptText ? "Describe this image." : "");

    if (effectiveCurrentPromptText) {
      currentPromptPartsForAI.push({ text: effectiveCurrentPromptText });
    }
    if (finalPhotoDataUriForCurrentPrompt) { // This is the potentially stripped photo URI
      currentPromptPartsForAI.push({ media: { url: finalPhotoDataUriForCurrentPrompt } });
    }

    // If there's no current prompt content (neither text nor image after filtering) AND no history, then it's an empty request.
    if (currentPromptPartsForAI.length === 0 && pastMessagesForAI.length === 0) {
        return { response: "Please provide a prompt." };
    }
    
    // Construct GenerateOptions
    const generateOptions: GenerateOptions<any, any> = {
      model: model,
      prompt: currentPromptPartsForAI, // Current input as Part[]
    };

    if (pastMessagesForAI.length > 0) {
      generateOptions.messages = pastMessagesForAI; // Past history as MessageData[]
    }
    
    const {text} = await ai.generate(generateOptions);
    
    return {response: text!};
  }
);
