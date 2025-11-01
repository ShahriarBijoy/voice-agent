"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AgentBuilder, EmptyAgentState } from "@/components/agent-builder";
import { AgentProfileDraft } from "@/lib/schemas/agent";

function createDefaultDraft(): AgentProfileDraft {
  return {
    name: "Calendar Assistant",
    description: "A simple assistant that helps you check your calendar events.",
    welcomeMessage: "Hello! I can help you check your calendar. What would you like to know?",
    tone: "Professional and friendly",
    speakingStyle: "Clear and concise",
    behavior: "Help users check their calendar events and availability.",
    tags: ["calendar", "assistant"],
    tools: [],
    graph: {
      nodes: [
        {
          id: "start",
          type: "start",
          position: { x: 250, y: 50 },
          data: {
            title: "Start",
            description: "Greet the user",
          },
        },
      ],
      edges: [],
    },
  };
}

export default function AgentsPage() {
  const searchParams = useSearchParams();
  const profileId = searchParams.get("id");
  const [profile, setProfile] = useState<AgentProfileDraft | null>(null);
  const [isLoading, setIsLoading] = useState(!!profileId);

  useEffect(() => {
    if (!profileId) {
      // No ID in URL, create new draft
      setProfile(createDefaultDraft());
      setIsLoading(false);
      return;
    }

    // Load existing profile from backend
    const loadProfile = async () => {
      try {
        const res = await fetch(`/api/agents/${profileId}`);
        if (!res.ok) {
          throw new Error("Profile not found");
        }
        const data = await res.json();
        setProfile(data.data);
      } catch (error) {
        console.error("Failed to load profile:", error);
        // Fallback to default draft
        setProfile(createDefaultDraft());
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [profileId]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading agent...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">No profile found</div>
      </div>
    );
  }

  return <AgentBuilder profile={profile} />;
}


