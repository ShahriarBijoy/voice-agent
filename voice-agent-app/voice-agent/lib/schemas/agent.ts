import { z } from "zod";

const agentToolTypes = ["appointment-scheduler"] as const;

export const appointmentSchedulerConfigSchema = z.object({
  calendarId: z.string().min(1),
  timezone: z.string().min(1),
  bookingWindowDays: z.number().int().positive().max(365),
  slotDurationMinutes: z.number().int().positive().max(180),
  minimumNoticeMinutes: z.number().int().nonnegative().max(1440),
  confirmationTemplate: z.string().min(1),
});

export type AppointmentSchedulerConfig = z.infer<
  typeof appointmentSchedulerConfigSchema
>;

export const agentToolSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(agentToolTypes),
  enabled: z.boolean().default(true),
  config: appointmentSchedulerConfigSchema,
});

export type AgentTool = z.infer<typeof agentToolSchema>;

export const agentNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.unknown()).optional(),
});

export const agentEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
});

export const agentGraphSchema = z.object({
  nodes: z.array(agentNodeSchema),
  edges: z.array(agentEdgeSchema),
});

export const agentProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().default(""),
  welcomeMessage: z.string().min(1),
  tone: z.string().min(1),
  speakingStyle: z.string().min(1),
  behavior: z.string().min(1),
  tags: z.array(z.string()).default([]),
  tools: z.array(agentToolSchema),
  graph: agentGraphSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AgentProfile = z.infer<typeof agentProfileSchema>;

export const agentProfileDraftSchema = agentProfileSchema.extend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type AgentProfileDraft = z.infer<typeof agentProfileDraftSchema>;

export type AgentGraph = z.infer<typeof agentGraphSchema>;

export type AgentNode = z.infer<typeof agentNodeSchema>;

export type AgentEdge = z.infer<typeof agentEdgeSchema>;


