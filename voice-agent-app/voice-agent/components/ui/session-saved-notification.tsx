"use client"

import { useEffect } from "react"
import { CheckCircle, ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

interface SessionSavedNotificationProps {
  conversationId?: string
  onViewHistory?: () => void
}

export function SessionSavedNotification({ 
  conversationId, 
  onViewHistory 
}: SessionSavedNotificationProps) {
  const { toast } = useToast()

  useEffect(() => {
    if (conversationId) {
      toast({
        variant: "success",
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Session Saved
          </div>
        ),
        description: "Your conversation has been saved successfully.",
        action: onViewHistory ? (
          <ToastAction
            altText="View conversation history"
            onClick={onViewHistory}
            className="flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View History
          </ToastAction>
        ) : undefined,
        duration: 5000,
      })
    }
  }, [conversationId, toast, onViewHistory])

  return null
}
