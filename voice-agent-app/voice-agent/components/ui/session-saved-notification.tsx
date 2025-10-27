"use client"

import { useEffect } from "react"

import { toast } from "@/components/ui/sonner"

interface SessionSavedNotificationProps {
  conversationId?: string
  onViewHistory?: () => void
}

export interface SessionSavedToastPayload {
  conversationId?: string
  onViewHistory?: () => void
}

export function showSessionSavedToast({
  conversationId,
  onViewHistory,
}: SessionSavedToastPayload) {
  toast.success("Conversation saved", {
    description: "You can access it from the conversations page.",
    action: onViewHistory
      ? {
          label: "Open conversations",
          onClick: onViewHistory,
        }
      : undefined,
    id: conversationId ? `session-saved-${conversationId}` : undefined,
  })
}

export function SessionSavedNotification({
  conversationId,
  onViewHistory,
}: SessionSavedNotificationProps) {
  useEffect(() => {
    if (!conversationId) return

    showSessionSavedToast({ conversationId, onViewHistory })
  }, [conversationId, onViewHistory])

  return null
}
