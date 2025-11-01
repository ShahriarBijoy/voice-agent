"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AgentBuilderCanvas } from "@/components/agent-builder/canvas";
import { AgentSidePanel } from "@/components/agent-builder/side-panel";
import { AgentProfileForm } from "@/components/agent-builder/profile-form";
import {
  AgentProfileDraft,
} from "@/lib/schemas/agent";
import {
  createAgentProfile,
  updateAgentProfile,
} from "@/lib/agent-profiles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AgentBuilderProps {
  profile: AgentProfileDraft;
}

export function AgentBuilder({ profile }: AgentBuilderProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<AgentProfileDraft>(profile);
  const [draftKey, setDraftKey] = useState(() => profile.id ?? crypto.randomUUID());
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [showPreviewWarning, setShowPreviewWarning] = useState(false);
  const [showNewAgentDialog, setShowNewAgentDialog] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Update draft when profile prop changes (e.g., when selecting different agent)
  useEffect(() => {
    setDraft(profile);
    setDraftKey(profile.id ?? crypto.randomUUID());
    setSelectedNodeId(null); // Clear selection when profile changes
  }, [profile]);

  const hasChanges = useMemo(() => {
    // Simple comparison without zod parsing to avoid schema loading issues
    const draftJson = JSON.stringify(draft);
    const profileJson = JSON.stringify(profile);
    return draftJson !== profileJson;
  }, [draft, profile]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const payload: AgentProfileDraft = {
        ...draft,
      };

      let next: AgentProfileDraft;
      if (draft.id) {
        try {
          next = await updateAgentProfile(draft.id, payload);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (message.includes("(404)")) {
            next = await createAgentProfile(payload);
          } else {
            throw error;
          }
        }
      } else {
        next = await createAgentProfile(payload);
      }

      setDraft(next);
      setDraftKey(next.id ?? crypto.randomUUID());
      setIsEditingMeta(false);
      toast.success("Agent saved successfully");
      
      // Update URL with the saved profile ID
      if (next.id && !draft.id) {
        router.push(`/agents?id=${encodeURIComponent(next.id)}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [draft, router]);

  const handlePreview = useCallback(async () => {
    // Auto-save before preview if there are changes or no ID
    if (hasChanges || !draft.id) {
      setIsSaving(true);
      try {
        const payload: AgentProfileDraft = {
          ...draft,
        };

        let next: AgentProfileDraft;
        if (draft.id) {
          try {
            next = await updateAgentProfile(draft.id, payload);
          } catch (error) {
            const message = error instanceof Error ? error.message : "";
            if (message.includes("(404)")) {
              next = await createAgentProfile(payload);
            } else {
              throw error;
            }
          }
        } else {
          next = await createAgentProfile(payload);
        }

        setDraft(next);
        setDraftKey(next.id ?? crypto.randomUUID());
        toast.success("Agent saved for preview");
        
        // Navigate to preview with the saved profile ID
        if (next.id) {
          setTimeout(() => {
            router.push("/?profileId=" + encodeURIComponent(next.id as string));
          }, 500);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save";
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
      return;
    }
    
    // If no changes and has ID, just navigate
    if (draft.id) {
      router.push("/?profileId=" + encodeURIComponent(draft.id));
    }
  }, [draft, hasChanges, router]);

  const handleUpdateNode = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setDraft((prev) => {
      const newNodes = prev.graph.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      );
      
      // Sync profile-level properties from canvas nodes
      const updatedProfile = { ...prev };
      
      // Find nodes and update profile accordingly
      const toneNode = newNodes.find(n => n.type === "tone");
      const behaviorNode = newNodes.find(n => n.type === "behavior");
      const toolNodes = newNodes.filter(n => n.type === "tool");
      
      if (toneNode?.data?.tone) {
        updatedProfile.tone = toneNode.data.tone as string;
      }
      if (toneNode?.data?.speakingStyle) {
        updatedProfile.speakingStyle = toneNode.data.speakingStyle as string;
      }
      if (behaviorNode?.data?.behavior) {
        updatedProfile.behavior = behaviorNode.data.behavior as string;
      }
      
      // Sync tool nodes to profile.tools
      if (toolNodes.length > 0) {
        updatedProfile.tools = toolNodes.map(node => ({
          id: node.data?.toolId as string || node.id,
          label: node.data?.title as string || "Tool",
          type: "appointment-scheduler" as const,
          enabled: node.data?.status === "active",
          config: {
            calendarId: node.data?.calendarId as string || "primary",
            timezone: node.data?.timezone as string || "UTC",
            bookingWindowDays: 30,
            slotDurationMinutes: 30,
            minimumNoticeMinutes: 60,
            confirmationTemplate: "Your appointment is confirmed.",
          }
        }));
      } else {
        updatedProfile.tools = [];
      }
      
      return { ...updatedProfile, graph: { ...prev.graph, nodes: newNodes } };
    });
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setDraft((prev) => {
      const newNodes = prev.graph.nodes.filter((n) => n.id !== nodeId);
      const newEdges = prev.graph.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      );
      return { ...prev, graph: { nodes: newNodes, edges: newEdges } };
    });
    setSelectedNodeId(null);
    toast.success("Node deleted");
  }, []);

  const handleNewAgent = useCallback(() => {
    setShowNewAgentDialog(true);
  }, []);

  const handleConfirmNewAgent = useCallback(() => {
    // Create a fresh agent with only a start node
    const newAgent: AgentProfileDraft = {
      id: undefined,
      name: "New Agent",
      description: "Describe your new agent here",
      welcomeMessage: "Hello! How can I help you today?",
      tone: "Professional and friendly",
      speakingStyle: "Clear and concise",
      behavior: "Be helpful and courteous",
      tags: [],
      tools: [],
      graph: {
        nodes: [
          {
            id: "start",
            type: "start",
            position: { x: 250, y: 50 },
            data: {
              title: "Start",
              description: "Answer call with welcome message",
            },
          },
        ],
        edges: [],
      },
      // Don't set timestamps - let backend handle them
    };

    setDraft(newAgent);
    setDraftKey(crypto.randomUUID());
    setSelectedNodeId(null);
    setShowNewAgentDialog(false);
    toast.success("New agent created! Start building your workflow.");
  }, []);

  const selectedNode = useMemo(
    () => draft.graph.nodes.find((n) => n.id === selectedNodeId),
    [draft.graph.nodes, selectedNodeId],
  );

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="flex h-full flex-col overflow-hidden border border-border/60 bg-background/60 p-4">
          <AgentBuilderCanvas
            key={draft.id ?? draftKey}
            profile={draft}
            onUpdate={(nextGraph) => {
              setDraft((prev) => ({ ...prev, graph: nextGraph }));
            }}
            onNodeSelect={setSelectedNodeId}
            onNewAgent={handleNewAgent}
            isSaving={isSaving}
            hasChanges={hasChanges}
            onSave={handleSave}
            onPreview={handlePreview}
          />
        </Card>
        <AgentSidePanel 
          profile={draft}
          selectedNode={selectedNode}
          onEditProfile={() => setIsEditingMeta(true)}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
        />
      </div>

      <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Agent Details</DialogTitle>
            <DialogDescription>
              Update the core behaviors for this voice agent.
            </DialogDescription>
          </DialogHeader>
          <AgentProfileForm
            defaultValues={draft}
            onCancel={() => setIsEditingMeta(false)}
            onSubmit={(values) => {
              setDraft((prev) => ({ ...prev, ...values }));
              setIsEditingMeta(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewWarning} onOpenChange={setShowPreviewWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Agent to Preview</DialogTitle>
            <DialogDescription>
              Save this agent profile before launching the voice preview so the
              session can load the latest configuration.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewAgentDialog} onOpenChange={setShowNewAgentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              This will replace your current agent with a fresh canvas. Any unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowNewAgentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmNewAgent}>
              Create New Agent
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function EmptyAgentState({ onCreate }: { onCreate(): void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex h-full flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-border/80 bg-background/60 p-8 text-center"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">
          Build your first agent
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Design an interactive voice agent with custom tools, behaviors, and
          tone. Add nodes on the canvas and tailor the experience for callers.
        </p>
      </div>
      <Button size="lg" onClick={onCreate}>
        Create Agent
      </Button>
    </motion.div>
  );
}


