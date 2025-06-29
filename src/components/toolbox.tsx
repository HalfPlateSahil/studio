"use client";

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BookText,
  Expand,
  HelpCircle,
  Loader2,
  PenSquare,
  Wrench,
  Calendar,
  Youtube,
  Plus,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ActionType = 'WHAT' | 'HOW' | 'WHEN' | 'EXPLAIN' | 'EXPAND' | 'CUSTOM' | 'YOUTUBE';

interface ToolboxProps {
  isNodeSelected: boolean;
  onAction: (actionType: ActionType, data?: string) => Promise<void>;
}

const actionButtons = [
  { type: 'WHAT', label: 'What', icon: HelpCircle },
  { type: 'HOW', label: 'How', icon: Wrench },
  { type: 'WHEN', label: 'When', icon: Calendar },
  { type: 'EXPLAIN', label: 'Explain', icon: BookText },
  { type: 'EXPAND', label: 'Expand', icon: Expand },
];

export function Toolbox({ isNodeSelected, onAction }: ToolboxProps) {
  const [isPending, startTransition] = useTransition();
  const [activeInput, setActiveInput] = useState<'custom' | 'youtube' | null>(null);
  const [inputValue, setInputValue] = useState('');
  const { toast } = useToast();

  const handleActionClick = (actionType: ActionType) => {
    if (!isNodeSelected) {
      toast({ title: "Please select a node first.", variant: "destructive" });
      return;
    }
    startTransition(() => {
      onAction(actionType, undefined);
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    if (!isNodeSelected) {
      toast({ title: "Please select a node first.", variant: "destructive" });
      return;
    }
    
    if (activeInput) {
      startTransition(async () => {
        await onAction(activeInput.toUpperCase() as ActionType, inputValue);
        setInputValue('');
        setActiveInput(null);
      });
    }
  };

  const toggleInput = (inputType: 'custom' | 'youtube') => {
    if (activeInput === inputType) {
      setActiveInput(null);
    } else {
      setActiveInput(inputType);
      setInputValue('');
    }
  }

  return (
    <Card className="absolute top-4 right-4 z-10 w-80 shadow-lg bg-card/80 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {actionButtons.map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              variant="outline"
              onClick={() => handleActionClick(type as ActionType)}
              disabled={isPending || !isNodeSelected}
              className="flex flex-col h-20"
            >
              <Icon className="w-6 h-6 mb-1" />
              <span>{label}</span>
            </Button>
          ))}
        </div>

        <div className="space-y-2">
            <Button 
              variant={activeInput === 'custom' ? 'default' : 'outline'}
              onClick={() => toggleInput('custom')}
              disabled={isPending || !isNodeSelected}
              className="w-full justify-start"
            >
              <PenSquare className="mr-2 h-5 w-5" />
              Enter Yours
            </Button>
            
            {activeInput === 'custom' && (
              <form onSubmit={handleFormSubmit} className="space-y-2 p-2 border rounded-md">
                 <Label htmlFor="custom-query">Your custom question</Label>
                 <Input
                    id="custom-query"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g., How does it relate to aging?"
                    disabled={isPending}
                 />
                 <Button type="submit" disabled={isPending || !inputValue.trim()} className="w-full">
                    {isPending ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Add Node</>}
                 </Button>
              </form>
            )}

            <Button
              variant={activeInput === 'youtube' ? 'default' : 'outline'}
              onClick={() => toggleInput('youtube')}
              disabled={isPending || !isNodeSelected}
              className="w-full justify-start"
            >
              <Youtube className="mr-2 h-5 w-5" />
              Add YouTube Video
            </Button>

            {activeInput === 'youtube' && (
              <form onSubmit={handleFormSubmit} className="space-y-2 p-2 border rounded-md">
                 <Label htmlFor="youtube-url">YouTube Video URL</Label>
                 <Input
                    id="youtube-url"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={isPending}
                 />
                 <Button type="submit" disabled={isPending || !inputValue.trim()} className="w-full">
                    {isPending ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Add Video Node</>}
                 </Button>
              </form>
            )}
        </div>
        {isPending && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>}
      </CardContent>
    </Card>
  );
}
