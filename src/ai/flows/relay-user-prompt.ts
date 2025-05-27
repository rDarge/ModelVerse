// src/ai/flows/relay-user-prompt.ts
'use server';

/**
 * @fileOverview Relays a user prompt to a selected LLM and returns the response.
 *
 * - relayUserPrompt - A function that relays the user's prompt to the selected LLM.
 * - RelayUserPromptInput - The input type for the relayUserPrompt function.
 * - RelayUserPromptOutput - The return type for the relayUserPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RelayUserPromptInputSchema = z.object({
  prompt: z.string().describe('The user prompt to relay to the LLM.'),
  model: z.string().describe('The selected LLM model to use.'),
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
    const {text} = await ai.generate({
      prompt: input.prompt,
      model: input.model,
    });
    return {response: text!};
  }
);
