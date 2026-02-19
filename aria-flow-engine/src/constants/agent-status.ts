export const AgentStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const isValidAgentStatus = (value: string): value is AgentStatus => {
  return Object.values(AgentStatus).includes(value as AgentStatus);
};
