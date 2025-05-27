
"use client";

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import { relayUserPrompt, type RelayUserPromptInput, type ChatTurn } from '@/ai/flows/relay-user-prompt';
import ChatMessage from './ChatMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { SendHorizonal, LoaderCircle, Paperclip, X } from 'lucide-react'; 

interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  imageUrl?: string;
}

const availableModels = [
  { name: 'Gemini 1.5 Flash', id: 'googleai/gemini-1.5-flash-latest' },
  // Update multimodal model when available, e.g. Gemini 1.5 Pro
  // { name: 'Gemini 1.5 Pro (Multimodal)', id: 'googleai/gemini-1.5-pro-latest' }, 
  { name: 'OpenAI GPT-3.5 Turbo', id: 'openai/gpt-3.5-turbo' },
  { name: 'Anthropic Claude 3 Haiku', id: 'anthropic/claude-3-haiku-20240307' },
];

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: crypto.randomUUID(), sender: 'system', text: 'Welcome to ModelVerse! Select a model, type a message, or upload an image to start chatting.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(availableModels[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const { toast } = useToast();
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({ top: scrollViewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit, common for some models
        toast({
          title: 'Image too large',
          description: 'Please select an image smaller than 4MB.',
          variant: 'destructive',
        });
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
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
      fileInputRef.current.value = ""; // Reset the file input
    }
  };

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if ((!inputValue.trim() && !selectedFile) || isLoading) return;

    const currentUserInput = inputValue;
    const currentImagePreview = imagePreview; // This is the data URI for the new image

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: currentUserInput.trim(),
      imageUrl: currentImagePreview || undefined,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    setInputValue('');
    // Keep selectedFile and imagePreview for this send, clear after
    setIsLoading(true);

    try {
      // Prepare history from messages *before* the current one.
      // System messages are excluded from the history sent to the AI.
      const historyForAI: ChatTurn[] = messages
        .filter(msg => msg.sender === 'user' || msg.sender === 'ai')
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          text: msg.text.trim() === "" ? undefined : msg.text.trim(),
          photoDataUri: msg.imageUrl, // imageUrl is already a data URI or undefined
        }))
        .filter(turn => turn.text || turn.photoDataUri); // Filter out entirely empty turns from history


      const input: RelayUserPromptInput = {
        prompt: currentUserInput.trim(), // Current text prompt
        model: selectedModel,
        history: historyForAI, // History up to this point
      };

      if (currentImagePreview) { // Image for the *current* message
        input.photoDataUri = currentImagePreview;
      }
      
      const result = await relayUserPrompt(input);
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: result.response,
        // AI image responses are not handled by this flow currently
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
      // Clear image selection after message is sent
      removeImage(); 
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border">
        <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
          <SelectTrigger className="w-full sm:w-[280px] mx-auto bg-background">
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
      </div>

      <ScrollArea className="flex-grow p-4" viewportRef={scrollViewportRef}>
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
          <Button type="submit" disabled={isLoading || (!inputValue.trim() && !selectedFile)} size="icon" aria-label="Send message">
            {isLoading ? <LoaderCircle className="animate-spin" /> : <SendHorizonal />}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
