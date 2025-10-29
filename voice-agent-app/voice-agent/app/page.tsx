"use client"

import { VoiceChat } from '@/components/VoiceChat';
import Banner from '@/components/banner';
import { Settings2 } from 'lucide-react';

export default function Home() {
  return (
    <>
      <Banner
        title="Agent Builder"
        description="Manage voice agent configuration from the builder canvas. Customize your agent&apos;s behavior, tools, and personality."
        buttonText="Open Agent Builder"
        buttonHref="/agents"
        icon={Settings2}
        className="mb-4 rounded-xl border border-border/60"
      />
      <VoiceChat />
    </>
  );
}
