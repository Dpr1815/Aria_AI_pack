/**
 * Unit tests for entitlement middleware
 */

import { Request, Response, NextFunction } from 'express';
import { createEntitlementMiddleware } from '../../../src/middleware/entitlement.middleware';
import { createObjectId } from '@test/helpers/test-utils';
import { PlanId } from '../../../src/constants/plans';

describe('createEntitlementMiddleware', () => {
  let mockAgentRepository: any;
  let mockUserRepository: any;
  let middleware: ReturnType<typeof createEntitlementMiddleware>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockAgentRepository = {
      countActiveByOwner: jest.fn(),
      countActiveByOrganization: jest.fn(),
    };
    mockUserRepository = {
      findByIdOrThrow: jest.fn(),
    };
    middleware = createEntitlementMiddleware(mockAgentRepository, mockUserRepository);
    mockRes = {};
    mockNext = jest.fn();
  });

  // ============================================
  // canCreateOrganization
  // ============================================

  describe('canCreateOrganization', () => {
    it('should allow when plan has seats > 0 (personal tenant)', async () => {
      mockReq = {
        tenant: { type: 'personal', userId: createObjectId() } as any,
        user: { planId: PlanId.STARTER } as any,
      };

      await middleware.canCreateOrganization()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject when plan has seats <= 0 (free plan)', async () => {
      mockReq = {
        tenant: { type: 'personal', userId: createObjectId() } as any,
        user: { planId: PlanId.FREE } as any,
      };

      await middleware.canCreateOrganization()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('does not support organizations') })
      );
    });

    it('should resolve plan from org creator for organization tenant', async () => {
      const creatorId = createObjectId();
      mockReq = {
        tenant: {
          type: 'organization',
          organizationId: createObjectId(),
          organization: { creatorId },
        } as any,
        user: { planId: PlanId.FREE } as any,
      };
      mockUserRepository.findByIdOrThrow.mockResolvedValue({ planId: PlanId.ADVANCED });

      await middleware.canCreateOrganization()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserRepository.findByIdOrThrow).toHaveBeenCalledWith(creatorId, 'Organization creator');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when no tenant', async () => {
      mockReq = { tenant: undefined as any, user: { planId: PlanId.FREE } as any };

      await middleware.canCreateOrganization()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should call next with error when no user', async () => {
      mockReq = {
        tenant: { type: 'personal', userId: createObjectId() } as any,
        user: undefined as any,
      };

      await middleware.canCreateOrganization()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ============================================
  // maxActiveAgents
  // ============================================

  describe('maxActiveAgents', () => {
    it('should allow when under limit for personal tenant', async () => {
      const userId = createObjectId();
      mockReq = {
        tenant: { type: 'personal', userId } as any,
        user: { planId: PlanId.STARTER } as any,
      };
      mockAgentRepository.countActiveByOwner.mockResolvedValue(2);

      await middleware.maxActiveAgents()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockAgentRepository.countActiveByOwner).toHaveBeenCalledWith(userId);
    });

    it('should reject when at limit for personal tenant', async () => {
      const userId = createObjectId();
      mockReq = {
        tenant: { type: 'personal', userId } as any,
        user: { planId: PlanId.STARTER } as any,
      };
      mockAgentRepository.countActiveByOwner.mockResolvedValue(5); // STARTER limit

      await middleware.maxActiveAgents()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Maximum active agents') })
      );
    });

    it('should allow when under limit for organization tenant', async () => {
      const orgId = createObjectId();
      const creatorId = createObjectId();
      mockReq = {
        tenant: {
          type: 'organization',
          organizationId: orgId,
          organization: { creatorId },
        } as any,
        user: { planId: PlanId.STARTER } as any,
      };
      mockUserRepository.findByIdOrThrow.mockResolvedValue({ planId: PlanId.ADVANCED });
      mockAgentRepository.countActiveByOrganization.mockResolvedValue(3);

      await middleware.maxActiveAgents()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockAgentRepository.countActiveByOrganization).toHaveBeenCalledWith(orgId);
    });

    it('should reject when at limit for organization tenant', async () => {
      const orgId = createObjectId();
      const creatorId = createObjectId();
      mockReq = {
        tenant: {
          type: 'organization',
          organizationId: orgId,
          organization: { creatorId },
        } as any,
        user: { planId: PlanId.STARTER } as any,
      };
      mockUserRepository.findByIdOrThrow.mockResolvedValue({ planId: PlanId.STARTER });
      mockAgentRepository.countActiveByOrganization.mockResolvedValue(5);

      await middleware.maxActiveAgents()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Maximum active agents') })
      );
    });

    it('should call next with error when no tenant on maxActiveAgents', async () => {
      mockReq = {
        tenant: undefined as any,
        user: { planId: PlanId.STARTER } as any,
      };

      await middleware.maxActiveAgents()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
