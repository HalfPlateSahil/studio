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
  responseLength: z.number().optional().describe('The desired length of the response in words.'),
  autoLength: z.boolean().optional().describe('Whether the AI should automatically determine the response length.'),
  responseFormat: z.string().optional().describe('The desired format for the response (e.g., paragraph, bullet points).'),
  tone: z.string().optional().describe('The desired tone for the response (e.g., professional, friendly).'),
  customInstructions: z.string().optional().describe('Any custom instructions for the AI.'),
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

  Please adhere to the following instructions for your response:
  {{#if tone}}
  - Adopt a {{{tone}}} tone.
  {{/if}}
  {{#if responseFormat}}
  - Format your response as {{{responseFormat}}}.
  {{/if}}
  {{#unless autoLength}}
  {{#if responseLength}}
  - Keep the response length around {{{responseLength}}} words.
  {{/if}}
  {{/unless}}
  {{#if customInstructions}}
  - Follow these custom instructions: {{{customInstructions}}}
  {{/if}}

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
