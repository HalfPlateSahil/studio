"use client";

import { useState, useRef, useTransition, useCallback, useLayoutEffect } from 'react';
import type { FormEvent, MouseEvent, WheelEvent } from 'react';
import { generateNodeContent } from '@/ai/flows/generate-node-content';
import { findYouTubeVideos } from '@/ai/flows/find-youtube-videos';
import type { Node, Edge, NodeType, Settings, ActionType, YouTubeVideo } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toolbox } from '@/components/toolbox';
import { ConceptItIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';

const INITIAL_NODE_WIDTH = 288; // w-72
const INITIAL_NODE_HEIGHT = 128; // h-32

function CanvasNode({ node, isSelected, onNodeDown, isProcessing, onNodeResize }: { node: Node; isSelected: boolean; onNodeDown: (e: MouseEvent, nodeId: string) => void; isProcessing: boolean; onNodeResize: (nodeId: string, size: {width: number, height: number}) => void; }) {
  const nodeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (nodeRef.current && node.type === 'text') {
      const { offsetWidth, offsetHeight } = nodeRef.current;
      if (offsetWidth > 0 && offsetHeight > 0 && (node.width !== offsetWidth || node.height !== offsetHeight)) {
        onNodeResize(node.id, { width: offsetWidth, height: offsetHeight });
      }
    }
  }, [node.content, node.id, node.width, node.height, onNodeResize, node.type]);
  
  const content = (
    node.type === 'youtube' ? (
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${node.content}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="rounded-md"
      ></iframe>
    ) : (
      <div className="text-sm">{node.content}</div>
    )
  );
  
  return (
    <div
      ref={nodeRef}
      onMouseDown={(e) => onNodeDown(e, node.id)}
      className={cn(
        "absolute bg-card text-card-foreground rounded-lg shadow-lg p-4 cursor-grab transition-colors duration-200 ease-in-out",
        isSelected && "ring-2 ring-ring shadow-2xl",
        node.type === 'text' ? 'min-w-[18rem] max-w-md' : 'w-72',
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.type === 'youtube' ? node.width : 'auto',
        height: node.type === 'youtube' ? node.height : 'auto',
      }}
    >
      {content}
      {isProcessing && <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>}
    </div>
  );
}

