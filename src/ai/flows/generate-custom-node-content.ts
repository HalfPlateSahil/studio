'use server';
/**
 * @fileOverview An AI agent for generating custom node content based on user questions.
 *
 * - generateCustomNodeContent - A function that generates content for a node based on a custom question.
 * - GenerateCustomNodeContentInput - The input type for the generateCustomNodeContent function.
 * - GenerateCustomNodeContentOutput - The return type for the generateCustomNodeContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCustomNodeContentInputSchema = z.object({
  question: z.string().describe('The custom question to ask the AI.'),
  topic: z.string().describe('The topic of the node to generate content for.'),
});
export type GenerateCustomNodeContentInput = z.infer<typeof GenerateCustomNodeContentInputSchema>;

const GenerateCustomNodeContentOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the question.'),
});
export type GenerateCustomNodeContentOutput = z.infer<typeof GenerateCustomNodeContentOutputSchema>;

export async function generateCustomNodeContent(input: GenerateCustomNodeContentInput): Promise<GenerateCustomNodeContentOutput> {
  return generateCustomNodeContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCustomNodeContentPrompt',
  input: {schema: GenerateCustomNodeContentInputSchema},
  output: {schema: GenerateCustomNodeContentOutputSchema},
  prompt: `You are an expert at answering questions about any topic.

  Topic: {{{topic}}}
  Question: {{{question}}}

  Answer:`,
});

const generateCustomNodeContentFlow = ai.defineFlow(
  {
    name: 'generateCustomNodeContentFlow',
    inputSchema: GenerateCustomNodeContentInputSchema,
    outputSchema: GenerateCustomNodeContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
