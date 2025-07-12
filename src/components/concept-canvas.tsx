"use client";

import { useState, useRef, useTransition, useCallback, useLayoutEffect } from 'react';
import type { FormEvent, MouseEvent, WheelEvent, TouchEvent } from 'react';
import { generateNodeContent } from '@/ai/flows/generate-node-content';
import { findYouTubeVideos } from '@/ai/flows/find-youtube-videos';
import { generateImageForNode } from '@/ai/flows/generate-image';
import { summarizeCanvas } from '@/ai/flows/summarize-canvas';
import { suggestConnections } from '@/ai/flows/suggest-connections';
import { expandTopic } from '@/ai/flows/expand-topic';
import type { Node, Edge, NodeType, Settings, ActionType, YouTubeVideo, SuggestedConnection } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toolbox } from '@/components/toolbox';
import { ConceptItIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';

const INITIAL_NODE_WIDTH = 288; // w-72
const INITIAL_NODE_HEIGHT = 128; // h-32

function CanvasNode({ node, isSelected, onNodeDown, onNodeTouchStart, isProcessing, onNodeResize, isBeingDragged }: { node: Node; isSelected: boolean; onNodeDown: (e: MouseEvent, nodeId: string) => void; onNodeTouchStart: (e: TouchEvent, nodeId:string) => void; isProcessing: boolean; onNodeResize: (nodeId: string, size: {width: number, height: number}) => void; isBeingDragged: boolean; }) {
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
        className={cn("rounded-md", isBeingDragged && "pointer-events-none")}
      ></iframe>
    ) : node.type === 'image' ? (
      <Image src={node.content} alt="AI Generated Node" width={node.width} height={node.height} className="rounded-md object-cover" />
    ) : (
      <div className="text-sm">{node.content}</div>
    )
  );
  
  return (
    <div
      ref={nodeRef}
      onMouseDown={(e) => onNodeDown(e, node.id)}
      onTouchStart={(e) => onNodeTouchStart(e, node.id)}
      className={cn(
        "absolute bg-card text-card-foreground rounded-lg shadow-lg p-4 cursor-grab transition-colors duration-200 ease-in-out",
        isSelected && "ring-2 ring-ring shadow-2xl",
        node.type === 'text' ? 'min-w-[18rem] max-w-md' : `w-72`,
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.type === 'text' ? 'auto' : node.width,
        height: node.type === 'text' ? 'auto' : node.height,
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
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  
  const draggingNodeRef = useRef<{ nodeId: string; } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const interactionStartRef = useRef<{ x: number; y: number; time: number; } | null>(null);
  const lastPositionRef = useRef<{ x: number, y: number } | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);

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

  // State for new AI features
  const [summary, setSummary] = useState('');
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [suggestedConnections, setSuggestedConnections] = useState<SuggestedConnection[]>([]);
  const [isConnectionsDialogOpen, setIsConnectionsDialogOpen] = useState(false);


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

  const addNode = (parentNodeId: string | null, content: string, type: NodeType, options?: { xOffset?: number, yOffset?: number }) => {
    const parentNode = parentNodeId ? nodes.find(n => n.id === parentNodeId) : null;
    let position: {x: number, y: number};
    
    if (parentNode) {
       position = {
        x: parentNode.position.x + (options?.xOffset ?? parentNode.width + 80),
        y: parentNode.position.y + (options?.yOffset ?? 0),
      };
    } else {
      position = getCanvasCenter();
    }

    const newNode: Node = {
      id: crypto.randomUUID(),
      type,
      content,
      position,
      width: INITIAL_NODE_WIDTH,
      height: type === 'youtube' ? (INITIAL_NODE_WIDTH * 9) / 16 : type === 'image' ? INITIAL_NODE_WIDTH : INITIAL_NODE_HEIGHT,
    };

    setNodes(prev => [...prev, newNode]);
    
    if (parentNodeId) {
       const newEdge: Edge = {
        id: `e-${parentNodeId}-${newNode.id}`,
        source: parentNodeId,
        target: newNode.id,
      };
      setEdges(prev => [...prev, newEdge]);
    }
   
    setSelectedNodeId(newNode.id);
    return newNode;
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const addEdge = (sourceId: string, targetId: string) => {
    const edgeExists = edges.some(e => (e.source === sourceId && e.target === targetId) || (e.source === targetId && e.target === sourceId));
    if (edgeExists) {
        toast({ title: "Connection already exists.", variant: "destructive"});
        return;
    }
    const newEdge: Edge = {
        id: `e-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
    };
    setEdges(prev => [...prev, newEdge]);
  };
  
  const handleToolboxAction = (actionType: ActionType, data?: string) => {
    const parentNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

    if (!parentNode && ['WHAT', 'HOW', 'WHEN', 'EXPLAIN', 'EXPAND', 'CUSTOM', 'YOUTUBE', 'DELETE', 'IMAGE', 'EXPAND_TOPIC'].includes(actionType)) {
        toast({ title: "Please select a node first.", variant: "destructive" });
        return;
    }
    
    startTransition(async () => {
      try {
        switch (actionType) {
            case 'DELETE':
                if (selectedNodeId) deleteNode(selectedNodeId);
                break;
            
            case 'YOUTUBE':
                if (parentNode) {
                    const result = await findYouTubeVideos({ topic: parentNode.content });
                    setYoutubeResults(result.videos);
                    setIsYoutubeDialogOpen(true);
                }
                break;

            case 'IMAGE':
                if (parentNode) {
                    const result = await generateImageForNode({ topic: parentNode.content });
                    if (result.imageUrl) {
                       setNodes(prev => prev.map(n => n.id === parentNode.id ? { ...n, type: 'image', content: result.imageUrl, height: n.width } : n));
                    }
                }
                break;

            case 'EXPAND_TOPIC':
                if (parentNode) {
                    const result = await expandTopic({ topic: parentNode.content });
                    result.subTopics.forEach((subTopic, index) => {
                        const angle = (index / result.subTopics.length) * 2 * Math.PI;
                        const xOffset = Math.cos(angle) * (parentNode.width + 200);
                        const yOffset = Math.sin(angle) * (parentNode.height + 100);
                        addNode(parentNode.id, `${subTopic.title}: ${subTopic.content}`, 'text', { xOffset, yOffset });
                    });
                }
                break;

            case 'SUMMARIZE':
                if (nodes.length > 0) {
                    const result = await summarizeCanvas({
                        nodes: nodes.map(n => ({ id: n.id, content: n.content })),
                        edges: edges.map(e => ({ sourceId: e.source, targetId: e.target })),
                    });
                    setSummary(result.summary);
                    setIsSummaryDialogOpen(true);
                } else {
                    toast({ title: "Canvas is empty.", description: "Add some nodes to generate a summary." });
                }
                break;
            
            case 'SUGGEST':
                if (nodes.length >= 2) {
                    const result = await suggestConnections({
                        nodes: nodes.map(n => ({ id: n.id, content: n.content })),
                        existingEdgeIds: edges.map(e => e.id),
                    });
                    setSuggestedConnections(result.suggestions);
                    setIsConnectionsDialogOpen(true);
                } else {
                     toast({ title: "Not enough nodes.", description: "Add at least two nodes to get suggestions." });
                }
                break;
            
            default: // WHAT, HOW, WHEN, EXPLAIN, EXPAND, CUSTOM
                if (parentNode) {
                    const result = await generateNodeContent({
                        parentNodeContent: parentNode.content,
                        queryType: actionType as any,
                        customQuery: actionType === 'CUSTOM' ? data : undefined,
                        ...settings,
                    });
                    if (result.generatedContent) {
                        addNode(selectedNodeId, result.generatedContent, 'text');
                    }
                }
                break;
        }
      } catch (error) {
        console.error("AI action failed:", error);
        toast({ title: "AI Action Failed", description: "Could not complete the request. Please try again.", variant: "destructive"});
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

  const handlePointerDown = (clientX: number, clientY: number, target: EventTarget) => {
    if (target === canvasRef.current || (target as HTMLElement).classList.contains("canvas-bg")) {
        setIsPanning(true);
        setSelectedNodeId(null);
        if (isMobile) {
          setIsMobileToolboxOpen(false);
        }
        lastPositionRef.current = { x: clientX, y: clientY };
    }
  };

  const handleNodePointerDown = (nodeId: string, clientX: number, clientY: number) => {
    setSelectedNodeId(nodeId);
    draggingNodeRef.current = { nodeId };
    setDraggingNodeId(nodeId);
    lastPositionRef.current = { x: clientX, y: clientY };
    if (isMobile) {
      interactionStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!lastPositionRef.current) return;

    const deltaX = clientX - lastPositionRef.current.x;
    const deltaY = clientY - lastPositionRef.current.y;

    if (isPanning) {
      setCanvasTransform(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
    } else if (draggingNodeRef.current) {
        const { nodeId } = draggingNodeRef.current;
        setNodes(prev => prev.map(n => 
            n.id === nodeId 
            ? { ...n, position: { x: n.position.x + deltaX / canvasTransform.zoom, y: n.position.y + deltaY / canvasTransform.zoom } }
            : n
        ));
    }
    
    lastPositionRef.current = { x: clientX, y: clientY };
  };

  const handlePointerUp = (clientX: number, clientY: number) => {
    if (isMobile && interactionStartRef.current && draggingNodeRef.current) {
      const { x, y, time } = interactionStartRef.current;
      const timeDiff = Date.now() - time;
      const distMoved = Math.sqrt(Math.pow(clientX - x, 2) + Math.pow(clientY - y, 2));

      if (timeDiff < 250 && distMoved < 10) {
        setIsMobileToolboxOpen(true);
      }
    }
    
    setIsPanning(false);
    draggingNodeRef.current = null;
    setDraggingNodeId(null);
    interactionStartRef.current = null;
    lastPositionRef.current = null;
  };

  const onMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY, e.target);
  const onNodeDown = (e: MouseEvent, nodeId: string) => {
    e.stopPropagation();
    handleNodePointerDown(nodeId, e.clientX, e.clientY);
  };
  const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
  const onMouseUp = (e: MouseEvent) => handlePointerUp(e.clientX, e.clientY);
  const onMouseLeave = () => {
    handlePointerUp(0,0);
    setDraggingNodeId(null);
  };

  const getTouchDistance = (t1: Touch, t2: Touch) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target);
    } else if (e.touches.length === 2) {
      e.preventDefault();
      pinchDistanceRef.current = getTouchDistance(e.touches[0], e.touches[1]);
      setIsPanning(false);
      lastPositionRef.current = null;
    }
  };
  
  const onNodeTouchStart = (e: TouchEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      handleNodePointerDown(nodeId, e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      e.preventDefault();
      pinchDistanceRef.current = getTouchDistance(e.touches[0], e.touches[1]);
      draggingNodeRef.current = null;
      interactionStartRef.current = null;
      lastPositionRef.current = null;
    }
  };
  
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      if (draggingNodeRef.current) e.preventDefault();
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2 && pinchDistanceRef.current !== null) {
      e.preventDefault();
      if (!canvasRef.current) return;

      const newDist = getTouchDistance(e.touches[0], e.touches[1]);
      const oldDist = pinchDistanceRef.current;
      const zoomFactor = newDist / oldDist;

      const rect = canvasRef.current.getBoundingClientRect();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

      const newZoom = canvasTransform.zoom * zoomFactor;
      const clampedZoom = Math.max(0.2, Math.min(3, newZoom));

      const worldX = (midX - canvasTransform.x) / canvasTransform.zoom;
      const worldY = (midY - canvasTransform.y) / canvasTransform.zoom;

      const newX = midX - worldX * clampedZoom;
      const newY = midY - worldY * clampedZoom;

      setCanvasTransform({ x: newX, y: newY, zoom: clampedZoom });
      pinchDistanceRef.current = newDist;
    }
  };
  
  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      pinchDistanceRef.current = null;
    }
    if (lastPositionRef.current) {
        handlePointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
  };

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
        onMouseLeave={onMouseLeave}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
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
                    onNodeTouchStart={onNodeTouchStart}
                    isProcessing={isPending && (selectedNodeId === node.id || (actionType === 'SUMMARIZE' || actionType === 'SUGGEST'))}
                    onNodeResize={handleNodeResize}
                    isBeingDragged={draggingNodeId === node.id}
                />
            ))}
        </div>
      </div>

       <Dialog open={isYoutubeDialogOpen} onOpenChange={setIsYoutubeDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Relevant YouTube Videos</DialogTitle>
            <DialogDescription>
              Select a video to add to your canvas.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-6">
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
                <p className="col-span-full text-center text-muted-foreground py-8">No videos found.</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Canvas Summary</DialogTitle>
            <DialogDescription>
              Here is a summary of all the concepts on your canvas.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <p className="text-sm">{summary}</p>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isConnectionsDialogOpen} onOpenChange={setIsConnectionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggested Connections</DialogTitle>
            <DialogDescription>
              The AI has suggested the following connections.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
             {suggestedConnections.length > 0 ? (
                <div className="space-y-4">
                  {suggestedConnections.map((suggestion, index) => {
                    const sourceNode = nodes.find(n => n.id === suggestion.sourceNodeId);
                    const targetNode = nodes.find(n => n.id === suggestion.targetNodeId);
                    return (
                        <Card key={index}>
                            <CardContent className="p-4 flex flex-col gap-2">
                                <p className="text-sm">Connect &quot;{sourceNode?.content.substring(0, 30)}...&quot; to &quot;{targetNode?.content.substring(0, 30)}...&quot;</p>
                                <p className="text-xs text-muted-foreground">Reason: {suggestion.reason}</p>
                                <Button size="sm" onClick={() => addEdge(suggestion.sourceNodeId, suggestion.targetNodeId)} className="mt-2 self-end">Create Connection</Button>
                            </CardContent>
                        </Card>
                    );
                  })}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-8">No new connections were suggested.</p>
            )}
          </ScrollArea>
           <DialogFooter>
                <Button variant="outline" onClick={() => setIsConnectionsDialogOpen(false)}>Close</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
