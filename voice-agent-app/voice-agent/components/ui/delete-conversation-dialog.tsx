"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"

interface DeleteConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  conversationTitle?: string
}

export function DeleteConversationDialog({
  open,
  onOpenChange,
  onConfirm,
  conversationTitle = "this conversation"
}: DeleteConversationDialogProps) {
  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onConfirm()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Conversation
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>&ldquo;{conversationTitle}&rdquo;</strong>? 
            This action cannot be undone and will permanently remove the conversation 
            and all its messages.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Conversation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
