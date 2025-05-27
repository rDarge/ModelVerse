"use client";

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { relayUserPrompt, type RelayUserPromptInput } from '@/ai/flows/relay-user-prompt';
import ChatMessage from './ChatMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { SendHorizonal, LoaderCircle } from 'lucide-react'; 

interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
}

const availableModels = [
  { name: 'Gemini 1.5 Flash', id: 'googleai/gemini-1.5-flash-latest' },
  { name: 'OpenAI GPT-3.5 Turbo', id: 'openai/gpt-3.5-turbo' },
  { name: 'Anthropic Claude 3 Haiku', id: 'anthropic/claude-3-haiku-20240307' },
];

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: crypto.randomUUID(), sender: 'system', text: 'Welcome to ModelVerse! Select a model and start chatting.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(availableModels[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({ top: scrollViewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: inputValue.trim(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const input: RelayUserPromptInput = {
        prompt: currentInput.trim(),
        model: selectedModel,
      };
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
            <ChatMessage key={msg.id} sender={msg.sender} text={msg.text} />
          ))}
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-border bg-background"
      >
        <div className="flex items-center gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
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
          <Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon" aria-label="Send message">
            {isLoading ? <LoaderCircle className="animate-spin" /> : <SendHorizonal />}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
