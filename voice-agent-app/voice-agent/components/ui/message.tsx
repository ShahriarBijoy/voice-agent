"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

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
  /**
   * Optional timing information for AI responses
   */
  timing?: {
    llm_time: number
    tts_time: number
    total_time: number
  }
}

export const Message: React.FC<MessageProps> = ({
  content,
  source,
  className,
  isStreaming = false,
  timing,
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
      <div className={cn("max-w-[80%] flex flex-col gap-1", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-lg px-4 py-2",
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
        {timing && !isUser && (
          <div className="flex items-center gap-1.5 px-1 self-end">
            <Badge variant="ghost" className="text-[10px] h-5 px-1.5">
              LLM: {timing.llm_time}s
            </Badge>
            <Badge variant="ghost" className="text-[10px] h-5 px-1.5">
              TTS: {timing.tts_time}s
            </Badge>
            <Badge variant="ghost" className="text-[10px] h-5 px-1.5">
              Total: {timing.total_time}s
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}
