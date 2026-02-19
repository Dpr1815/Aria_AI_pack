/**
 * Statistics DTOs
 *
 * Response shapes for the statistics API.
 * Mirrors the pattern used by AgentDTO, SummaryDTO, etc.
 */

export interface AgentStatisticsDTO {
  _id: string;
  agentId: string;
  typeId: string;

  totalSessions: number;
  completedSessions: number;
  averageCompletionRate: number;

  data: Record<string, unknown>;

  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
}
export interface StatisticsTypeDTO {
  id: string;
  name: string;
  description: string;
  requiredSummaryTypeId: string;
}
