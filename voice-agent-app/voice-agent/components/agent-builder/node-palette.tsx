"use client";

import { motion } from "framer-motion";
import {
  PlayCircle,
  Palette,
  Users,
  FileText,
  Wrench,
  CheckCircle2,
  GitBranch,
  Zap,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NodeType {
  type: string;
  label: string;
  icon: any;
  description: string;
  color: string;
}

const nodeTypes: NodeType[] = [
  {
    type: "start",
    label: "Start",
    icon: PlayCircle,
    description: "Entry point with welcome message",
    color: "text-blue-500",
  },
  {
    type: "tone",
    label: "Tone",
    icon: Palette,
    description: "Set conversation tone",
    color: "text-purple-500",
  },
  {
    type: "behavior",
    label: "Behavior",
    icon: Users,
    description: "Define agent behavior",
    color: "text-pink-500",
  },
  {
    type: "prompt",
    label: "Prompt",
    icon: FileText,
    description: "Custom LLM instructions",
    color: "text-amber-500",
  },
  {
    type: "tool",
    label: "Tool",
    icon: Wrench,
    description: "Execute tools/actions",
    color: "text-orange-500",
  },
  {
    type: "condition",
    label: "Condition",
    icon: GitBranch,
    description: "Branching logic",
    color: "text-green-500",
  },
  {
    type: "action",
    label: "Action",
    icon: Zap,
    description: "Perform operations",
    color: "text-cyan-500",
  },
  {
    type: "summary",
    label: "Summary",
    icon: CheckCircle2,
    description: "End conversation",
    color: "text-teal-500",
  },
];

interface NodePaletteProps {
  onAddNode: (nodeType: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <Card className="border-border/60 bg-background/70 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Plus className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Add Nodes</h3>
      </div>
      <TooltipProvider>
        <div className="grid grid-cols-2 gap-2">
          {nodeTypes.map((nodeType) => {
            const Icon = nodeType.icon;
            return (
              <Tooltip key={nodeType.type}>
                <TooltipTrigger asChild>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex h-auto w-full flex-col items-center gap-2 p-3"
                      onClick={() => onAddNode(nodeType.type)}
                    >
                      <Icon className={`h-5 w-5 ${nodeType.color}`} />
                      <span className="text-xs font-medium">{nodeType.label}</span>
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{nodeType.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </Card>
  );
}
