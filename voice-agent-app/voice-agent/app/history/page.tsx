"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, MessageSquare, Calendar, Clock, Mic, Play, MoreHorizontal, Volume2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Message } from "@/components/ui/message"
import { DeleteConversationDialog } from "@/components/ui/delete-conversation-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface ConversationSummary {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

interface ConversationMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

interface ConversationDetail {
  id: string
  title: string
  created_at: string
  updated_at: string
  messages: ConversationMessage[]
}

export default function HistoryPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null)
  const [viewingConversation, setViewingConversation] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<ConversationSummary | null>(null)

  useEffect(() => {
    // Fetch conversations from backend API
    const fetchConversations = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/conversations')
        if (response.ok) {
          const data = await response.json()
          setConversations(data)
        } else {
          console.error('Failed to fetch conversations')
        }
      } catch (error) {
        console.error('Error fetching conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [])

  const fetchConversationDetail = async (conversationId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedConversation(data)
        setViewingConversation(true)
      } else {
        console.error('Failed to fetch conversation detail')
      }
    } catch (error) {
      console.error('Error fetching conversation detail:', error)
    }
  }

  const handleDeleteClick = (conversation: ConversationSummary) => {
    setConversationToDelete(conversation)
    setDeleteDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open)
    if (!open) {
      // Reset state when dialog is closed
      setConversationToDelete(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return

    try {
      const response = await fetch(`http://localhost:8000/api/conversations/${conversationToDelete.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Remove from local state
        setConversations(prev => prev.filter(conv => conv.id !== conversationToDelete.id))
        
        // If viewing the deleted conversation, go back to list view
        if (selectedConversation && selectedConversation.id === conversationToDelete.id) {
          setViewingConversation(false)
          setSelectedConversation(null)
        }
        
        // Close dialog and reset state
        setDeleteDialogOpen(false)
        setConversationToDelete(null)
      } else {
        console.error('Failed to delete conversation')
        alert('Failed to delete conversation. Please try again.')
        setDeleteDialogOpen(false)
        setConversationToDelete(null)
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Error deleting conversation. Please try again.')
      setDeleteDialogOpen(false)
      setConversationToDelete(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return formatDate(dateString)
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 pb-4">
        {/* Fixed Header */}
        <Card className="p-6 mb-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => {
                  if (viewingConversation) {
                    setViewingConversation(false)
                    setSelectedConversation(null)
                  } else {
                    // Navigate to home page
                    window.location.href = '/'
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {viewingConversation && selectedConversation 
                    ? selectedConversation.title 
                    : "Conversation History"
                  }
                </h1>
                <p className="text-muted-foreground text-sm">
                  {viewingConversation && selectedConversation 
                    ? formatDate(selectedConversation.created_at)
                    : "View and manage your saved conversations"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                {conversations.length} conversations
              </Badge>
            </div>
          </div>
        </Card>

        {/* Content Area */}
        <Card className="h-[calc(100vh-16rem)]">
          <ScrollArea className="h-full">
            <div className="p-6">
              {/* Content */}
              {viewingConversation && selectedConversation ? (
                // Conversation Detail View
                <div className="space-y-4">
                  <div className="space-y-4">
                    {selectedConversation.messages.map((message, index) => (
                      <Message
                        key={index}
                        content={message.content}
                        source={message.role === "user" ? "user" : "ai"}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                // Conversation List View
                <>
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                          <CardHeader className="space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <Skeleton className="h-3 w-1/4" />
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-1/3" />
                              <Skeleton className="h-8 w-20" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="mb-6">
                        <div className="bg-muted p-6 rounded-full shadow-lg">
                          <Volume2 className="h-12 w-12 text-muted-foreground" />
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-md">
                        Start a voice conversation to see your history here. Your conversations will be automatically saved and appear in this list.
                      </p>
                      <Link href="/">
                        <Button size="lg" className="gap-2">
                          <Mic className="h-4 w-4" />
                          Start New Conversation
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversations.map((conversation) => (
                        <Card key={conversation.id} className="group hover:shadow-lg transition-all duration-200 hover:border-primary/20 mb-4">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1 min-w-0">
                                <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                                  {conversation.title || "Untitled Conversation"}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-4 text-sm">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(conversation.created_at)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatRelativeTime(conversation.updated_at)}
                                  </span>
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Badge variant="secondary" className="gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {conversation.message_count}
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 w-8 p-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleDeleteClick(conversation)
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Conversation
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">
                                Last updated {formatRelativeTime(conversation.updated_at)}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Play className="h-3 w-3" />
                                  Resume
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => fetchConversationDetail(conversation.id)}
                                >
                                  View
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConversationDialog
        open={deleteDialogOpen}
        onOpenChange={handleDialogOpenChange}
        onConfirm={handleConfirmDelete}
        conversationTitle={conversationToDelete?.title}
      />
    </div>
  )
}