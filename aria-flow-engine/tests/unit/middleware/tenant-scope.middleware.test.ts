/**
 * Unit tests for tenant-scope middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { createTenantScopeMiddleware } from '../../../src/middleware/tenant-scope.middleware';
import { createObjectId } from '@test/helpers/test-utils';

describe('createTenantScopeMiddleware', () => {
  let mockAgentRepository: any;
  let mockSessionRepository: any;
  let mockSummaryRepository: any;
  let middleware: ReturnType<typeof createTenantScopeMiddleware>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockAgentRepository = {
      isOwnedByUser: jest.fn(),
      belongsToOrganization: jest.fn(),
      findPersonalAgentIds: jest.fn(),
      findIdsByOrganization: jest.fn(),
    };
    mockSessionRepository = {
      findByIdOrThrow: jest.fn(),
    };
    mockSummaryRepository = {
      findByIdOrThrow: jest.fn(),
    };
    middleware = createTenantScopeMiddleware(
      mockAgentRepository,
      mockSessionRepository,
      mockSummaryRepository,
    );
    mockReq = { params: {}, tenant: undefined as any };
    mockRes = {};
    mockNext = jest.fn();
  });

  // ============================================
  // resolveAgentIds
  // ============================================

  describe('resolveAgentIds', () => {
    it('should resolve agent IDs for personal tenant', async () => {
      const userId = createObjectId();
      const agentIds = [createObjectId()];
      mockReq.tenant = { type: 'personal', userId } as any;
      mockAgentRepository.findPersonalAgentIds.mockResolvedValue(agentIds);

      await middleware.resolveAgentIds()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.tenantAgentIds).toEqual(agentIds);
      expect(mockAgentRepository.findPersonalAgentIds).toHaveBeenCalledWith(userId);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should resolve agent IDs for organization tenant', async () => {
      const orgId = createObjectId();
      const agentIds = [createObjectId(), createObjectId()];
      mockReq.tenant = { type: 'organization', organizationId: orgId } as any;
      mockAgentRepository.findIdsByOrganization.mockResolvedValue(agentIds);

      await middleware.resolveAgentIds()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.tenantAgentIds).toEqual(agentIds);
      expect(mockAgentRepository.findIdsByOrganization).toHaveBeenCalledWith(orgId);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when no tenant', async () => {
      mockReq.tenant = undefined as any;

      await middleware.resolveAgentIds()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ============================================
  // session
  // ============================================

  describe('session', () => {
    it('should verify session for personal tenant', async () => {
      const sessionId = createObjectId();
      const agentId = createObjectId();
      const userId = createObjectId();
      mockReq.params = { id: sessionId.toString() };
      mockReq.tenant = { type: 'personal', userId } as any;
      mockSessionRepository.findByIdOrThrow.mockResolvedValue({ agentId });
      mockAgentRepository.isOwnedByUser.mockResolvedValue(true);

      await middleware.session()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockAgentRepository.isOwnedByUser).toHaveBeenCalledWith(agentId, userId);
    });

    it('should verify session for organization tenant', async () => {
      const sessionId = createObjectId();
      const agentId = createObjectId();
      const orgId = createObjectId();
      mockReq.params = { id: sessionId.toString() };
      mockReq.tenant = { type: 'organization', organizationId: orgId } as any;
      mockSessionRepository.findByIdOrThrow.mockResolvedValue({ agentId });
      mockAgentRepository.belongsToOrganization.mockResolvedValue(true);

      await middleware.session()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockAgentRepository.belongsToOrganization).toHaveBeenCalledWith(agentId, orgId);
    });

    it('should call next with error when personal tenant does not own agent', async () => {
      const sessionId = createObjectId();
      mockReq.params = { id: sessionId.toString() };
      mockReq.tenant = { type: 'personal', userId: createObjectId() } as any;
      mockSessionRepository.findByIdOrThrow.mockResolvedValue({ agentId: createObjectId() });
      mockAgentRepository.isOwnedByUser.mockResolvedValue(false);

      await middleware.session()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Access denied' }));
    });

    it('should call next with error when org tenant does not own agent', async () => {
      const sessionId = createObjectId();
      mockReq.params = { id: sessionId.toString() };
      mockReq.tenant = { type: 'organization', organizationId: createObjectId() } as any;
      mockSessionRepository.findByIdOrThrow.mockResolvedValue({ agentId: createObjectId() });
      mockAgentRepository.belongsToOrganization.mockResolvedValue(false);

      await middleware.session()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Access denied' }));
    });

    it('should call next with error when no tenant', async () => {
      mockReq.params = { id: createObjectId().toString() };
      mockReq.tenant = undefined as any;

      await middleware.session()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ============================================
  // agent
  // ============================================

  describe('agent', () => {
    it('should verify agent for personal tenant', async () => {
      const agentId = createObjectId();
      const userId = createObjectId();
      mockReq.params = { id: agentId.toString() };
      mockReq.tenant = { type: 'personal', userId } as any;
      mockAgentRepository.isOwnedByUser.mockResolvedValue(true);

      await middleware.agent()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should verify agent for organization tenant', async () => {
      const agentId = createObjectId();
      const orgId = createObjectId();
      mockReq.params = { id: agentId.toString() };
      mockReq.tenant = { type: 'organization', organizationId: orgId } as any;
      mockAgentRepository.belongsToOrganization.mockResolvedValue(true);

      await middleware.agent()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when no tenant', async () => {
      mockReq.params = { id: createObjectId().toString() };
      mockReq.tenant = undefined as any;

      await middleware.agent()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ============================================
  // organization
  // ============================================

  describe('organization', () => {
    it('should pass when org ID matches tenant', async () => {
      const orgId = createObjectId();
      mockReq.params = { id: orgId.toString() };
      mockReq.tenant = { type: 'organization', organizationId: orgId } as any;

      await middleware.organization()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject when org ID does not match tenant', async () => {
      mockReq.params = { id: createObjectId().toString() };
      mockReq.tenant = { type: 'organization', organizationId: createObjectId() } as any;

      await middleware.organization()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Access denied' }));
    });

    it('should reject personal tenant', async () => {
      mockReq.params = { id: createObjectId().toString() };
      mockReq.tenant = { type: 'personal', userId: createObjectId() } as any;

      await middleware.organization()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Organization context required' })
      );
    });

    it('should call next with error when no tenant', async () => {
      mockReq.params = { id: createObjectId().toString() };
      mockReq.tenant = undefined as any;

      await middleware.organization()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ============================================
  // summary
  // ============================================

  describe('summary', () => {
    it('should verify summary for personal tenant', async () => {
      const summaryId = createObjectId();
      const agentId = createObjectId();
      const userId = createObjectId();
      mockReq.params = { id: summaryId.toString() };
      mockReq.tenant = { type: 'personal', userId } as any;
      mockSummaryRepository.findByIdOrThrow.mockResolvedValue({ agentId });
      mockAgentRepository.isOwnedByUser.mockResolvedValue(true);

      await middleware.summary()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should verify summary for organization tenant', async () => {
      const summaryId = createObjectId();
      const agentId = createObjectId();
      const orgId = createObjectId();
      mockReq.params = { id: summaryId.toString() };
      mockReq.tenant = { type: 'organization', organizationId: orgId } as any;
      mockSummaryRepository.findByIdOrThrow.mockResolvedValue({ agentId });
      mockAgentRepository.belongsToOrganization.mockResolvedValue(true);

      await middleware.summary()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when no tenant', async () => {
      mockReq.params = { id: createObjectId().toString() };
      mockReq.tenant = undefined as any;

      await middleware.summary()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
