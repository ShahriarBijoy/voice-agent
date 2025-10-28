"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AgentBuilderHeader } from "@/components/agent-builder/header";
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
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [showPreviewWarning, setShowPreviewWarning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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
        graph,
      };

      const next = draft.id
        ? await updateAgentProfile(draft.id, payload)
        : await createAgentProfile(payload);

      setDraft(next);
      setIsEditingMeta(false);
      toast.success("Agent saved successfully");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [draft, router]);

  const handlePreview = useCallback(() => {
    if (!draft.id) {
      setShowPreviewWarning(true);
      return;
    }
    router.push("/?profileId=" + encodeURIComponent(draft.id));
  }, [draft.id, router]);

  const handleUpdateNode = useCallback((nodeId: string, data: any) => {
    setDraft((prev) => {
      const newNodes = prev.graph.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      );
      return { ...prev, graph: { ...prev.graph, nodes: newNodes } };
    });
  }, []);

  const selectedNode = useMemo(
    () => draft.graph.nodes.find((n) => n.id === selectedNodeId),
    [draft.graph.nodes, selectedNodeId],
  );

  return (
    <div className="flex h-full flex-col gap-6">
      <AgentBuilderHeader
        profile={draft}
        isSaving={isSaving}
        hasChanges={hasChanges}
        onSave={handleSave}
        onPreview={handlePreview}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="flex h-full flex-col overflow-hidden border border-border/60 bg-background/60 p-4">
          <AgentBuilderCanvas
            profile={draft}
            onUpdate={(nextGraph) => {
              setDraft((prev) => ({ ...prev, graph: nextGraph }));
            }}
            onNodeSelect={setSelectedNodeId}
          />
        </Card>
        <AgentSidePanel 
          profile={draft}
          selectedNode={selectedNode}
          onEditProfile={() => setIsEditingMeta(true)}
          onUpdateNode={handleUpdateNode}
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


