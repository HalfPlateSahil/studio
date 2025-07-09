"use client";

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Trash2,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ActionType, Settings } from '@/types';
import { SettingsDialog } from './settings-dialog';

interface ToolboxProps {
  isNodeSelected: boolean;
  onAction: (actionType: ActionType, data?: string) => void;
  settings: Settings;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
  isMobileToolboxOpen: boolean;
  onMobileToolboxOpenChange: (open: boolean) => void;
}

const actionButtons = [
  { type: 'WHAT', label: 'What', icon: HelpCircle },
  { type: 'HOW', label: 'How', icon: Wrench },
  { type: 'WHEN', label: 'When', icon: Calendar },
  { type: 'EXPLAIN', label: 'Explain', icon: BookText },
  { type: 'EXPAND', label: 'Expand', icon: Expand },
  { type: 'DELETE', label: 'Delete', icon: Trash2 },
];

export function Toolbox({
  isNodeSelected,
  onAction,
  settings,
  onSettingsChange,
  isMobileToolboxOpen,
  onMobileToolboxOpenChange,
}: ToolboxProps) {
  const [isPending, setIsPending] = useState(false);
  const [activeInput, setActiveInput] = useState<'custom' | 'youtube' | null>(null);
  const [inputValue, setInputValue] = useState('');
  const { toast } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleAction = async (action: ActionType, data?: string) => {
    if ((!isNodeSelected && action !== 'DELETE' && action !== 'YOUTUBE') || (action === 'DELETE' && !isNodeSelected)) {
      toast({ 
        title: action === 'DELETE' ? "Please select a node to delete." : "Please select a node first.", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsPending(true);
    try {
      await onAction(action, data);
    } finally {
      setIsPending(false);
    }

    if (action !== 'YOUTUBE') {
      if (activeInput) {
        setInputValue('');
        setActiveInput(null);
      }
      onMobileToolboxOpenChange(false);
    }
  };

  const handleActionClick = (actionType: ActionType) => {
    handleAction(actionType);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    if (activeInput) {
      const actionType = activeInput === 'custom' ? 'CUSTOM' : 'YOUTUBE';
      handleAction(actionType, inputValue);
    }
  };

  const toggleInput = (inputType: 'custom' | 'youtube') => {
    setActiveInput(prev => prev === inputType ? null : inputType);
    setInputValue('');
  };

  const ToolboxContent = (
    <div className="relative">
      <div className="grid grid-cols-3 gap-2 mb-4">
        {actionButtons.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            variant={type === 'DELETE' ? 'destructive' : 'outline'}
            onClick={() => handleActionClick(type as ActionType)}
            disabled={isPending || (!isNodeSelected && type !== 'DELETE')}
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
          variant='outline'
          onClick={() => handleAction('YOUTUBE')}
          disabled={isPending || !isNodeSelected}
          className="w-full justify-start"
        >
          <Youtube className="mr-2 h-5 w-5" />
          Search YouTube
        </Button>
      </div>
      {isPending && <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>}
    </div>
  );

  return (
    <>
      {/* Desktop Toolbox: A card positioned absolutely */}
      <div className="hidden md:block">
        <Card className="absolute top-4 right-4 z-10 w-80 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            {ToolboxContent}
          </CardContent>
        </Card>
        <SettingsDialog
            isOpen={isSettingsOpen}
            setIsOpen={setIsSettingsOpen}
            settings={settings}
            onSettingsChange={onSettingsChange}
            trigger={
                <Button variant="outline" size="icon" className="absolute bottom-4 right-4 z-10 rounded-full h-12 w-12 shadow-lg">
                    <SettingsIcon className="h-6 w-6" />
                </Button>
            }
        />
      </div>

      {/* Mobile Toolbox: A sheet triggered by node selection */}
      <div className="md:hidden">
        <Sheet open={isMobileToolboxOpen} onOpenChange={onMobileToolboxOpenChange}>
          <SheetContent side="bottom" className="h-[80dvh] flex flex-col p-0">
            <SheetHeader className="p-4 pb-2 flex-row justify-between items-center border-b">
              <SheetTitle>Toolbox</SheetTitle>
              <SettingsDialog
                isOpen={isSettingsOpen}
                setIsOpen={setIsSettingsOpen}
                settings={settings}
                onSettingsChange={onSettingsChange}
                trigger={
                    <Button variant="ghost" size="icon">
                        <SettingsIcon className="h-6 w-6" />
                    </Button>
                }
              />
            </SheetHeader>
            <ScrollArea className="flex-grow">
              <div className="p-4">
                {ToolboxContent}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
