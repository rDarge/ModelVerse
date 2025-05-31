
"use client";

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import { relayUserPrompt, type RelayUserPromptInput, type ChatTurn, type ModelConfig as FlowModelConfig } from '@/ai/flows/relay-user-prompt';
import ChatMessage from './ChatMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SendHorizonal, LoaderCircle, Paperclip, X, Trash2, Download, Upload, SlidersHorizontal } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  imageUrl?: string;
}

const availableModels = [
  { name: 'Gemini 1.5 Flash', id: 'googleai/gemini-1.5-flash-latest' },
  { name: 'OpenAI GPT-3.5 Turbo', id: 'openai/gpt-3.5-turbo' },
  { name: 'OpenAI GPT-4o', id: 'openai/gpt-4o' },
  { name: 'Grok 3', id: 'openai/grok-3' },
  { name: 'Grok 2 Vision', id: 'openai/grok-2-vision-latest' },
  // The Anthropic model below will not work until configured in src/ai/genkit.ts
  // similar to how Grok is configured, requiring ANTHROPIC_API_KEY.
  { name: 'Anthropic Claude 3 Haiku', id: 'anthropic/claude-3-haiku-20240307' },
];

const initialSystemMessage = 'Welcome to ModelVerse! Select a model, type a message, or upload an image to start chatting.';
const clearedSystemMessage = 'Chat cleared. Select a model and send a message to start a new conversation.';
const loadedSystemMessage = 'Chat history loaded. Continue the conversation or start a new one.';

