"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/avatar"

export interface MessageProps {
  /**
   * The message content
   */
  content: string
  /**
   * The source of the message (user or ai)
   */
  source: "user" | "ai"
  /**
   * Optional avatar fallback text
   */
  avatar?: string
  /**
   * Optional className for customization
   */
  className?: string
  /**
   * Whether the message is being streamed
   */
  isStreaming?: boolean
}

export const Message: React.FC<MessageProps> = ({
  content,
  source,
  avatar,
  className,
  isStreaming = false,
}) => {
  const isUser = source === "user"
  const avatarText = avatar || (isUser ? "You" : "AI")

  return (
    <div
      className={cn(
        "flex w-full gap-3 px-4 py-3",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      {!isUser && (
        <Avatar 
          className="h-8 w-8 shrink-0"
          initials={avatarText}
          size="sm"
        />
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {content}
          {isStreaming && (
            <span className="inline-block ml-1 animate-pulse">▋</span>
          )}
        </p>
      </div>

    </div>
  )
}
