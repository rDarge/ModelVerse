
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
  messageId?: string; // Added for potential edit functionality
  onEditMessage?: (messageId: string) => void; // Added for edit functionality
}

const ChatMessage: FC<ChatMessageProps> = ({ sender, text, avatarUrl, imageUrl, messageId, onEditMessage }) => {
  const isUser = sender === 'user';
  const isSystem = sender === 'system';
  const { toast } = useToast();

  const messageAlignment = isUser ? 'justify-end' : 'justify-start';
  const messageBubbleClasses = cn(
    'max-w-[70%] p-3 rounded-lg shadow-md break-words',
    isUser ? 'bg-primary text-primary-foreground ml-auto' : 'bg-card text-card-foreground mr-auto',
    isSystem ? 'bg-muted text-muted-foreground text-sm italic text-center w-full max-w-full py-2' : 'relative group'
  );

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
    if (messageId && onEditMessage) {
      onEditMessage(messageId);
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className={messageBubbleClasses}>
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
      <div className={messageBubbleClasses}>
        {!isSystem && text && text.trim() !== "" && (
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
        {isUser && onEditMessage && messageId && (
           <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-1.5 h-6 w-6 p-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10 text-inherit hover:bg-white/20 dark:hover:bg-black/20",
              text && text.trim() !== "" ? "right-8" : "right-1.5" // Adjust position if copy button is also present
            )}
            onClick={handleEdit}
            aria-label="Edit message"
            title="Edit message"
          >
            <Pencil size={14} />
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