// Mirrored from FlowModelConfig for frontend state
interface ModelConfigState {
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: crypto.randomUUID(), sender: 'system', text: initialSystemMessage }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(availableModels[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [modelConfig, setModelConfig] = useState<ModelConfigState>({
    maxOutputTokens: undefined, // Default: 1024, placeholder will suggest model default
    temperature: undefined,   // Default: 0.7
    topP: undefined,
    topK: undefined,
  });
  const [tempModelConfig, setTempModelConfig] = useState<ModelConfigState>(modelConfig);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { toast } = useToast();
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({ top: scrollViewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          title: 'Image too large',
          description: 'Please select an image smaller than 4MB.',
          variant: 'destructive',
        });
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setImagePreview(null);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if ((!inputValue.trim() && !selectedFile) || isLoading) return;

    const currentUserInput = inputValue;
    const currentImagePreview = imagePreview;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: currentUserInput.trim(),
      imageUrl: currentImagePreview || undefined,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    setInputValue('');
    setIsLoading(true);

    try {
      const pastHistoryTurns: ChatTurn[] = messages
        .filter(msg => msg.sender === 'user' || msg.sender === 'ai')
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          text: msg.text.trim() === "" && msg.imageUrl ? undefined : msg.text.trim(),
          photoDataUri: msg.imageUrl,
        }))
        .filter(turn => turn.text || turn.photoDataUri);

      const currentPromptText = currentUserInput.trim();

      // Prepare modelConfig for the flow, filtering out empty strings from inputs
      const flowConfig: FlowModelConfig = {};
      if (modelConfig.maxOutputTokens !== undefined) flowConfig.maxOutputTokens = modelConfig.maxOutputTokens;
      if (modelConfig.temperature !== undefined) flowConfig.temperature = modelConfig.temperature;
      if (modelConfig.topP !== undefined) flowConfig.topP = modelConfig.topP;
      if (modelConfig.topK !== undefined) flowConfig.topK = modelConfig.topK;

      const input: RelayUserPromptInput = {
        prompt: currentPromptText,
        model: selectedModel,
        history: pastHistoryTurns,
        modelConfig: Object.keys(flowConfig).length > 0 ? flowConfig : undefined,
      };

      if (currentImagePreview) {
        input.photoDataUri = currentImagePreview;
      }
      
      const result = await relayUserPrompt(input);
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: result.response,
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Error relaying prompt:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: crypto.randomUUID(), sender: 'system', text: `Error: ${errorMessage}` }
      ]);
      toast({
        title: 'Error',
        description: `Failed to get response from AI: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      removeImage();
    }
  };

  const handleClearChat = () => {
    setMessages([{ id: crypto.randomUUID(), sender: 'system', text: clearedSystemMessage }]);
    setInputValue('');
    removeImage();
    toast({
      title: 'Chat Cleared',
      description: 'The conversation history has been cleared.',
    });
  };

  const handleDownloadChat = () => {
    if (messages.length === 0 || (messages.length === 1 && messages[0].sender === 'system' && (messages[0].text === initialSystemMessage || messages[0].text === clearedSystemMessage ))){
      toast({
        title: 'Empty Chat',
        description: 'There is no conversation to download.',
        variant: 'destructive'
      });
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "modelverse-chat-history.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast({
      title: 'Download Started',
      description: 'Your chat history is being downloaded as modelverse-chat-history.json.',
    });
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a valid JSON file.',
        variant: 'destructive',
      });
      if (uploadFileInputRef.current) uploadFileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('File content is not readable text.');
        }
        const loadedMessages: Message[] = JSON.parse(text);

        if (!Array.isArray(loadedMessages) || !loadedMessages.every(msg => 
          typeof msg === 'object' && msg !== null &&
          'id' in msg && typeof msg.id === 'string' &&
          'sender' in msg && (msg.sender === 'user' || msg.sender === 'ai' || msg.sender === 'system') &&
          'text' in msg && typeof msg.text === 'string' &&
          (msg.imageUrl === undefined || msg.imageUrl === null || typeof msg.imageUrl === 'string')
        )) {
          throw new Error('Invalid JSON structure for chat messages.');
        }
        
        if (loadedMessages.length > 0 && !(loadedMessages.length === 1 && loadedMessages[0].sender === 'system')) {
             setMessages([...loadedMessages, {id: crypto.randomUUID(), sender: 'system', text: loadedSystemMessage}]);
        } else {
            setMessages([{id: crypto.randomUUID(), sender: 'system', text: clearedSystemMessage }]);
        }
        toast({
          title: 'Chat Loaded',
          description: 'Chat history has been loaded from the file.',
        });
      } catch (error) {
        console.error("Error loading chat from file:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error parsing file.';
        toast({
          title: 'Error Loading File',
          description: `Could not load chat history: ${errorMessage}`,
          variant: 'destructive',
        });
      } finally {
        if (uploadFileInputRef.current) uploadFileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast({
        title: 'File Read Error',
        description: 'Could not read the selected file.',
        variant: 'destructive',
      });
      if (uploadFileInputRef.current) uploadFileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleConfigChange = (key: keyof ModelConfigState, value: string) => {
    const numValue = parseFloat(value);
    setTempModelConfig(prev => ({
      ...prev,
      [key]: isNaN(numValue) ? undefined : numValue,
    }));
  };

  const handleSaveConfig = () => {
    setModelConfig(tempModelConfig);
    setIsSettingsModalOpen(false);
    toast({
      title: 'Settings Saved',
      description: 'Model configuration has been updated.',
    });
  };

  const openSettingsModal = () => {
    setTempModelConfig(modelConfig); // Initialize modal with current saved settings
    setIsSettingsModalOpen(true);
  };

  return (
    <div className="flex flex-col flex-1 bg-card min-h-0">
      <div className="p-4 border-b border-border flex items-center justify-center sm:justify-between gap-2 flex-wrap">
        <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[200px] sm:max-w-[280px] bg-background">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
           <Button
            variant="outline"
            size="icon"
            onClick={openSettingsModal}
            disabled={isLoading}
            aria-label="Model settings"
            className="shrink-0"
            title="Model Settings"
          >
            <SlidersHorizontal />
          </Button>
          <input
            type="file"
            ref={uploadFileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
            aria-label="Upload chat history"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => uploadFileInputRef.current?.click()}
            disabled={isLoading}
            aria-label="Upload chat history"
            className="shrink-0"
            title="Upload Chat"
          >
            <Upload />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDownloadChat}
            disabled={isLoading}
            aria-label="Download chat history"
            className="shrink-0"
            title="Download Chat"
          >
            <Download />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleClearChat}
            disabled={isLoading}
            aria-label="Clear chat history"
            className="shrink-0"
            title="Clear Chat"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Model Configuration</DialogTitle>
            <DialogDescription>
              Adjust parameters for the selected model. Leave blank to use model defaults.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxOutputTokens" className="text-right col-span-1">
                Max Tokens
              </Label>
              <Input
                id="maxOutputTokens"
                type="number"
                placeholder="Model default"
                value={tempModelConfig.maxOutputTokens ?? ''}
                onChange={(e) => handleConfigChange('maxOutputTokens', e.target.value)}
                className="col-span-3"
                step="1"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="temperature" className="text-right col-span-1">
                Temperature
              </Label>
              <Input
                id="temperature"
                type="number"
                placeholder="Model default (e.g., 0.7)"
                value={tempModelConfig.temperature ?? ''}
                onChange={(e) => handleConfigChange('temperature', e.target.value)}
                className="col-span-3"
                step="0.1"
                min="0"
                max="2"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="topP" className="text-right col-span-1">
                Top P
              </Label>
              <Input
                id="topP"
                type="number"
                placeholder="Model default (e.g., 0.9)"
                value={tempModelConfig.topP ?? ''}
                onChange={(e) => handleConfigChange('topP', e.target.value)}
                className="col-span-3"
                step="0.05"
                min="0"
                max="1"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="topK" className="text-right col-span-1">
                Top K
              </Label>
              <Input
                id="topK"
                type="number"
                placeholder="Model default"
                value={tempModelConfig.topK ?? ''}
                onChange={(e) => handleConfigChange('topK', e.target.value)}
                className="col-span-3"
                step="1"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => setTempModelConfig(modelConfig)}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveConfig}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <ScrollArea className="flex-1 min-h-0 px-4 pt-4 pb-6" viewportRef={scrollViewportRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} sender={msg.sender} text={msg.text} imageUrl={msg.imageUrl} />
          ))}
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-border bg-background"
      >
        {imagePreview && (
          <div className="mb-2 p-2 border border-border rounded-md relative w-fit bg-muted">
            <Image src={imagePreview} alt="Selected preview" width={80} height={80} className="rounded object-cover aspect-square" data-ai-hint="image preview"/>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/80"
              onClick={removeImage}
              aria-label="Remove image"
            >
              <X size={16} />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            aria-label="Upload image"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label="Attach image"
            title="Attach image"
          >
            <Paperclip />
          </Button>
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={imagePreview ? "Add a caption... (optional)" : "Type your message..."}
            className="flex-grow resize-none bg-input text-foreground placeholder:text-muted-foreground"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
            aria-label="Chat message input"
          />
          <Button type="submit" disabled={isLoading || (!inputValue.trim() && !selectedFile)} size="icon" aria-label="Send message" title="Send message">
            {isLoading ? <LoaderCircle className="animate-spin" /> : <SendHorizonal />}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
