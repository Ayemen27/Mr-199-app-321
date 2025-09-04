import { z } from "zod";

// Error Log Schema
export const errorLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  type: z.string(),
  path: z.string(),
  error: z.string(),
  status: z.enum(['active', 'processing', 'resolved']),
  statusCode: z.number(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  stack: z.string().optional(),
  createdAt: z.string(),
});

export const insertErrorLogSchema = errorLogSchema.omit({
  id: true,
  createdAt: true,
});

export type ErrorLog = z.infer<typeof errorLogSchema>;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;

// Diagnostic Check Schema
export const diagnosticCheckSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['success', 'failure', 'warning', 'running']),
  result: z.string().optional(),
  timestamp: z.string(),
  duration: z.number().optional(),
});

export const insertDiagnosticCheckSchema = diagnosticCheckSchema.omit({
  id: true,
  timestamp: true,
});

export type DiagnosticCheck = z.infer<typeof diagnosticCheckSchema>;
export type InsertDiagnosticCheck = z.infer<typeof insertDiagnosticCheckSchema>;

// System Metrics Schema
export const systemMetricsSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  serviceStatus: z.string(),
  uptime: z.number(),
  error502Count: z.number(),
  responseTime: z.number(),
  activeRequests: z.number(),
  requestsPerSecond: z.number(),
  cpuUsage: z.number(),
  memoryUsage: z.number(),
});

export const insertSystemMetricsSchema = systemMetricsSchema.omit({
  id: true,
  timestamp: true,
});

export type SystemMetrics = z.infer<typeof systemMetricsSchema>;
export type InsertSystemMetrics = z.infer<typeof insertSystemMetricsSchema>;

// Alert Settings Schema
export const alertSettingsSchema = z.object({
  id: z.string(),
  emailAlerts: z.boolean(),
  smsAlerts: z.boolean(),
  slackAlerts: z.boolean(),
  alertThreshold: z.number(),
  updatedAt: z.string(),
});

export const insertAlertSettingsSchema = alertSettingsSchema.omit({
  id: true,
  updatedAt: true,
});

export type AlertSettings = z.infer<typeof alertSettingsSchema>;
export type InsertAlertSettings = z.infer<typeof insertAlertSettingsSchema>;

// Deployment Info Schema
export const deploymentInfoSchema = z.object({
  id: z.string(),
  lastDeploy: z.string(),
  branch: z.string(),
  buildId: z.string(),
  region: z.string(),
  status: z.string(),
  updatedAt: z.string(),
});

export type DeploymentInfo = z.infer<typeof deploymentInfoSchema>;

// Project Schema (for compatibility)
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  imageUrl: z.string().optional(),
  createdAt: z.string(),
});

export type Project = z.infer<typeof projectSchema>;
