import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { Role, RoleHierarchy } from '../constants';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { OrganizationDocument } from '../models/documents/organization.document';
import { OrganizationRepository } from '../repositories/organization.repository';

// ============================================
// TENANT CONTEXT TYPES
// ============================================

export interface PersonalTenant {
  type: 'personal';
  userId: ObjectId;
}

export interface OrganizationTenant {
  type: 'organization';
  userId: ObjectId;
  organizationId: ObjectId;
  role: Role;
  organization: OrganizationDocument;
}

export type TenantContext = PersonalTenant | OrganizationTenant;

// ============================================
// EXPRESS AUGMENTATION
// ============================================

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

// ============================================
// MIDDLEWARE
// ============================================

export const HEADER_ORGANIZATION_ID = 'x-organization-id';

export const createTenantMiddleware = (
  organizationRepository: OrganizationRepository,
) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const orgIdHeader = req.headers[HEADER_ORGANIZATION_ID];

      if (!orgIdHeader) {
        req.tenant = { type: 'personal', userId: req.user._id };
        next();
        return;
      }

      const orgIdStr = Array.isArray(orgIdHeader) ? orgIdHeader[0] : orgIdHeader;

      let organizationId: ObjectId;
      try {
        organizationId = new ObjectId(orgIdStr);
      } catch {
        throw new ForbiddenError('Invalid X-Organization-ID header');
      }

      const organization = await organizationRepository.findById(organizationId);
      if (!organization) {
        throw new ForbiddenError('Organization not found');
      }

      const member = organization.members.find((m) =>
        m.userId.equals(req.user!._id),
      );
      if (!member) {
        throw new ForbiddenError('You are not a member of this organization');
      }

      req.tenant = {
        type: 'organization',
        userId: req.user._id,
        organizationId,
        role: member.role,
        organization,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
};

// ============================================
// ROLE GUARD
// ============================================

/**
 * Middleware that enforces a minimum role for organization tenants.
 * Personal tenants pass through (owner has full access to their resources).
 * Must run after tenant middleware.
 */
export const requireTenantRole = (requiredRole: Role) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.tenant) {
        throw new UnauthorizedError('Tenant context required');
      }

      if (req.tenant.type === 'organization') {
        if (RoleHierarchy[req.tenant.role] < RoleHierarchy[requiredRole]) {
          throw new ForbiddenError(`Requires ${requiredRole} role or higher`);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
