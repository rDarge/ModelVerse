
"use client";

import React, { type FC } from 'react'; // Import React
import { Bot, User, Copy, Pencil } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ChatMessageProps {
  sender: 'user' | 'ai' | 'system';
  text: string;
  avatarUrl?: string;
  imageUrl?: string;
  messageId?: string;
  onEditMessage?: (messageId: string) => void;
}

const ChatMessage: FC<ChatMessageProps> = ({ sender, text, avatarUrl, imageUrl, messageId, onEditMessage }) => {
  const isUser = sender === 'user';
  const isSystem = sender === 'system';
  const { toast } = useToast();

  const messageAlignment = isUser ? 'justify-end' : 'justify-start';
  
  const messageBubbleBaseClasses = 'max-w-[70%] p-3 rounded-lg shadow-md break-words';
  const userBubbleClasses = 'bg-primary text-primary-foreground';
  const aiBubbleClasses = 'bg-card text-card-foreground relative group'; // AI bubble remains relative group for its own copy button
  
  const systemMessageClasses = 'bg-muted text-muted-foreground text-sm italic text-center w-full max-w-full py-2';

  const handleCopy = async () => {
    if (!text || text.trim() === "") return;
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard.",
        duration: 3000,
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Error",
        description: "Failed to copy message.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleEdit = () => {
    if (messageId && onEditMessage && isUser) { // Ensure edit is only for user
      onEditMessage(messageId);
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className={systemMessageClasses}>
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-start gap-2 my-3', messageAlignment)}>
      {!isUser && (
        <Avatar className="h-8 w-8 self-start shrink-0">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="AI Avatar" data-ai-hint="robot face" /> : null}
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <Bot size={20} />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
        <div 
          className={cn(
            messageBubbleBaseClasses, 
            isUser ? userBubbleClasses : aiBubbleClasses
          )}
        >
          {/* AI's copy button - kept as originally placed */}
          {!isUser && text && text.trim() !== "" && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1.5 right-1.5 h-6 w-6 p-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10 text-inherit hover:bg-white/20 dark:hover:bg-black/20"
              onClick={handleCopy}
              aria-label="Copy message text"
              title="Copy text"
            >
              <Copy size={14} />
            </Button>
          )}
        
          {text && text.split('\n').map((line, index, arr) => (
            <span key={index}>
              {line}
              {index < arr.length - 1 && <br />}
            </span>
          ))}
          {imageUrl && (
            <div className={`relative mt-2 w-full max-w-xs h-auto aspect-[4/3] rounded-md overflow-hidden ${!text || text.trim() === '' ? 'mt-0' : ''}`}>
              <Image
                src={imageUrl}
                alt={sender === 'user' ? "User upload" : "AI generated image"}
                layout="fill"
                objectFit="contain"
                className="rounded-md"
                data-ai-hint={sender === 'user' ? "user upload" : "generated image"}
              />
            </div>
          )}
        </div>

        {/* Buttons for USER messages, placed BELOW the bubble */}
        {isUser && (
          <div className="flex items-center mt-1.5 space-x-1">
            {text && text.trim() !== "" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 p-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
                aria-label="Copy message text"
                title="Copy text"
              >
                <Copy size={16} />
              </Button>
            )}
            {onEditMessage && messageId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 p-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleEdit}
                aria-label="Edit message"
                title="Edit message"
              >
                <Pencil size={16} />
              </Button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 self-start shrink-0">
           {avatarUrl ? <AvatarImage src={avatarUrl} alt="User Avatar" data-ai-hint="person silhouette" /> : null}
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User size={20} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default React.memo(ChatMessage);
