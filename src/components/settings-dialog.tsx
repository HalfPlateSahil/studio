"use client";

import { useState, useEffect, useRef } from 'react';
import type { ActionType, Settings } from '@/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Download, FileImage, FileJson, Upload } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface SettingsDialogProps {
  settings: Settings;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  trigger: React.ReactNode;
  onAction: (actionType: ActionType, data?: any) => void;
  isPending: boolean;
}

export function SettingsDialog({
  settings,
  onSettingsChange,
  isOpen,
  setIsOpen,
  trigger,
  onAction,
  isPending,
}: SettingsDialogProps) {
  const [currentSettings, setCurrentSettings] = useState(settings);
  const importInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onAction('IMPORT_JSON', file);
    }
    // Reset file input to allow importing the same file again
    if (importInputRef.current) {
        importInputRef.current.value = '';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Customize your Concept Canvas experience.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto pr-4 -mr-6">
          <div className="grid gap-6 py-6">
            <div>
              <h3 className="text-lg font-medium mb-3">AI Response</h3>
              <div className="space-y-6 pl-2 border-l">
                  <div className="grid gap-3 pl-4">
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
                    <div className="grid gap-3 pl-4">
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
                    <div className="grid gap-3 pl-4">
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
                    <div className="grid gap-3 pl-4">
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
            </div>

            <Separator/>
            
            <div>
              <h3 className="text-lg font-medium mb-3">Data Management</h3>
              <div className="space-y-2 pl-2 border-l">
                <div className="pl-4">
                   <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" disabled={isPending} className="w-full justify-start">
                          <Download className="mr-2 h-5 w-5" />
                          Export Canvas
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2">
                        <div className="grid gap-2">
                          <Button variant="ghost" onClick={() => onAction('EXPORT_PNG')} className="justify-start">
                            <FileImage className="mr-2 h-4 w-4" /> PNG Image
                          </Button>
                          <Button variant="ghost" onClick={() => onAction('EXPORT_JSON')} className="justify-start">
                            <FileJson className="mr-2 h-4 w-4" /> JSON Data
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                </div>
                 <div className="pl-4">
                   <Button variant="outline" onClick={() => importInputRef.current?.click()} disabled={isPending} className="w-full justify-start">
                    <Upload className="mr-2 h-5 w-5" />
                    Import from JSON
                  </Button>
                  <input type="file" ref={importInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <SheetFooter className="pt-4 border-t">
          <Button onClick={handleSave}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
