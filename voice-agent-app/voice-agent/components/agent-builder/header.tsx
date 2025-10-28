"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { formatRelative } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentProfileDraft } from "@/lib/schemas/agent";

interface AgentHeaderProps {
  profile: AgentProfileDraft;
  isSaving?: boolean;
  hasChanges?: boolean;
  onSave(): void;
  onPreview(): void;
}

export function AgentBuilderHeader({
  profile,
  isSaving = false,
  hasChanges = false,
  onSave,
  onPreview,
}: AgentHeaderProps) {
  const updatedAt = useMemo(() => {
    if (!profile.updatedAt) {
      return "Unsaved draft";
    }
    return formatRelative(new Date(profile.updatedAt), new Date());
  }, [profile.updatedAt]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/80 px-6 py-4 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            {profile.name}
          </h1>
          <Badge variant={hasChanges ? "default" : "outline"}>
            {hasChanges ? "Unsaved changes" : "Up to date"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {profile.description || "Configure your voice agent behavior"}
        </p>
        <span className="text-xs text-muted-foreground/80">
          Last updated {updatedAt}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onPreview}>
          Preview Experience
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !hasChanges}
          className="min-w-24"
        >
          {isSaving ? "Saving..." : "Save Agent"}
        </Button>
      </div>
    </motion.header>
  );
}


