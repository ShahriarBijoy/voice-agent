"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ui/conversation"
import { Message } from "@/components/ui/message"
import { Orb } from "@/components/ui/orb"
import { Button } from "@/components/ui/button"

const testMessages = [
  { id: "1", role: "user" as const, content: "Hello, can you help me?" },
  { id: "2", role: "assistant" as const, content: "Hi! I'd be happy to help you. What do you need assistance with?" },
  { id: "3", role: "user" as const, content: "I'm having trouble with my order" },
  { id: "4", role: "assistant" as const, content: "I understand your concern about your order. Let me help you with that. Could you please provide your order number so I can look into this for you?" },
  { id: "5", role: "user" as const, content: "My order number is ORDER-12345" },
  { id: "6", role: "assistant" as const, content: "Thank you for providing your order number. Let me check the status of ORDER-12345 for you. I can see that your order was placed recently and is currently being processed in our fulfillment center." },
]

export function ConversationTest() {
  const [messages, setMessages] = useState<typeof testMessages>([])
  const [isLoading, setIsLoading] = useState(false)

  const addMessage = () => {
    if (messages.length < testMessages.length) {
      setIsLoading(true)
      setTimeout(() => {
        setMessages(prev => [...prev, testMessages[prev.length]])
        setIsLoading(false)
      }, 500)
    }
  }

  const resetMessages = () => {
    setMessages([])
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-2">
        <Button onClick={addMessage} disabled={messages.length >= testMessages.length || isLoading}>
          {isLoading ? "Adding..." : "Add Message"}
        </Button>
        <Button onClick={resetMessages} variant="outline">
          Reset
        </Button>
      </div>
      
      <Card className="relative mx-auto h-[500px] p-0">
        <div className="flex h-full flex-col">
          <Conversation className="h-full">
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<Orb className="size-12" />}
                  title="Test Conversation"
                  description="Click 'Add Message' to test auto-scroll behavior"
                />
              ) : (
                <>
                  {messages.map((message) => (
                    <Message
                      key={message.id}
                      source={message.role === "user" ? "user" : "ai"}
                      content={message.content}
                    />
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                      <span className="text-sm">Assistant is typing...</span>
                    </div>
                  )}
                </>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>
      </Card>
    </div>
  )
}
