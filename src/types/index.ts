export type NodeType = 'text' | 'youtube';

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
