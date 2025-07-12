'use server';
/**
 * @fileOverview An AI flow for suggesting new connections between existing nodes on the canvas.
 *
 * - suggestConnections - A function that analyzes all nodes and suggests potential relationships.
 * - SuggestConnectionsInput - The input type for the suggestConnections function.
 * - SuggestConnectionsOutput - The return type for the suggestConnections function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NodeInfoSchema = z.object({
  id: z.string(),
  content: z.string(),
});

const SuggestConnectionsInputSchema = z.object({
  nodes: z.array(NodeInfoSchema).describe('A list of all nodes on the canvas.'),
  existingEdgeIds: z.array(z.string()).describe('A list of existing edge IDs to avoid suggesting duplicates.'),
});
export type SuggestConnectionsInput = z.infer<typeof SuggestConnectionsInputSchema>;

const SuggestedConnectionSchema = z.object({
  sourceNodeId: z.string().describe('The ID of the source node for the suggested connection.'),
  targetNodeId: z.string().describe('The ID of the target node for the suggested connection.'),
  reason: z.string().describe('A brief explanation for why this connection is being suggested.'),
});

const SuggestConnectionsOutputSchema = z.object({
  suggestions: z.array(SuggestedConnectionSchema).describe('A list of potential new connections.'),
});
export type SuggestConnectionsOutput = z.infer<typeof SuggestConnectionsOutputSchema>;

export async function suggestConnections(input: SuggestConnectionsInput): Promise<SuggestConnectionsOutput> {
  return suggestConnectionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestConnectionsPrompt',
  input: {schema: SuggestConnectionsInputSchema},
  output: {schema: SuggestConnectionsOutputSchema},
  prompt: `You are a knowledge graph expert. Your task is to analyze a set of nodes from a concept map and suggest meaningful new connections between them.

The user has provided a list of nodes, each with an ID and its text content. They have also provided the IDs of existing connections, so you must not suggest connections that already exist.

Analyze the content of all nodes and identify up to 3 potential new connections that represent a logical or interesting relationship. For each suggestion, provide the source and target node IDs and a brief, one-sentence reason for the connection.

Nodes available for connection:
{{#each nodes}}
- Node ID: {{id}}, Content: "{{content}}"
{{/each}}

Existing Connection IDs (do not suggest these pairs):
{{#each existingEdgeIds}}
- {{this}}
{{/each}}

Now, provide your suggestions.
`,
});

const suggestConnectionsFlow = ai.defineFlow(
  {
    name: 'suggestConnectionsFlow',
    inputSchema: SuggestConnectionsInputSchema,
    outputSchema: SuggestConnectionsOutputSchema,
  },
  async (input) => {
    // Filter out nodes that are not text-based before sending to the AI
    const filteredNodes = input.nodes.filter(node => !node.content.startsWith('https://'));
    
    if (filteredNodes.length < 2) {
      return { suggestions: [] };
    }

    const {output} = await prompt({ nodes: filteredNodes, existingEdgeIds: input.existingEdgeIds });
    return output!;
  }
);
