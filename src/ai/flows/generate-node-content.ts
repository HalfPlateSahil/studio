'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating content for nodes in the Concept Canvas application.
 *
 * It allows users to select a node and use buttons like 'WHAT', 'HOW', 'WHEN', 'EXPLAIN', and 'EXPAND' to generate new content related to the selected node.
 *
 * @interface GenerateNodeContentInput - The input type for the generateNodeContent function.
 * @interface GenerateNodeContentOutput - The output type for the generateNodeContent function.
 * @function generateNodeContent - The main function that triggers the content generation flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNodeContentInputSchema = z.object({
  parentNodeContent: z.string().describe('The content of the parent node.'),
  queryType: z
    .enum(['WHAT', 'HOW', 'WHEN', 'EXPLAIN', 'EXPAND', 'CUSTOM'])
    .describe('The type of query to generate content for.'),
  customQuery: z.string().optional().describe('A custom query provided by the user.'),
  responseLength: z.number().optional().describe('The desired length of the response in words.'),
  autoLength: z.boolean().optional().describe('Whether the AI should automatically determine the response length.'),
  responseFormat: z.string().optional().describe('The desired format for the response (e.g., paragraph, bullet points).'),
  tone: z.string().optional().describe('The desired tone for the response (e.g., professional, friendly).'),
  customInstructions: z.string().optional().describe('Any custom instructions for the AI.'),
});
export type GenerateNodeContentInput = z.infer<typeof GenerateNodeContentInputSchema>;

const GenerateNodeContentOutputSchema = z.object({
  generatedContent: z.string().describe('The AI-generated content for the node.'),
});
export type GenerateNodeContentOutput = z.infer<typeof GenerateNodeContentOutputSchema>;

export async function generateNodeContent(input: GenerateNodeContentInput): Promise<GenerateNodeContentOutput> {
  return generateNodeContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNodeContentPrompt',
  input: {
    schema: GenerateNodeContentInputSchema,
  },
  output: {
    schema: GenerateNodeContentOutputSchema,
  },
  prompt: `You are an AI assistant designed to generate content for a concept canvas.

You will receive the content of a parent node and a query type.
Based on these inputs, generate content that expands on the parent node's content, answering the query.

Parent Node Content: {{{parentNodeContent}}}
Query Type: {{{queryType}}}

{{#if customQuery}}
Custom Query: {{{customQuery}}}
{{/if}}

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

Content:`,
});

const generateNodeContentFlow = ai.defineFlow(
  {
    name: 'generateNodeContentFlow',
    inputSchema: GenerateNodeContentInputSchema,
    outputSchema: GenerateNodeContentOutputSchema,
  },
  async input => {
    let promptInput = input;
    if (input.queryType === 'CUSTOM') {
      if (!input.customQuery) {
        throw new Error('Custom query must be provided when queryType is CUSTOM.');
      }
    }

    const {output} = await prompt(promptInput);
    return output!;
  }
);
