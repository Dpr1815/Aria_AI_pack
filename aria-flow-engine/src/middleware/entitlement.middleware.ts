import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AgentRepository } from '../repositories/agent.repository';
import { UserRepository } from '../repositories/user.repository';
import { PlanConfig, PlanLimits } from '../constants';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

// ============================================
// ENTITLEMENT MIDDLEWARE
//
// Composable plan-based guards.
// Each method returns an Express middleware that checks
// a specific entitlement before the request reaches the controller.
//
// Must run after: auth → tenant
// ============================================

type EntitlementCheck = (req: Request) => Promise<void>;

const requireEntitlement = (check: EntitlementCheck): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await check(req);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export function createEntitlementMiddleware(
  agentRepository: AgentRepository,
  userRepository: UserRepository,
) {
  async function resolvePlanLimits(req: Request): Promise<PlanLimits> {
    if (!req.tenant) throw new UnauthorizedError('Tenant context required');
    if (!req.user) throw new UnauthorizedError('Authentication required');

    if (req.tenant.type === 'personal') {
      return PlanConfig[req.user.planId];
    }

    const creator = await userRepository.findByIdOrThrow(
      req.tenant.organization.creatorId,
      'Organization creator'
    );
    return PlanConfig[creator.planId];
  }

  return {
    canCreateOrganization(): RequestHandler {
      return requireEntitlement(async (req) => {
        const planLimits = await resolvePlanLimits(req);

        if (planLimits.seats <= 0) {
          throw new ForbiddenError(
            'Your current plan does not support organizations. Upgrade to create an organization.'
          );
        }
      });
    },

    maxActiveAgents(): RequestHandler {
      return requireEntitlement(async (req) => {
        if (!req.tenant) throw new UnauthorizedError('Tenant context required');

        const planLimits = await resolvePlanLimits(req);

        const activeCount = req.tenant.type === 'personal'
          ? await agentRepository.countActiveByOwner(req.tenant.userId)
          : await agentRepository.countActiveByOrganization(req.tenant.organizationId);

        if (activeCount >= planLimits.maxActiveAgents) {
          const context = req.tenant.type === 'personal' ? 'your plan' : 'organization';
          throw new ForbiddenError(
            `Maximum active agents (${planLimits.maxActiveAgents}) reached for ${context}. Upgrade or deactivate an agent.`
          );
        }
      });
    },
  };
}

export type EntitlementMiddleware = ReturnType<typeof createEntitlementMiddleware>;
