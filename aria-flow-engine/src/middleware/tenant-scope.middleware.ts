import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ObjectId } from 'mongodb';
import { AgentRepository } from '../repositories/agent.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SummaryRepository } from '../repositories/summary.repository';
import { TenantContext } from './tenant.middleware';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { toObjectId } from '../utils/helpers';

// ============================================
// EXPRESS AUGMENTATION
// ============================================

declare global {
  namespace Express {
    interface Request {
      tenantAgentIds?: ObjectId[];
    }
  }
}

// ============================================
// MIDDLEWARE FACTORY
// ============================================

export function createTenantScopeMiddleware(
  agentRepository: AgentRepository,
  sessionRepository: SessionRepository,
  summaryRepository: SummaryRepository,
) {
  /**
   * Verify an agent belongs to the given tenant.
   * Personal: agent must be owned by user with no org.
   * Organization: agent must belong to the tenant's org.
   */
  async function verifyAgentAccess(agentId: ObjectId, tenant: TenantContext): Promise<void> {
    if (tenant.type === 'personal') {
      const owned = await agentRepository.isOwnedByUser(agentId, tenant.userId);
      if (!owned) throw new ForbiddenError('Access denied');
    } else {
      const belongs = await agentRepository.belongsToOrganization(agentId, tenant.organizationId);
      if (!belongs) throw new ForbiddenError('Access denied');
    }
  }

  return {
    /**
     * Resolve the tenant's agent IDs for list operations.
     * Sets req.tenantAgentIds for use by controllers.
     */
    resolveAgentIds(): RequestHandler {
      return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
          if (!req.tenant) throw new UnauthorizedError('Tenant context required');

          req.tenantAgentIds = req.tenant.type === 'personal'
            ? await agentRepository.findPersonalAgentIds(req.tenant.userId)
            : await agentRepository.findIdsByOrganization(req.tenant.organizationId);

          next();
        } catch (error) {
          next(error);
        }
      };
    },

    /**
     * Verify a session belongs to the tenant.
     * Fetches session by paramKey, checks session.agentId ownership.
     */
    session(paramKey = 'id'): RequestHandler {
      return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
          if (!req.tenant) throw new UnauthorizedError('Tenant context required');

          const id = toObjectId(req.params[paramKey]);
          const session = await sessionRepository.findByIdOrThrow(id, 'Session');
          await verifyAgentAccess(session.agentId, req.tenant);

          next();
        } catch (error) {
          next(error);
        }
      };
    },

    /**
     * Verify an agent belongs to the tenant.
     * Checks agent ownership directly via agentId param.
     */
    agent(paramKey = 'id'): RequestHandler {
      return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
          if (!req.tenant) throw new UnauthorizedError('Tenant context required');

          const id = toObjectId(req.params[paramKey]);
          await verifyAgentAccess(id, req.tenant);

          next();
        } catch (error) {
          next(error);
        }
      };
    },

    /**
     * Verify the URL org ID matches the tenant's organization.
     * Requires an organization tenant (personal tenants are rejected).
     */
    organization(paramKey = 'id'): RequestHandler {
      return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
          if (!req.tenant) throw new UnauthorizedError('Tenant context required');
          if (req.tenant.type !== 'organization') {
            throw new ForbiddenError('Organization context required');
          }

          const id = toObjectId(req.params[paramKey]);
          if (!id.equals(req.tenant.organizationId)) {
            throw new ForbiddenError('Access denied');
          }

          next();
        } catch (error) {
          next(error);
        }
      };
    },

    /**
     * Verify a summary belongs to the tenant.
     * Fetches summary by paramKey, checks summary.agentId ownership.
     */
    summary(paramKey = 'id'): RequestHandler {
      return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
          if (!req.tenant) throw new UnauthorizedError('Tenant context required');

          const id = toObjectId(req.params[paramKey]);
          const summary = await summaryRepository.findByIdOrThrow(id, 'Summary');
          await verifyAgentAccess(summary.agentId, req.tenant);

          next();
        } catch (error) {
          next(error);
        }
      };
    },
  };
}

export type TenantScopeMiddleware = ReturnType<typeof createTenantScopeMiddleware>;
