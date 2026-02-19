import { z } from "zod";

export const StatisticsQuerySchema = z.object({
  period: z
    .enum(["daily", "weekly", "monthly", "all_time"])
    .default("all_time"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const AgentStatisticsParamSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
});

export const RefreshStatisticsSchema = z.object({
  force: z.boolean().default(false),
});

export type StatisticsQueryInput = z.infer<typeof StatisticsQuerySchema>;
export type RefreshStatisticsInput = z.infer<typeof RefreshStatisticsSchema>;
