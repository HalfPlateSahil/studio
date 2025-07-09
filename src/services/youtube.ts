'use server';

import {google} from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

export async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  if (!process.env.YOUTUBE_API_KEY) {
    console.warn(
      'YouTube API key is not set. Skipping YouTube search. Please set YOUTUBE_API_KEY in your .env file.'
    );
    // Returning an empty array to avoid breaking the app if the key is missing.
    // The user will just see "No videos found".
    return [];
  }

  console.log(`[YouTube Service] Searching for: "${query}"`);

  try {
    const response = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults: 5,
      videoEmbeddable: 'true',
    });

    const items = response.data.items;
    if (!items) {
      console.log('[YouTube Service] No items returned from API.');
      return [];
    }

    const results = items.map((item) => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || 'No title',
      description: item.snippet?.description || 'No description',
      thumbnailUrl: `https://i.ytimg.com/vi/${item.id?.videoId}/hqdefault.jpg`,
    })).filter(item => item.videoId); // Filter out any items that didn't have a videoId

    console.log(`[YouTube Service] Found ${results.length} valid video results.`);
    return results;

  } catch (error) {
    console.error('Error searching YouTube:', error);
    // In case of API error, return empty array to prevent app crash.
    return [];
  }
}
