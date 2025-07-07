"use client";

import { useState, useEffect } from 'react';
import type { Settings } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Settings as SettingsIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  settings: Settings;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
}

export function SettingsDialog({ settings, onSettingsChange }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState(settings);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings, isOpen]);

  const handleSave = () => {
    onSettingsChange(currentSettings);
    setIsOpen(false);
  };
  
  const handleSliderChange = (value: number[]) => {
    setCurrentSettings(prev => ({ ...prev, responseLength: value[0] }));
  };

  const handleAutoLengthChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setCurrentSettings(prev => ({ ...prev, autoLength: checked }));
    }
  };

  const handleFormatChange = (value: Settings['responseFormat']) => {
    setCurrentSettings(prev => ({ ...prev, responseFormat: value }));
  };
  
  const handleToneChange = (value: Settings['tone']) => {
    setCurrentSettings(prev => ({...prev, tone: value }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="absolute bottom-4 right-4 z-10 rounded-full h-12 w-12 shadow-lg">
          <SettingsIcon className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>AI Response Settings</SheetTitle>
          <SheetDescription>
            Customize how the AI generates content for your nodes.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-6">
          <div className="grid gap-3">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="response-length">Response Length (words)</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-length"
                  checked={currentSettings.autoLength}
                  onCheckedChange={handleAutoLengthChange}
                />
                <label
                  htmlFor="auto-length"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Auto
                </label>
              </div>
            </div>
            <div className='flex items-center gap-4'>
              <Slider
                id="response-length"
                min={20}
                max={500}
                step={10}
                value={[currentSettings.responseLength]}
                onValueChange={handleSliderChange}
                disabled={currentSettings.autoLength}
              />
              <span className={cn(
                "text-sm font-medium w-12 text-center transition-opacity",
                currentSettings.autoLength && "opacity-50"
              )}>
                {currentSettings.responseLength}
              </span>
            </div>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="response-format">Response Format</Label>
            <Select value={currentSettings.responseFormat} onValueChange={handleFormatChange}>
              <SelectTrigger id="response-format">
                <SelectValue placeholder="Select a format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">Paragraph</SelectItem>
                <SelectItem value="bullet points">Bullet Points</SelectItem>
                <SelectItem value="single word">Single Word</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="tone">Tone</Label>
            <Select value={currentSettings.tone} onValueChange={handleToneChange}>
              <SelectTrigger id="tone">
                <SelectValue placeholder="Select a tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="funny">Funny</SelectItem>
                <SelectItem value="straightforward">Straightforward</SelectItem>
                <SelectItem value="one word">One Word</SelectItem>
                <SelectItem value="expressive">Expressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="custom-instructions">Custom Instructions</Label>
            <Textarea
              id="custom-instructions"
              placeholder="e.g., Explain it like I'm five..."
              value={currentSettings.customInstructions}
              onChange={(e) => setCurrentSettings(prev => ({ ...prev, customInstructions: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>
        </div>
        <SheetFooter>
          <Button onClick={handleSave}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
