"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgentProfileDraft, agentProfileDraftSchema } from "@/lib/schemas/agent";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface AgentProfileFormProps {
  defaultValues: AgentProfileDraft;
  onSubmit(values: AgentProfileDraft): void;
  onCancel(): void;
}

export function AgentProfileForm({
  defaultValues,
  onSubmit,
  onCancel,
}: AgentProfileFormProps) {
  const form = useForm<AgentProfileDraft>({
    resolver: zodResolver(agentProfileDraftSchema),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit({ ...defaultValues, ...values });
  });

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground">Name</label>
        <Input
          {...form.register("name")}
          placeholder="Shiny Smiles Scheduler"
        />
        {form.formState.errors.name ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground">
          Description
        </label>
        <Textarea
          {...form.register("description")}
          placeholder="Agent for scheduling dental appointments and verifying insurance details."
          rows={3}
        />
        {form.formState.errors.description ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.description.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground">
          Welcome Message
        </label>
        <Textarea
          {...form.register("welcomeMessage")}
          placeholder="Thanks for calling Shiny Smiles scheduling desk..."
          rows={3}
        />
        {form.formState.errors.welcomeMessage ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.welcomeMessage.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground">Tone</label>
        <Input {...form.register("tone")} placeholder="Warm, professional" />
        {form.formState.errors.tone ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.tone.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground">Speaking Style</label>
        <Input
          {...form.register("speakingStyle")}
          placeholder="Clear, conversational"
        />
        {form.formState.errors.speakingStyle ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.speakingStyle.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground">Behavior</label>
        <Textarea
          {...form.register("behavior")}
          placeholder="Confirm patient identity, verify insurance, offer earliest available slot"
          rows={3}
        />
        {form.formState.errors.behavior ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.behavior.message}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Details</Button>
      </div>
    </form>
  );
}


