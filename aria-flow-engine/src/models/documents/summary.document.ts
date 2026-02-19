import { ObjectId } from "mongodb";

export interface SummaryDocument {
  _id: ObjectId;
  sessionId: ObjectId;
  agentId: ObjectId;
  participantId: ObjectId;

  typeId: string;
  data: Record<string, unknown>;

  generatedAt: Date;
}
