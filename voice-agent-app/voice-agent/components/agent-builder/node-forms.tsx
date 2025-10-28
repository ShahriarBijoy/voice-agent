"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { AgentNode } from "@/lib/schemas/agent";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NodeFormProps {
  node: AgentNode;
  onUpdate: (nodeId: string, data: any) => void;
}

const GenericNodeForm = ({ node, onUpdate, field, placeholder, label }: NodeFormProps & { field: string, placeholder?: string, label: string }) => {
  const { register, watch, reset } = useForm({
    defaultValues: {
      [field]: node.data?.[field] || ""
    }
  });

  useEffect(() => {
    reset({ [field]: node.data?.[field] || "" });
  }, [node.id, JSON.stringify(node.data), reset, field]);
  
  useEffect(() => {
    const subscription = watch((value) => {
      onUpdate(node.id, value);
    });
    return () => subscription.unsubscribe();
  }, [watch, onUpdate, node.id]);

  return (
    <div className="grid gap-2">
      <Label htmlFor={field} className="capitalize">{label}</Label>
      <Textarea
        id={field}
        {...register(field)}
        placeholder={placeholder}
        rows={4}
      />
    </div>
  );
};

export const ToneNodeForm = ({ node, onUpdate }: NodeFormProps) => (
  <GenericNodeForm node={node} onUpdate={onUpdate} field="tone" label="Agent Tone" placeholder="e.g., Warm, energetic, and professional" />
);

export const BehaviorNodeForm = ({ node, onUpdate }: NodeFormProps) => (
  <GenericNodeForm node={node} onUpdate={onUpdate} field="behavior" label="Agent Behavior" placeholder="e.g., Gather patient status, confirm insurance..." />
);

export const PromptNodeForm = ({ node, onUpdate }: NodeFormProps) => (
  <GenericNodeForm node={node} onUpdate={onUpdate} field="description" label="Prompt Template" placeholder="e.g., A template for summarizing the conversation." />
);

export const SummaryNodeForm = ({ node, onUpdate }: NodeFormProps) => (
  <GenericNodeForm node={node} onUpdate={onUpdate} field="description" label="Summary Details" placeholder="e.g., Summarize the call and send a follow-up email." />
);

export const ToolNodeForm = ({ node, onUpdate }: NodeFormProps) => {
  const { register, watch, reset, control } = useForm({
    defaultValues: {
      title: node.data?.title || "Appointment Scheduler",
      description: node.data?.description || "",
      status: node.data?.status || "inactive",
      toolType: node.data?.toolType || "calendar",
    }
  });

  useEffect(() => {
    reset({
        title: node.data?.title || "Appointment Scheduler",
        description: node.data?.description || "",
        status: node.data?.status || "inactive",
        toolType: node.data?.toolType || "calendar",
    });
  }, [node.id, JSON.stringify(node.data), reset]);
  
  useEffect(() => {
    const subscription = watch((value) => {
      onUpdate(node.id, value);
    });
    return () => subscription.unsubscribe();
  }, [watch, onUpdate, node.id]);

  return (
    <form className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Tool Name</Label>
        <Input id="title" {...register("title")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} rows={3} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="toolType">Tool Type</Label>
         <Controller
          name="toolType"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tool" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Calendar</SelectItem>
                <SelectItem value="contacts">Contacts</SelectItem>
                <SelectItem value="mail">Mail</SelectItem>
                <SelectItem value="teams">Teams</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="flex items-center space-x-2 pt-2">
         <Controller
          name="status"
          control={control}
          render={({ field }) => (
             <Switch
                id="status"
                checked={field.value === 'active'}
                onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')}
             />
          )}
        />
        <Label htmlFor="status">Enable Tool</Label>
      </div>
    </form>
  );
};


export const StartNodeForm = () => {
    return (
      <Card className="border-dashed">
        <CardHeader>
            <CardTitle className="text-base">Start Node</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                This is the entry point for your agent. It doesn&apos;t have any configurable properties.
            </p>
        </CardContent>
      </Card>
    );
};
