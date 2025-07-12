'use server';
/**
 * @fileOverview A Genkit flow for generating an image based on the text content of a node.
 *
 * - generateImageForNode - A function that creates an image for a given text prompt.
 * - GenerateImageForNodeInput - The input type for the generateImageForNode function.
 * - GenerateImageForNodeOutput - The return type for the generateImageForNode function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageForNodeInputSchema = z.object({
  topic: z.string().describe('The text content of the node to generate an image for.'),
});
export type GenerateImageForNodeInput = z.infer<typeof GenerateImageForNodeInputSchema>;

const GenerateImageForNodeOutputSchema = z.object({
  imageUrl: z.string().url().describe('The data URI of the generated image.'),
});
export type GenerateImageForNodeOutput = z.infer<typeof GenerateImageForNodeOutputSchema>;

export async function generateImageForNode(input: GenerateImageForNodeInput): Promise<GenerateImageForNodeOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageForNodeInputSchema,
    outputSchema: GenerateImageForNodeOutputSchema,
  },
  async ({topic}) => {
    const {media} = await ai.generate({
      // IMPORTANT: ONLY the googleai/gemini-2.0-flash-preview-image-generation model is able to generate images. You MUST use exactly this model to generate images.
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `Generate a visually appealing, minimalist, and abstract image that represents the concept of: "${topic}". The image should be suitable as an icon or a visual aid in a concept map.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
      },
    });

    if (!media.url) {
      throw new Error('Image generation failed to produce a result.');
    }
    
    return { imageUrl: media.url };
  }
);
