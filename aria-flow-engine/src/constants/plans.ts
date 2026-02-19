export const PlanId = {
  FREE: 'plan_free',
  STARTER: 'plan_starter',
  ADVANCED: 'plan_advanced',
} as const;

export type PlanId = (typeof PlanId)[keyof typeof PlanId];

export interface PlanLimits {
  seats: number;
  maxActiveAgents: number;
}

export const PlanConfig: Record<PlanId, PlanLimits> = {
  [PlanId.FREE]: { seats: 0, maxActiveAgents: 0 },
  [PlanId.STARTER]: { seats: 3, maxActiveAgents: 5 },
  [PlanId.ADVANCED]: { seats: 5, maxActiveAgents: 15 },
};

export const getPlanLimits = (planId: PlanId): PlanLimits => {
  return PlanConfig[planId];
};

export const isValidPlanId = (value: string): value is PlanId => {
  return Object.values(PlanId).includes(value as PlanId);
};
