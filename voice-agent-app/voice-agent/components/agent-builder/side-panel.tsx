"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AgentNode, AgentProfileDraft } from "@/lib/schemas/agent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import { 
  ToneNodeForm, 
  BehaviorNodeForm, 
  PromptNodeForm, 
  ToolNodeForm, 
  SummaryNodeForm,
  StartNodeForm,
  ConditionNodeForm,
  ActionNodeForm,
} from "@/components/agent-builder/node-forms";

interface AgentSidePanelProps {
  profile: AgentProfileDraft;
  selectedNode?: AgentNode;
  onEditProfile?(): void;
  onUpdateNode?(nodeId: string, data: any): void;
  onDeleteNode?(nodeId: string): void;
}

const GeneralInfoPanel = ({ profile, onEditProfile }: { profile: AgentProfileDraft, onEditProfile?: () => void }) => {
  const toolSummary = useMemo(() => {
    const appointmentTool = profile.tools.find(
      (tool) => tool.type === "appointment-scheduler",
    );
    return {
      total: profile.tools.length,
      appointment: appointmentTool,
    };
  }, [profile.tools]);

  return (
    <>
      <section className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">
              {profile.name}
            </h3>
            <Badge variant="outline">Draft</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{profile.description}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onEditProfile}>
          Edit
        </Button>
      </section>

      <Card className="flex flex-col gap-4 border border-border/60 bg-background/80 p-4">
        <header>
          <h4 className="text-sm font-semibold text-foreground">Conversation</h4>
          <p className="text-xs text-muted-foreground">
            Welcome message and default style
          </p>
        </header>
        <Separator />
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Welcome Message
            </p>
            <p className="text-muted-foreground">{profile.welcomeMessage}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Tone
            </p>
            <p className="text-muted-foreground">{profile.tone}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Speaking Style
            </p>
            <p className="text-muted-foreground">{profile.speakingStyle}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Behavior
            </p>
            <p className="text-muted-foreground">{profile.behavior}</p>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 border border-border/60 bg-background/80 p-4">
        <header>
          <h4 className="text-sm font-semibold text-foreground">Tools</h4>
          <p className="text-xs text-muted-foreground">
            {toolSummary.total} configured tools
          </p>
        </header>
        <Separator />
        {toolSummary.appointment ? (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Appointment Scheduler</Badge>
              <span className="text-xs text-muted-foreground">
                {toolSummary.appointment.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="text-muted-foreground">
              Accesses calendar `{toolSummary.appointment.config.calendarId}`
              with {toolSummary.appointment.config.slotDurationMinutes}-minute
              slots.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No appointment scheduler attached.
          </p>
        )}
      </Card>
    </>
  )
}

const NodeConfigPanel = ({ node, onUpdate, onDelete }: { node: AgentNode, onUpdate?: (id: string, data: any) => void, onDelete?: (id: string) => void }) => {
  
  const renderForm = () => {
    if (!onUpdate) return null;

    switch (node.type) {
      case "start":
        return <StartNodeForm />;
      case "tone":
        return <ToneNodeForm node={node} onUpdate={onUpdate} />;
      case "behavior":
        return <BehaviorNodeForm node={node} onUpdate={onUpdate} />;
      case "prompt":
        return <PromptNodeForm node={node} onUpdate={onUpdate} />;
      case "tool":
        return <ToolNodeForm node={node} onUpdate={onUpdate} />;
      case "summary":
        return <SummaryNodeForm node={node} onUpdate={onUpdate} />;
      case "condition":
        return <ConditionNodeForm node={node} onUpdate={onUpdate} />;
      case "action":
        return <ActionNodeForm node={node} onUpdate={onUpdate} />;
      default:
        return (
          <p className="text-sm text-muted-foreground">
            This node type does not have any configuration.
          </p>
        );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold capitalize text-foreground">
            {node.type} Node
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure this node&apos;s properties
          </p>
        </div>
        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </section>
      <div className="pt-2">
        {renderForm()}
      </div>
    </div>
  )
}

export function AgentSidePanel({ profile, selectedNode, onEditProfile, onUpdateNode, onDeleteNode }: AgentSidePanelProps) {
  
  return (
    <ScrollArea className="h-full">
      <motion.aside
        key={selectedNode ? selectedNode.id : "profile"}
        initial={{ x: 24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="flex h-full w-full flex-col gap-4 rounded-2xl border border-border/70 bg-background/70 p-6 shadow-sm"
      >
        {selectedNode ? (
          <NodeConfigPanel node={selectedNode} onUpdate={onUpdateNode} onDelete={onDeleteNode} />
        ) : (
          <GeneralInfoPanel profile={profile} onEditProfile={onEditProfile} />
        )}
      </motion.aside>
    </ScrollArea>
  );
}


