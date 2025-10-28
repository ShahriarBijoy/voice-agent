import { VoiceChat } from '@/components/VoiceChat';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage voice agent configuration from the builder canvas.
          </p>
        </div>
        <Link
          href="/agents"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Open Agent Builder
        </Link>
      </div>
      <VoiceChat />
    </>
  );
}
