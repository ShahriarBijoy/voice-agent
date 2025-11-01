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

export const ToneNodeForm = ({ node, onUpdate }: NodeFormProps) => {
  const { register, watch, reset } = useForm({
    defaultValues: {
      tone: node.data?.tone || "",
      speakingStyle: node.data?.speakingStyle || ""
    }
  });

  useEffect(() => {
    reset({ 
      tone: node.data?.tone || "",
      speakingStyle: node.data?.speakingStyle || ""
    });
  }, [node.id, JSON.stringify(node.data), reset]);
  
  useEffect(() => {
    const subscription = watch((value) => {
      onUpdate(node.id, value);
    });
    return () => subscription.unsubscribe();
  }, [watch, onUpdate, node.id]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="tone">Agent Tone</Label>
        <Textarea
          id="tone"
          {...register("tone")}
          placeholder="e.g., Warm, energetic, and professional"
          rows={3}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="speakingStyle">Speaking Style</Label>
        <Textarea
          id="speakingStyle"
          {...register("speakingStyle")}
          placeholder="e.g., Clear and concise"
          rows={3}
        />
      </div>
    </div>
  );
};

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

export const ConditionNodeForm = ({ node, onUpdate }: NodeFormProps) => {
  const { register, watch, reset, control } = useForm({
    defaultValues: {
      conditionType: node.data?.conditionType || "keyword",
      conditionValue: node.data?.conditionValue || "",
      description: node.data?.description || "",
    }
  });

  useEffect(() => {
    reset({
      conditionType: node.data?.conditionType || "keyword",
      conditionValue: node.data?.conditionValue || "",
      description: node.data?.description || "",
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
        <Label htmlFor="conditionType">Condition Type</Label>
        <Controller
          name="conditionType"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Keyword Match</SelectItem>
                <SelectItem value="intent">Intent Detection</SelectItem>
                <SelectItem value="variable">Variable Check</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="conditionValue">Condition Value</Label>
        <Input 
          id="conditionValue" 
          {...register("conditionValue")} 
          placeholder="e.g., book, schedule, appointment"
        />
        <p className="text-xs text-muted-foreground">
          For keyword: comma-separated keywords. For variable: format as &quot;var==value&quot;
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          {...register("description")} 
          rows={2}
          placeholder="What does this condition check?"
        />
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium text-foreground mb-1">Routing:</p>
        <p className="text-xs text-muted-foreground">
          • Green handle (right): Connect when condition is TRUE
        </p>
        <p className="text-xs text-muted-foreground">
          • Red handle (left): Connect when condition is FALSE
        </p>
      </div>
    </form>
  );
};

export const ActionNodeForm = ({ node, onUpdate }: NodeFormProps) => {
  const { register, watch, reset, control } = useForm({
    defaultValues: {
      actionType: node.data?.actionType || "set_variable",
      variableName: node.data?.variableName || "",
      variableValue: node.data?.variableValue || "",
      template: node.data?.template || "",
      tone: node.data?.tone || "",
      description: node.data?.description || "",
    }
  });

  useEffect(() => {
    reset({
      actionType: node.data?.actionType || "set_variable",
      variableName: node.data?.variableName || "",
      variableValue: node.data?.variableValue || "",
      template: node.data?.template || "",
      tone: node.data?.tone || "",
      description: node.data?.description || "",
    });
  }, [node.id, JSON.stringify(node.data), reset]);
  
  useEffect(() => {
    const subscription = watch((value) => {
      onUpdate(node.id, value);
    });
    return () => subscription.unsubscribe();
  }, [watch, onUpdate, node.id]);

  const actionType = watch("actionType");

  return (
    <form className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="actionType">Action Type</Label>
        <Controller
          name="actionType"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set_variable">Set Variable</SelectItem>
                <SelectItem value="format_response">Format Response</SelectItem>
                <SelectItem value="update_tone">Update Tone</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {actionType === "set_variable" && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="variableName">Variable Name</Label>
            <Input 
              id="variableName" 
              {...register("variableName")} 
              placeholder="e.g., user_intent"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="variableValue">Variable Value</Label>
            <Input 
              id="variableValue" 
              {...register("variableValue")} 
              placeholder="e.g., booking"
            />
          </div>
        </>
      )}

      {actionType === "format_response" && (
        <div className="grid gap-2">
          <Label htmlFor="template">Response Template</Label>
          <Textarea 
            id="template" 
            {...register("template")} 
            rows={3}
            placeholder="e.g., Hello {name}, your appointment is on {date}"
          />
          <p className="text-xs text-muted-foreground">
            Use {"{variable_name}"} to insert variables
          </p>
        </div>
      )}

      {actionType === "update_tone" && (
        <div className="grid gap-2">
          <Label htmlFor="tone">New Tone</Label>
          <Input 
            id="tone" 
            {...register("tone")} 
            placeholder="e.g., formal, casual, enthusiastic"
          />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          {...register("description")} 
          rows={2}
          placeholder="What does this action do?"
        />
      </div>
    </form>
  );
};
