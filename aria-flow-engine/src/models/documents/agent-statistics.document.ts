import { ObjectId } from "mongodb";

export interface AgentStatisticsDocument {
  _id: ObjectId;
  agentId: ObjectId;
  typeId: string;

  totalSessions: number;
  completedSessions: number;
  averageCompletionRate: number;

  data: Record<string, unknown>;

  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
