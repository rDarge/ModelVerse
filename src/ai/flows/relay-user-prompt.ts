
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
    const { prompt: currentPromptText, photoDataUri: currentPhotoDataUri, model, history } = input;

    const conversationTurnsForAI: ({ role: 'user' | 'model'; parts: any[] })[] = [];

    // Process past history
    if (history) {
      for (const turn of history) {
        const parts: any[] = [];
        if (turn.text && turn.text.trim() !== "") {
          parts.push({ text: turn.text.trim() });
        }
        if (turn.photoDataUri) {
          parts.push({ media: { url: turn.photoDataUri } });
        }
        // Only add a turn to history if it has actual content
        if (parts.length > 0) {
          conversationTurnsForAI.push({ role: turn.role, parts });
        }
      }
    }

    // Current user turn - this is the new message being sent
    const currentUserParts: any[] = [];
    const trimmedCurrentPromptText = currentPromptText?.trim();
    // Use a default prompt only if there's an image and no text.
    const effectiveCurrentPromptText = trimmedCurrentPromptText || (currentPhotoDataUri && !trimmedCurrentPromptText ? "Describe this image." : ""); 

    if (effectiveCurrentPromptText) {
      currentUserParts.push({ text: effectiveCurrentPromptText });
    }
    if (currentPhotoDataUri) {
      currentUserParts.push({ media: { url: currentPhotoDataUri } });
    }

    // Add current user turn to the conversation history if it has content
    if (currentUserParts.length > 0) {
      conversationTurnsForAI.push({ role: 'user', parts: currentUserParts });
    }

    // If, after processing history and current input, there's nothing to send.
    if (conversationTurnsForAI.length === 0) {
        return { response: "Please provide a prompt or an image." };
    }
    
    const {text} = await ai.generate({
      prompt: conversationTurnsForAI,
      model: model,
    });
    return {response: text!};
  }
);
