import { config } from 'dotenv';
config();

import '@/services/youtube.ts';
import '@/ai/flows/generate-node-content.ts';
import '@/ai/flows/generate-custom-node-content.ts';
import '@/ai/flows/find-youtube-videos.ts';
import '@/ai/flows/generate-image.ts';
import '@/ai/flows/suggest-connections.ts';
import '@/ai/flows/summarize-canvas.ts';
import '@/ai/flows/expand-topic.ts';
