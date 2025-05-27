
// src/ai/flows/relay-user-prompt.ts
'use server';

/**
 * @fileOverview Relays a user prompt (text and/or image) along with conversation history to a selected LLM and returns the response.
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

const relayUserPromptFlow = ai.defineFlow(
  {
    name: 'relayUserPromptFlow',
    inputSchema: RelayUserPromptInputSchema,
    outputSchema: RelayUserPromptOutputSchema,
  },
  async (input) => {
    const { prompt: currentPromptText, photoDataUri: currentPhotoDataUri, model, history: pastHistoryTurns } = input;

    // 1. Prepare past history for the 'messages' field (MessageData[])
    const pastMessagesForAI: MessageData[] = [];
    if (pastHistoryTurns) {
      for (const turn of pastHistoryTurns) {
        const historicalTurnContentParts: Part[] = [];
        if (turn.text && turn.text.trim() !== "") {
          historicalTurnContentParts.push({ text: turn.text.trim() });
        }
        if (turn.photoDataUri) {
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
    const trimmedCurrentPromptText = currentPromptText?.trim();
    // Use a default prompt only if there's an image and no text.
    const effectiveCurrentPromptText = trimmedCurrentPromptText || (currentPhotoDataUri && !trimmedCurrentPromptText ? "Describe this image." : "");

    if (effectiveCurrentPromptText) {
      currentPromptPartsForAI.push({ text: effectiveCurrentPromptText });
    }
    if (currentPhotoDataUri) {
      currentPromptPartsForAI.push({ media: { url: currentPhotoDataUri } });
    }

    // If there's no current prompt (neither text nor image) AND no history, then it's an empty request.
    if (currentPromptPartsForAI.length === 0 && pastMessagesForAI.length === 0) {
        return { response: "Please provide a prompt or an image." };
    }
    
    // Construct GenerateOptions
    // Note: Explicitly typing GenerateOptions can be tricky due to its generic nature with CustomOptions.
    // Using 'any' here for simplicity, but in a larger project, you might define a more specific type.
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
