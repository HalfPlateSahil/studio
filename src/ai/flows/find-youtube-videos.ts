'use server';
/**
 * @fileOverview A Genkit flow for finding relevant YouTube videos.
 *
 * - findYouTubeVideos - A function that finds YouTube videos for a given topic.
 * - FindYouTubeVideosInput - The input type for the findYouTubeVideos function.
 * - FindYouTubeVideosOutput - The return type for the findYouTubeVideos function.
 */

import {ai} from '@/ai/genkit';
import {searchYouTube} from '@/services/youtube';
import {z} from 'genkit';

// Input and Output schemas for the exported function.
const FindYouTubeVideosInputSchema = z.object({
  topic: z.string().describe('The topic to search for YouTube videos about.'),
});
export type FindYouTubeVideosInput = z.infer<typeof FindYouTubeVideosInputSchema>;

const FlowYouTubeVideoSchema = z.object({
    videoId: z.string().describe('A valid 11-character YouTube video ID.'),
    title: z.string().describe('The title of the YouTube video.'),
    description: z.string().describe('A brief, one-sentence description of the YouTube video.'),
    thumbnailUrl: z.string().url().describe('The URL for the video thumbnail image.'),
});

const FindYouTubeVideosOutputSchema = z.object({
  videos: z.array(FlowYouTubeVideoSchema).max(5),
});
export type FindYouTubeVideosOutput = z.infer<typeof FindYouTubeVideosOutputSchema>;

// The exported function that the UI calls.
export async function findYouTubeVideos(
  input: FindYouTubeVideosInput
): Promise<FindYouTubeVideosOutput> {
  // Gracefully handle missing API key.
  if (!process.env.YOUTUBE_API_KEY) {
    console.warn('YouTube API key not found. Returning no videos.');
    return { videos: [] };
  }
  return findYouTubeVideosFlow(input);
}

// A prompt that just generates an effective search query.
const generateSearchQueryPrompt = ai.definePrompt({
  name: 'generateSearchQueryPrompt',
  input: { schema: FindYouTubeVideosInputSchema },
  output: { schema: z.object({ query: z.string() }) },
  prompt: `You are an expert at creating search queries for YouTube.
  
  Based on the user's topic, generate a single, concise, and effective search query string to find relevant YouTube videos.
  
  Topic: {{{topic}}}
  
  Only output the search query string.`,
});

// The flow orchestrates the process.
const findYouTubeVideosFlow = ai.defineFlow(
  {
    name: 'findYouTubeVideosFlow',
    inputSchema: FindYouTubeVideosInputSchema,
    outputSchema: FindYouTubeVideosOutputSchema,
  },
  async (input) => {
    // 1. Generate a search query from the topic.
    const { output } = await generateSearchQueryPrompt(input);
    if (!output?.query) {
      console.error('Could not generate a search query.');
      return { videos: [] };
    }
    const searchQuery = output.query;
    console.log(`Generated YouTube search query: "${searchQuery}"`);

    // 2. Use the generated query to search YouTube via the service.
    const videos = await searchYouTube(searchQuery);

    // 3. Return the results.
    return { videos };
  }
);
