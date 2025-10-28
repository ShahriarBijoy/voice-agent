"use client";

import { memo } from "react";
import {
  Handle,
  NodeProps,
  Position,
} from "@xyflow/react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BaseAgentNodeData {
  title: string;
  subtitle?: string;
  description?: string;
  tone?: string;
  behavior?: string;
  icon?: React.ReactNode;
  status?: "active" | "inactive";
}

interface AgentNodeProps extends NodeProps<BaseAgentNodeData> {}

export const AgentStartNode = memo(function AgentStartNode(
  props: AgentNodeProps,
) {
  const { data } = props;

  return (
    <motion.div
      initial={{ opacity: 0.6, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(baseNodeClass, "bg-slate-900 text-white shadow-xl")}
    >
      <Handle type="source" position={Position.Bottom} className={handleClass} />
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Entry</Badge>
          <span className="text-xs uppercase tracking-wide text-slate-200">
            {data.subtitle ?? "Start"}
          </span>
        </div>
        <p className="text-lg font-semibold">{data.title}</p>
        {data.description ? (
          <p className="text-sm text-slate-200/80">{data.description}</p>
        ) : null}
      </div>
    </motion.div>
  );
});

export const AgentToneNode = memo(function AgentToneNode(props: AgentNodeProps) {
  const { data } = props;

  return (
    <motion.div
      initial={{ opacity: 0.5, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={baseNodeClass}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Tone
      </span>
      <p className="text-base font-semibold text-foreground">{data.tone}</p>
      {data.description ? (
        <p className="text-sm text-muted-foreground">{data.description}</p>
      ) : null}
    </motion.div>
  );
});

export const AgentBehaviorNode = memo(function AgentBehaviorNode(
  props: AgentNodeProps,
) {
  const { data } = props;

  return (
    <motion.div
      initial={{ opacity: 0.5, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={baseNodeClass}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Behavior
      </span>
      <p className="text-base font-semibold text-foreground">
        {data.behavior ?? "Custom"}
      </p>
      {data.description ? (
        <p className="text-sm text-muted-foreground">{data.description}</p>
      ) : null}
    </motion.div>
  );
});

export const AgentPromptNode = memo(function AgentPromptNode(props: AgentNodeProps) {
  const { data } = props;

  return (
    <motion.div
      initial={{ opacity: 0.5, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={baseNodeClass}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Prompt Template
      </span>
      <p className="text-sm text-muted-foreground">{data.description}</p>
    </motion.div>
  );
});

export const AgentToolNode = memo(function AgentToolNode(props: AgentNodeProps) {
  const { data } = props;

  return (
    <motion.div
      initial={{ opacity: 0.5, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(baseNodeClass, "border border-primary/40 bg-primary/5")}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
      <div className="flex items-center gap-2">
        <Badge>{data.title}</Badge>
        <span className="text-xs text-primary/80">
          {data.status === "active" ? "Enabled" : "Disabled"}
        </span>
      </div>
      {data.description ? (
        <p className="text-sm text-muted-foreground">{data.description}</p>
      ) : null}
    </motion.div>
  );
});

export const AgentSummaryNode = memo(function AgentSummaryNode(
  props: AgentNodeProps,
) {
  const { data } = props;

  return (
    <motion.div
      initial={{ opacity: 0.5, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(baseNodeClass, "bg-foreground text-background")}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <p className="text-sm font-semibold uppercase tracking-wide text-background/80">
        Output
      </p>
      <p className="text-sm text-background/80">{data.description}</p>
    </motion.div>
  );
});

const baseNodeClass = cn(
  "group/node relative flex w-[220px] flex-col gap-2 rounded-xl border border-border/60",
  "bg-card p-4 text-left shadow-md backdrop-blur",
  "transition-all duration-200 hover:shadow-lg",
);

const handleClass = cn(
  "h-2 w-2 border-none bg-primary shadow-md shadow-primary/40",
  "group-hover/node:h-3 group-hover/node:w-3",
);


