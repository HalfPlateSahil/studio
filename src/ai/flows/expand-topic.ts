'use server';
/**
 * @fileOverview An AI flow for expanding a single topic into a mind map of related sub-topics.
 *
 * - expandTopic - A function that takes a central idea and generates a set of related concepts.
 * - ExpandTopicInput - The input type for the expandTopic function.
 * - ExpandTopicOutput - The return type for the expandTopic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpandTopicInputSchema = z.object({
  topic: z.string().describe('The central topic to expand upon.'),
});
export type ExpandTopicInput = z.infer<typeof ExpandTopicInputSchema>;

const SubTopicSchema = z.object({
  title: z.string().describe('The title of the sub-topic.'),
  content: z.string().describe('A brief, one-sentence explanation of the sub-topic.'),
});

const ExpandTopicOutputSchema = z.object({
  subTopics: z.array(SubTopicSchema).max(5).describe('A list of related sub-topics, with a maximum of 5.'),
});
export type ExpandTopicOutput = z.infer<typeof ExpandTopicOutputSchema>;

export async function expandTopic(input: ExpandTopicInput): Promise<ExpandTopicOutput> {
  return expandTopicFlow(input);
}

const prompt = ai.definePrompt({
  name: 'expandTopicPrompt',
  input: {schema: ExpandTopicInputSchema},
  output: {schema: ExpandTopicOutputSchema},
  prompt: `You are an expert mind-mapper and brainstormer. Your goal is to take a central topic and generate a set of closely related sub-topics that would be useful for creating a mind map.

For the given topic, generate 3 to 5 distinct but related sub-topics. For each sub-topic, provide a clear title and a concise one-sentence explanation.

Central Topic: {{{topic}}}
`,
});

const expandTopicFlow = ai.defineFlow(
  {
    name: 'expandTopicFlow',
    inputSchema: ExpandTopicInputSchema,
    outputSchema: ExpandTopicOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
