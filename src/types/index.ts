export type NodeType = 'text' | 'youtube' | 'image';

export interface Node {
  id: string;
  type: NodeType;
  content: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface Edge {
  id:string;
  source: string;
  target: string;
}

export type ActionType = 
  // Node-specific actions
  | 'WHAT' 
  | 'HOW' 
  | 'WHEN' 
  | 'EXPLAIN' 
  | 'EXPAND' 
  | 'CUSTOM' 
  | 'YOUTUBE' 
  | 'DELETE'
  | 'IMAGE'
  | 'EXPAND_TOPIC'
  // Global canvas actions
  | 'SUMMARIZE'
  | 'SUGGEST';


export interface Settings {
  responseLength: number;
  autoLength: boolean;
  responseFormat: 'paragraph' | 'bullet points' | 'single word';
  tone: 'professional' | 'business' | 'friendly' | 'funny' | 'straightforward' | 'one word' | 'expressive';
  customInstructions: string;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

export interface SuggestedConnection {
  sourceNodeId: string;
  targetNodeId: string;
  reason: string;
}
