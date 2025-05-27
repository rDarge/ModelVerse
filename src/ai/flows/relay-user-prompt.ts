
// src/ai/flows/relay-user-prompt.ts
'use server';

/**
 * @fileOverview Relays a user prompt (text and/or image) to a selected LLM and returns the response.
 *
 * - relayUserPrompt - A function that relays the user's prompt to the selected LLM.
 * - RelayUserPromptInput - The input type for the relayUserPrompt function.
 * - RelayUserPromptOutput - The return type for the relayUserPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RelayUserPromptInputSchema = z.object({
  prompt: z.string().optional().describe('The user text prompt to relay to the LLM.'),
  model: z.string().describe('The selected LLM model to use.'),
  photoDataUri: z.string().optional().describe(
    "An optional photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
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
  async input => {
    let promptPayload: any;
    const textPrompt = input.prompt || (input.photoDataUri ? "Describe this image." : "");

    if (input.photoDataUri) {
      promptPayload = [
        {media: {url: input.photoDataUri}},
        {text: textPrompt},
      ];
    } else {
      promptPayload = textPrompt;
    }

    if (!textPrompt && !input.photoDataUri) {
      // Should not happen if UI validates, but as a safeguard
      return { response: "Please provide a prompt or an image." };
    }
    
    const {text} = await ai.generate({
      prompt: promptPayload,
      model: input.model,
    });
    return {response: text!};
  }
);

