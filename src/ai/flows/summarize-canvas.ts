'use server';
/**
 * @fileOverview An AI flow for summarizing the content of the entire concept canvas.
 *
 * - summarizeCanvas - A function that generates a summary of all nodes and their connections.
 * - SummarizeCanvasInput - The input type for the summarizeCanvas function.
 * - SummarizeCanvasOutput - The return type for the summarizeCanvas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NodeInfoSchema = z.object({
  id: z.string(),
  content: z.string(),
});

const EdgeInfoSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
});

const SummarizeCanvasInputSchema = z.object({
  nodes: z.array(NodeInfoSchema).describe('A list of all nodes on the canvas.'),
  edges: z.array(EdgeInfoSchema).describe('A list of all connections between nodes.'),
});
export type SummarizeCanvasInput = z.infer<typeof SummarizeCanvasInputSchema>;

const SummarizeCanvasOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the entire canvas.'),
});
export type SummarizeCanvasOutput = z.infer<typeof SummarizeCanvasOutputSchema>;

export async function summarizeCanvas(input: SummarizeCanvasInput): Promise<SummarizeCanvasOutput> {
  return summarizeCanvasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeCanvasPrompt',
  input: {schema: SummarizeCanvasInputSchema},
  output: {schema: SummarizeCanvasOutputSchema},
  prompt: `You are an expert at synthesizing information from a knowledge graph.
  
Given the following set of nodes and the connections (edges) between them, please generate a concise, high-level summary of the overall topic and its main points.

The user has provided a list of nodes, each with an ID and its text content. They have also provided a list of edges, defining relationships by linking source node IDs to target node IDs.

Analyze the structure and content to understand the central themes and how ideas are linked.

Nodes:
{{#each nodes}}
- Node ID: {{id}}, Content: "{{content}}"
{{/each}}

Edges:
{{#each edges}}
- Connection from Node {{sourceId}} to Node {{targetId}}
{{/each}}

Based on this information, provide a clear and coherent summary.
`,
});

const summarizeCanvasFlow = ai.defineFlow(
  {
    name: 'summarizeCanvasFlow',
    inputSchema: SummarizeCanvasInputSchema,
    outputSchema: SummarizeCanvasOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
