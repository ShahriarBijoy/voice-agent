import { ConversationTest } from "@/components/conversation-test"

export default function TestConversationPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Conversation Component Test</h1>
        <p className="text-muted-foreground">
          Testing auto-scroll behavior according to ElevenLabs UI documentation
        </p>
      </div>
      <ConversationTest />
    </div>
  )
}
