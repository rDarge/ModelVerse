
"use client";

import React, { type FC } from 'react'; // Import React
import { Bot, User } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChatMessageProps {
  sender: 'user' | 'ai' | 'system';
  text: string;
  avatarUrl?: string;
  imageUrl?: string;
}

const ChatMessage: FC<ChatMessageProps> = ({ sender, text, avatarUrl, imageUrl }) => {
  const isUser = sender === 'user';
  const isSystem = sender === 'system';

  const messageAlignment = isUser ? 'justify-end' : 'justify-start';
  const messageBubbleStyle = cn(
    'max-w-[70%] p-3 rounded-lg shadow-md break-words',
    isUser ? 'bg-primary text-primary-foreground ml-auto' : 'bg-card text-card-foreground mr-auto',
    isSystem ? 'bg-muted text-muted-foreground text-sm italic text-center w-full max-w-full py-2' : ''
  );

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className={messageBubbleStyle}>
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-end gap-2 my-3', messageAlignment)}>
      {!isUser && (
        <Avatar className="h-8 w-8 self-start">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="AI Avatar" data-ai-hint="robot face" /> : null}
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <Bot size={20} />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={messageBubbleStyle}>
        {text && text.split('\n').map((line, index, arr) => (
          <span key={index}>
            {line}
            {index < arr.length - 1 && <br />}
          </span>
        ))}
        {imageUrl && (
          <div className={`relative mt-2 w-full max-w-xs h-auto aspect-[4/3] rounded-md overflow-hidden ${!text ? 'mt-0' : ''}`}>
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
        <Avatar className="h-8 w-8 self-start">
           {avatarUrl ? <AvatarImage src={avatarUrl} alt="User Avatar" data-ai-hint="person silhouette" /> : null}
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User size={20} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

// Wrap ChatMessage with React.memo
export default React.memo(ChatMessage);
