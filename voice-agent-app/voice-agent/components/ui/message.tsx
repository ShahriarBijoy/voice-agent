"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

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
  className,
  isStreaming = false,
}) => {
  const isUser = source === "user"

  return (
    <div
      className={cn(
        "flex w-full gap-3 px-4 py-3",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        <p
          className="text-sm leading-relaxed whitespace-pre-wrap"
          role="presentation"
        >
          {content}
          {isStreaming && (
            <span className="inline-block ml-1 animate-pulse">▋</span>
          )}
        </p>
      </div>

    </div>
  )
}
