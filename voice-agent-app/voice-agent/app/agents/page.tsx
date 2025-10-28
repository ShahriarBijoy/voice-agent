import { Suspense } from "react";
import { AgentBuilder, EmptyAgentState } from "@/components/agent-builder";
import { AgentProfileDraft } from "@/lib/schemas/agent";

function createDefaultDraft(): AgentProfileDraft {
  return {
    id: crypto.randomUUID(),
    name: "Shiny Smiles Scheduler",
    description: "Automates dental appointment booking with insurance verification.",
    welcomeMessage:
      "Thanks for calling the Shiny Smiles appointment scheduling desk. I would love to help you book a visit today.",
    tone: "Warm, energetic, and professional",
    speakingStyle: "Friendly and paced with gentle pauses",
    behavior:
      "Gather patient status, confirm insurance, present nearest available appointment, and send confirmation.",
    tags: ["scheduler", "dental"],
    tools: [
      {
        id: "appointment-scheduler",
        label: "Appointment Scheduler",
        type: "appointment-scheduler",
        enabled: true,
        config: {
          calendarId: "shiny-smiles-primary",
          timezone: "America/New_York",
          bookingWindowDays: 14,
          slotDurationMinutes: 30,
          minimumNoticeMinutes: 120,
          confirmationTemplate:
            "Your appointment at Shiny Smiles is confirmed for {date} at {time}.",
        },
      },
    ],
    graph: {
      nodes: [
        {
          id: "start",
          type: "start",
          position: { x: 0, y: 0 },
          data: {
            title: "Start",
            description: "Answer call with welcome message",
          },
        },
        {
          id: "tone",
          type: "tone",
          position: { x: 0, y: 220 },
          data: {
            tone: "Warm, energetic",
            description: "Maintain cheerful and supportive tone",
          },
        },
        {
          id: "behavior",
          type: "behavior",
          position: { x: 0, y: 420 },
          data: {
            behavior: "Scheduling Workflow",
            description: "Clarify new or returning status and collect details",
          },
        },
        {
          id: "prompt",
          type: "prompt",
          position: { x: 0, y: 620 },
          data: {
            description: "Compose tailored instructions for the LLM",
          },
        },
        {
          id: "tool-appointment",
          type: "tool",
          position: { x: 0, y: 820 },
          data: {
            title: "Appointment Scheduler",
            description: "Check availability and book appointments",
            status: "active",
          },
        },
        {
          id: "summary",
          type: "summary",
          position: { x: 0, y: 1020 },
          data: {
            description: "Confirm booking and close the conversation",
          },
        },
      ],
      edges: [
        { id: "start-tone", source: "start", target: "tone" },
        { id: "tone-behavior", source: "tone", target: "behavior" },
        { id: "behavior-prompt", source: "behavior", target: "prompt" },
        { id: "prompt-tool", source: "prompt", target: "tool-appointment" },
        { id: "tool-summary", source: "tool-appointment", target: "summary" },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<div>Loading agent...</div>}>
      <AgentBuilder profile={createDefaultDraft()} />
    </Suspense>
  );
}