export function ConceptCanvas() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  
  const draggingNodeRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<Settings>({
    responseLength: 100,
    autoLength: false,
    responseFormat: 'paragraph',
    tone: 'professional',
    customInstructions: '',
  });

  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([]);
  const [isYoutubeDialogOpen, setIsYoutubeDialogOpen] = useState(false);
  const [isMobileToolboxOpen, setIsMobileToolboxOpen] = useState(false);


  const handleSettingsChange = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleNodeResize = useCallback((nodeId: string, size: { width: number; height: number }) => {
    setNodes(prev =>
      prev.map(n => (n.id === nodeId && (n.width !== size.width || n.height !== size.height)) ? { ...n, width: size.width, height: size.height } : n)
    );
  }, []);

  const getCanvasCenter = () => {
    if (canvasRef.current) {
      return {
        x: (canvasRef.current.clientWidth / 2 - INITIAL_NODE_WIDTH / 2 - canvasTransform.x) / canvasTransform.zoom,
        y: (canvasRef.current.clientHeight / 2 - INITIAL_NODE_HEIGHT / 2 - canvasTransform.y) / canvasTransform.zoom
      };
    }
    return { x: 200, y: 200 };
  }

  const handleTopicSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const topic = (e.currentTarget.elements.namedItem('topic') as HTMLInputElement).value;
    if (!topic.trim()) return;

    const center = getCanvasCenter();
    const newNode: Node = {
      id: crypto.randomUUID(),
      type: 'text',
      content: topic,
      position: { x: center.x, y: center.y },
      width: INITIAL_NODE_WIDTH,
      height: INITIAL_NODE_HEIGHT,
    };
    
    setNodes([newNode]);
    setEdges([]);
    setSelectedNodeId(newNode.id);
    (e.currentTarget.elements.namedItem('topic') as HTMLInputElement).value = '';
  };

  const addNode = (parentNodeId: string, content: string, type: NodeType) => {
    const parentNode = nodes.find(n => n.id === parentNodeId);
    if (!parentNode) return;

    const newNode: Node = {
      id: crypto.randomUUID(),
      type,
      content,
      position: {
        x: parentNode.position.x + parentNode.width + 80,
        y: parentNode.position.y,
      },
      width: INITIAL_NODE_WIDTH,
      height: type === 'youtube' ? (INITIAL_NODE_WIDTH * 9) / 16 : INITIAL_NODE_HEIGHT,
    };

    const newEdge: Edge = {
      id: `e-${parentNode.id}-${newNode.id}`,
      source: parentNode.id,
      target: newNode.id,
    };

    setNodes(prev => [...prev, newNode]);
    setEdges(prev => [...prev, newEdge]);
    setSelectedNodeId(newNode.id);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };
  
  const handleToolboxAction = (actionType: ActionType, data?: string) => {
    if (actionType === 'DELETE') {
      if(selectedNodeId) deleteNode(selectedNodeId);
      return;
    }

    if (!selectedNodeId) return;

    const parentNode = nodes.find(n => n.id === selectedNodeId);
    if (!parentNode) return;
    
    startTransition(async () => {
      try {
        if (actionType === 'YOUTUBE') {
          const result = await findYouTubeVideos({ topic: parentNode.content });
          setYoutubeResults(result.videos);
          setIsYoutubeDialogOpen(true);
          return;
        }

        const result = await generateNodeContent({
          parentNodeContent: parentNode.content,
          queryType: actionType as any,
          customQuery: actionType === 'CUSTOM' ? data : undefined,
          ...settings,
        });
        if (result.generatedContent) {
          addNode(selectedNodeId, result.generatedContent, 'text');
        }
      } catch (error) {
        console.error("AI generation failed:", error);
        toast({ title: "AI Generation Failed", description: "Could not generate content. Please try again.", variant: "destructive"});
      }
    });
  };

  const handleYoutubeSelect = (videoId: string) => {
    if (selectedNodeId) {
      addNode(selectedNodeId, videoId, 'youtube');
    }
    setIsYoutubeDialogOpen(false);
    setYoutubeResults([]);
  }

  const onMouseDown = (e: MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains("canvas-bg")) return;
    setIsPanning(true);
    setSelectedNodeId(null);
    if (isMobile) {
      setIsMobileToolboxOpen(false);
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (isPanning) {
      setCanvasTransform(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
    if (draggingNodeRef.current) {
        const { nodeId } = draggingNodeRef.current;
        setNodes(prev => prev.map(n => 
            n.id === nodeId 
            ? { ...n, position: { x: n.position.x + e.movementX / canvasTransform.zoom, y: n.position.y + e.movementY / canvasTransform.zoom } }
            : n
        ));
    }
  };

  const onMouseUp = () => {
    setIsPanning(false);
    draggingNodeRef.current = null;
  };

  const onNodeDown = (e: MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    draggingNodeRef.current = { nodeId, offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY };
    if (isMobile) {
      setIsMobileToolboxOpen(true);
    }
  }

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? canvasTransform.zoom * zoomFactor : canvasTransform.zoom / zoomFactor;
    const clampedZoom = Math.max(0.2, Math.min(3, newZoom));
    
    const worldX = (mouseX - canvasTransform.x) / canvasTransform.zoom;
    const worldY = (mouseY - canvasTransform.y) / canvasTransform.zoom;
    
    const newX = mouseX - worldX * clampedZoom;
    const newY = mouseY - worldY * clampedZoom;

    setCanvasTransform({ x: newX, y: newY, zoom: clampedZoom });
  };
  
  const SVG_CANVAS_OFFSET = 5000;
  const getEdgePath = (sourceNode: Node, targetNode: Node) => {
    if (!sourceNode || !targetNode || !sourceNode.width || !targetNode.width) {
        return '';
    }
    const sourceX = sourceNode.position.x + sourceNode.width / 2 + SVG_CANVAS_OFFSET;
    const sourceY = sourceNode.position.y + sourceNode.height / 2 + SVG_CANVAS_OFFSET;
    const targetX = targetNode.position.x + targetNode.width / 2 + SVG_CANVAS_OFFSET;
    const targetY = targetNode.position.y + targetNode.height / 2 + SVG_CANVAS_OFFSET;
    
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }

  return (
    <div className="relative w-full h-full" ref={canvasRef}>
      <div className="absolute top-4 left-4 right-4 md:w-auto md:right-auto z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-2 p-2 bg-card/80 backdrop-blur-sm rounded-lg shadow-md self-start">
            <ConceptItIcon className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold font-headline">ConceptIt</h1>
            </div>
          </div>
          <form onSubmit={handleTopicSubmit} className="flex gap-2 w-full md:w-auto">
            <Input name="topic" placeholder="Enter a topic to explore..." className="w-full md:w-96 bg-card/80 backdrop-blur-sm shadow-md" />
            <Button type="submit" disabled={isPending}>Start Exploring</Button>
          </form>
        </div>
      </div>
      
      <Toolbox 
        isNodeSelected={!!selectedNodeId} 
        onAction={handleToolboxAction} 
        settings={settings}
        onSettingsChange={handleSettingsChange}
        isMobileToolboxOpen={isMobileToolboxOpen}
        onMobileToolboxOpenChange={setIsMobileToolboxOpen}
      />

      <p className="absolute bottom-9 right-4 md:right-20 z-10 text-sm text-muted-foreground font-medium">@HalfPlateSahil</p>

      <div
        className="w-full h-full cursor-grab active:cursor-grabbing canvas-bg"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <div 
          className="absolute top-0 left-0" 
          style={{ 
            transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.zoom})`,
            transformOrigin: '0 0'
          }}
        >
            <svg 
              className="absolute pointer-events-none" 
              style={{
                width: SVG_CANVAS_OFFSET * 2,
                height: SVG_CANVAS_OFFSET * 2,
                top: -SVG_CANVAS_OFFSET,
                left: -SVG_CANVAS_OFFSET,
              }}
            >
                {edges.map(edge => {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    const targetNode = nodes.find(n => n.id === edge.target);
                    if (!sourceNode || !targetNode) return null;

                    return (
                        <path key={edge.id} d={getEdgePath(sourceNode, targetNode)} stroke="hsl(var(--ring))" strokeWidth="2" fill="none" strokeLinecap="round" />
                    )
                })}
            </svg>
            
            {nodes.map(node => (
                <CanvasNode 
                    key={node.id} 
                    node={node} 
                    isSelected={selectedNodeId === node.id}
                    onNodeDown={onNodeDown}
                    isProcessing={isPending && selectedNodeId === node.id}
                    onNodeResize={handleNodeResize}
                />
            ))}
        </div>
      </div>
       <Dialog open={isYoutubeDialogOpen} onOpenChange={setIsYoutubeDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Relevant YouTube Videos</DialogTitle>
            <DialogDescription>
              Select a video to add to your canvas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
            {youtubeResults.length > 0 ? (
              youtubeResults.map((video) => (
                <Card key={video.videoId} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleYoutubeSelect(video.videoId)}>
                  <CardHeader className="p-0">
                    <Image src={video.thumbnailUrl} alt={video.title} width={300} height={168} className="rounded-t-lg w-full object-cover" />
                  </CardHeader>
                  <CardContent className="p-4">
                    <CardTitle className="text-base line-clamp-2">{video.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-3 mt-1">{video.description}</CardDescription>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p>No videos found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
