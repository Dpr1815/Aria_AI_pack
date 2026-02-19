/**
 * Unit tests for AgentController
 *
 * Tests the controller layer in isolation by mocking the service layer
 */

import { Request, Response, NextFunction } from 'express';
import { AgentController } from '@controllers/agent.controller';
import {
  AgentService,
  AgentGeneratorService,
  SessionService,
  ParticipantService,
  ConversationService,
} from '@services';
import { createObjectId } from '@test/helpers/test-utils';

// Mock all services
jest.mock('@services');

describe('AgentController', () => {
  let controller: AgentController;
  let mockAgentService: jest.Mocked<AgentService>;
  let mockAgentGeneratorService: jest.Mocked<AgentGeneratorService>;
  let mockSessionService: jest.Mocked<SessionService>;
  let mockParticipantService: jest.Mocked<ParticipantService>;
  let mockConversationService: jest.Mocked<ConversationService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockUserId = createObjectId();
  const mockOrganizationId = createObjectId();

  beforeEach(() => {
    // Create mock services
    mockAgentService = {
      createAgent: jest.fn(),
      listAgents: jest.fn(),
      getAgent: jest.fn(),
      getAgentPublicProfile: jest.fn(),
      updateAgent: jest.fn(),
      deleteAgent: jest.fn(),
      activateAgent: jest.fn(),
      deactivateAgent: jest.fn(),
      getAgentSteps: jest.fn(),
      getAgentStep: jest.fn(),
      updateAgentStep: jest.fn(),
      addAgentStep: jest.fn(),
      removeAgentStep: jest.fn(),
      getAgentPrompts: jest.fn(),
      getAgentPrompt: jest.fn(),
      updateAgentPrompt: jest.fn(),
      getAgentAssessment: jest.fn(),
      updateAgentAssessment: jest.fn(),
    } as any;

    mockAgentGeneratorService = {
      generateAgent: jest.fn(),
    } as any;

    mockSessionService = {
      listByAgent: jest.fn(),
      getAgentStats: jest.fn(),
    } as any;

    mockParticipantService = {
      listByAgent: jest.fn(),
    } as any;

    mockConversationService = {
      getAgentStats: jest.fn(),
    } as any;

    controller = new AgentController(
      mockAgentService,
      mockAgentGeneratorService,
      mockSessionService,
      mockParticipantService,
      mockConversationService
    );

    // Setup mock request/response
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { _id: mockUserId, organizationId: mockOrganizationId } as any,
      tenant: { type: 'personal', userId: mockUserId } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('AGENT CRUD', () => {
    describe('create', () => {
      it('should create agent successfully', async () => {
        const createInput = {
          name: 'Test Agent',
          description: 'Test description',
        };
        const mockAgent = {
          _id: createObjectId().toString(),
          ...createInput,
        };

        mockAgentService.createAgent.mockResolvedValue(mockAgent as any);
        mockReq.body = createInput;

        await controller.create(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.createAgent).toHaveBeenCalledWith(mockReq.tenant, createInput);
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockAgent,
            message: 'Agent created successfully',
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle errors during creation', async () => {
        const error = new Error('Failed to create agent');
        mockAgentService.createAgent.mockRejectedValue(error);
        mockReq.body = { name: 'Test Agent' };

        await controller.create(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(error);
      });
    });

    describe('generate', () => {
      it('should generate agent successfully', async () => {
        const generateInput = {
          prompt: 'Generate a customer support agent',
        };
        const mockAgent = {
          _id: createObjectId().toString(),
          name: 'Generated Agent',
        };

        mockAgentGeneratorService.generateAgent.mockResolvedValue(mockAgent as any);
        mockReq.body = generateInput;

        await controller.generate(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentGeneratorService.generateAgent).toHaveBeenCalledWith(
          mockReq.tenant,
          generateInput
        );
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockAgent,
            message: 'Agent generated successfully',
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('list', () => {
      it('should return paginated agents successfully', async () => {
        const mockResult = {
          data: [
            { _id: createObjectId().toString(), name: 'Agent 1' },
            { _id: createObjectId().toString(), name: 'Agent 2' },
          ],
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        };

        mockAgentService.listAgents.mockResolvedValue(mockResult as any);
        mockReq.query = { page: '1', limit: '10' };

        await controller.list(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.listAgents).toHaveBeenCalledWith(
          mockReq.tenant,
          mockReq.query
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockResult.data,
            meta: expect.objectContaining({
              page: 1,
              limit: 10,
              total: 2,
            }),
          })
        );
      });
    });

    describe('getById', () => {
      it('should return agent by id successfully', async () => {
        const agentId = createObjectId().toString();
        const mockAgent = {
          _id: agentId,
          name: 'Test Agent',
        };

        mockAgentService.getAgent.mockResolvedValue(mockAgent as any);
        mockReq.params = { id: agentId };
        mockReq.query = {};

        await controller.getById(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.getAgent).toHaveBeenCalledWith(agentId, expect.any(Object));
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockAgent,
          })
        );
      });

      it('should handle include query parameter', async () => {
        const agentId = createObjectId().toString();
        const mockAgent = { _id: agentId, name: 'Test Agent' };

        mockAgentService.getAgent.mockResolvedValue(mockAgent as any);
        mockReq.params = { id: agentId };
        mockReq.query = { include: 'steps,prompts' };

        await controller.getById(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.getAgent).toHaveBeenCalled();
      });
    });

    describe('getPublicProfile', () => {
      it('should return public agent profile successfully', async () => {
        const agentId = createObjectId().toString();
        const mockProfile = {
          _id: agentId,
          name: 'Public Agent',
          description: 'Public description',
        };

        mockAgentService.getAgentPublicProfile.mockResolvedValue(mockProfile as any);
        mockReq.params = { id: agentId };

        await controller.getPublicProfile(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.getAgentPublicProfile).toHaveBeenCalledWith(agentId);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockProfile,
          })
        );
      });
    });

    describe('update', () => {
      it('should update agent successfully', async () => {
        const agentId = createObjectId().toString();
        const updateInput = { name: 'Updated Agent' };
        const mockUpdated = { _id: agentId, ...updateInput };

        mockAgentService.updateAgent.mockResolvedValue(mockUpdated as any);
        mockReq.params = { id: agentId };
        mockReq.body = updateInput;

        await controller.update(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.updateAgent).toHaveBeenCalledWith(agentId, updateInput);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockUpdated,
            message: 'Agent updated successfully',
          })
        );
      });
    });

    describe('delete', () => {
      it('should delete agent successfully', async () => {
        const agentId = createObjectId().toString();
        mockAgentService.deleteAgent.mockResolvedValue(undefined);
        mockReq.params = { id: agentId };

        await controller.delete(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.deleteAgent).toHaveBeenCalledWith(agentId);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Agent deleted successfully',
          })
        );
      });
    });

    describe('activate', () => {
      it('should activate agent successfully', async () => {
        const agentId = createObjectId().toString();
        const mockActivated = { _id: agentId, isActive: true };

        mockAgentService.activateAgent.mockResolvedValue(mockActivated as any);
        mockReq.params = { id: agentId };

        await controller.activate(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.activateAgent).toHaveBeenCalledWith(agentId);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockActivated,
            message: 'Agent activated successfully',
          })
        );
      });
    });

    describe('deactivate', () => {
      it('should deactivate agent successfully', async () => {
        const agentId = createObjectId().toString();
        const mockDeactivated = { _id: agentId, isActive: false };

        mockAgentService.deactivateAgent.mockResolvedValue(mockDeactivated as any);
        mockReq.params = { id: agentId };

        await controller.deactivate(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.deactivateAgent).toHaveBeenCalledWith(agentId);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockDeactivated,
            message: 'Agent deactivated successfully',
          })
        );
      });
    });
  });

  describe('STEP ROUTES', () => {
    describe('listSteps', () => {
      it('should return agent steps successfully', async () => {
        const agentId = createObjectId().toString();
        const mockSteps = [{ key: 'step1' }, { key: 'step2' }];

        mockAgentService.getAgentSteps.mockResolvedValue(mockSteps as any);
        mockReq.params = { id: agentId };

        await controller.listSteps(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.getAgentSteps).toHaveBeenCalledWith(agentId);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('getStep', () => {
      it('should return specific step successfully', async () => {
        const agentId = createObjectId().toString();
        const stepKey = 'welcome';
        const mockStep = { key: stepKey, type: 'message' };

        mockAgentService.getAgentStep.mockResolvedValue(mockStep as any);
        mockReq.params = { id: agentId, key: stepKey };

        await controller.getStep(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.getAgentStep).toHaveBeenCalledWith(agentId, stepKey);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('updateStep', () => {
      it('should update step without prompt recompilation', async () => {
        const agentId = createObjectId().toString();
        const stepKey = 'welcome';
        const updateInput = { label: 'Updated Label' };
        const mockResult = {
          step: { key: stepKey, label: 'Updated Label' },
          promptRecompiled: false,
        };

        mockAgentService.updateAgentStep.mockResolvedValue(mockResult as any);
        mockReq.params = { id: agentId, key: stepKey };
        mockReq.body = updateInput;

        await controller.updateStep(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.updateAgentStep).toHaveBeenCalledWith(
          agentId,
          stepKey,
          updateInput
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Step updated successfully',
          })
        );
      });

      it('should update step with prompt recompilation', async () => {
        const agentId = createObjectId().toString();
        const stepKey = 'welcome';
        const updateInput = { inputs: { newField: 'value' } };
        const mockResult = {
          step: { key: stepKey },
          promptRecompiled: true,
        };

        mockAgentService.updateAgentStep.mockResolvedValue(mockResult as any);
        mockReq.params = { id: agentId, key: stepKey };
        mockReq.body = updateInput;

        await controller.updateStep(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Step updated and prompt recompiled',
          })
        );
      });
    });

    describe('addStep', () => {
      it('should add new step successfully', async () => {
        const agentId = createObjectId().toString();
        const addInput = {
          key: 'newStep',
          type: 'message',
          label: 'New Step',
        };
        const mockStep = { ...addInput };

        mockAgentService.addAgentStep.mockResolvedValue(mockStep as any);
        mockReq.params = { id: agentId };
        mockReq.body = addInput;

        await controller.addStep(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.addAgentStep).toHaveBeenCalledWith(agentId, addInput);
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Step added successfully',
          })
        );
      });
    });

    describe('removeStep', () => {
      it('should remove step successfully', async () => {
        const agentId = createObjectId().toString();
        const stepKey = 'oldStep';

        mockAgentService.removeAgentStep.mockResolvedValue(undefined);
        mockReq.params = { id: agentId, key: stepKey };

        await controller.removeStep(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.removeAgentStep).toHaveBeenCalledWith(agentId, stepKey);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Step removed successfully',
          })
        );
      });
    });
  });

  describe('PROMPT ROUTES', () => {
    describe('listPrompts', () => {
      it('should return agent prompts successfully', async () => {
        const agentId = createObjectId().toString();
        const mockPrompts = [{ key: 'welcome' }, { key: 'goodbye' }];

        mockAgentService.getAgentPrompts.mockResolvedValue(mockPrompts as any);
        mockReq.params = { id: agentId };

        await controller.listPrompts(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.getAgentPrompts).toHaveBeenCalledWith(agentId);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('getPrompt', () => {
      it('should return specific prompt successfully', async () => {
        const agentId = createObjectId().toString();
        const promptKey = 'welcome';
        const mockPrompt = { key: promptKey, content: 'Hello!' };

        mockAgentService.getAgentPrompt.mockResolvedValue(mockPrompt as any);
        mockReq.params = { id: agentId, key: promptKey };

        await controller.getPrompt(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.getAgentPrompt).toHaveBeenCalledWith(agentId, promptKey);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('updatePrompt', () => {
      it('should update prompt successfully', async () => {
        const agentId = createObjectId().toString();
        const promptKey = 'welcome';
        const updateInput = { content: 'Updated content' };
        const mockPrompt = { key: promptKey, ...updateInput };

        mockAgentService.updateAgentPrompt.mockResolvedValue(mockPrompt as any);
        mockReq.params = { id: agentId, key: promptKey };
        mockReq.body = updateInput;

        await controller.updatePrompt(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.updateAgentPrompt).toHaveBeenCalledWith(
          agentId,
          promptKey,
          updateInput
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Prompt updated successfully',
          })
        );
      });
    });
  });

  describe('ASSESSMENT ROUTES', () => {
    describe('getAssessment', () => {
      it('should return assessment successfully', async () => {
        const agentId = createObjectId().toString();
        const mockAssessment = { criteria: ['accuracy', 'completeness'] };

        mockAgentService.getAgentAssessment.mockResolvedValue(mockAssessment as any);
        mockReq.params = { id: agentId };

        await controller.getAssessment(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.getAgentAssessment).toHaveBeenCalledWith(agentId);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should return null for missing assessment', async () => {
        const agentId = createObjectId().toString();

        mockAgentService.getAgentAssessment.mockResolvedValue(null);
        mockReq.params = { id: agentId };

        await controller.getAssessment(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: null,
          })
        );
      });
    });

    describe('updateAssessment', () => {
      it('should update assessment successfully', async () => {
        const agentId = createObjectId().toString();
        const updateInput = { criteria: ['accuracy', 'completeness', 'clarity'] };
        const mockAssessment = { ...updateInput };

        mockAgentService.updateAgentAssessment.mockResolvedValue(mockAssessment as any);
        mockReq.params = { id: agentId };
        mockReq.body = updateInput;

        await controller.updateAssessment(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAgentService.updateAgentAssessment).toHaveBeenCalledWith(agentId, updateInput);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Assessment updated successfully',
          })
        );
      });
    });
  });

  describe('SESSION ROUTES', () => {
    describe('listSessions', () => {
      it('should return agent sessions successfully', async () => {
        const agentId = createObjectId().toString();
        const mockResult = {
          data: [{ _id: createObjectId().toString() }],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        };

        mockSessionService.listByAgent.mockResolvedValue(mockResult as any);
        mockReq.params = { id: agentId };
        mockReq.query = { page: '1' };

        await controller.listSessions(mockReq as Request, mockRes as Response, mockNext);

        expect(mockSessionService.listByAgent).toHaveBeenCalledWith(agentId, mockReq.query);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('getSessionStats', () => {
      it('should return session statistics successfully', async () => {
        const agentId = createObjectId().toString();
        const mockStats = {
          total: 50,
          byStatus: {
            active: 10,
            completed: 35,
            abandoned: 5,
          },
        };

        mockSessionService.getAgentStats.mockResolvedValue(mockStats);
        mockReq.params = { id: agentId };

        await controller.getSessionStats(mockReq as Request, mockRes as Response, mockNext);

        expect(mockSessionService.getAgentStats).toHaveBeenCalledWith(agentId);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });
  });

  describe('PARTICIPANT ROUTES', () => {
    describe('listParticipants', () => {
      it('should return agent participants successfully', async () => {
        const agentId = createObjectId().toString();
        const mockResult = {
          data: [{ _id: createObjectId().toString(), email: 'test@example.com' }],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        };

        mockParticipantService.listByAgent.mockResolvedValue(mockResult as any);
        mockReq.params = { id: agentId };
        mockReq.query = { page: '1' };

        await controller.listParticipants(mockReq as Request, mockRes as Response, mockNext);

        expect(mockParticipantService.listByAgent).toHaveBeenCalledWith(agentId, mockReq.query);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });
  });

  describe('CONVERSATION ROUTES', () => {
    describe('getConversationStats', () => {
      it('should return conversation statistics successfully', async () => {
        const agentId = createObjectId().toString();
        const mockStats = {
          totalMessages: 1500,
          averageMessagesPerConversation: 15,
        };

        mockConversationService.getAgentStats.mockResolvedValue(mockStats);
        mockReq.params = { id: agentId };

        await controller.getConversationStats(mockReq as Request, mockRes as Response, mockNext);

        expect(mockConversationService.getAgentStats).toHaveBeenCalledWith(agentId);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });
  });
});
