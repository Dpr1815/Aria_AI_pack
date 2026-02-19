import { Request, Response, NextFunction } from 'express';

import {
  AgentService,
  AgentGeneratorService,
  SessionService,
  ParticipantService,
  ConversationService,
} from '@services';
import { ApiResponseBuilder } from '../utils/response';
import {
  CreateAgentInput,
  UpdateAgentInput,
  AgentQueryInput,
  GenerateAgentInput,
  UpdateStepInput,
  AddStepInput,
  UpdatePromptInput,
  UpdateAssessmentInput,
  AgentGetByIdQuery,
  parseIncludeQuery,
  SessionQueryInput,
  AgentParticipantsQueryInput,
} from '@validations';

export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly agentGeneratorService: AgentGeneratorService,
    private readonly sessionService: SessionService,
    private readonly participantService: ParticipantService,
    private readonly conversationService: ConversationService
  ) {}

  // ============================================
  // AGENT CRUD
  // ============================================

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: CreateAgentInput = req.body;
      const fullAgent = await this.agentService.createAgent(req.tenant!, input);

      res.status(201).json(ApiResponseBuilder.created(fullAgent, 'Agent created successfully'));
    } catch (error) {
      next(error);
    }
  };

  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: GenerateAgentInput = req.body;
      const fullAgent = await this.agentGeneratorService.generateAgent(req.tenant!, input);

      res.status(201).json(ApiResponseBuilder.created(fullAgent, 'Agent generated successfully'));
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: AgentQueryInput = req.query as unknown as AgentQueryInput;
      const result = await this.agentService.listAgents(req.tenant!, query);

      res
        .status(200)
        .json(ApiResponseBuilder.paginated(result.data, result.page, result.limit, result.total));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /agents/:id
   *
   * Supports sparse fieldsets via `include` query parameter:
   * - ?include=steps         → Include steps only
   * - ?include=prompts       → Include prompts only
   * - ?include=steps,prompts → Include steps and prompts
   * - ?include=all           → Include everything (steps, prompts, assessment)
   * - ?include=all&collapse=true → Include everything (steps, prompts, assessment) but collapse step
   * - (no param)             → Agent metadata only (fastest)
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as AgentGetByIdQuery;
      const options = parseIncludeQuery(query.include || [], query.collapse);
      const agentResponse = await this.agentService.getAgent(req.params.id, options);

      res.status(200).json(ApiResponseBuilder.success(agentResponse));
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /agents/:id/public
   * Returns only the public-safe agent metadata.
   */
  getPublicProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentProfile = await this.agentService.getAgentPublicProfile(req.params.id);
      res.status(200).json(ApiResponseBuilder.success(agentProfile));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: UpdateAgentInput = req.body;
      const fullAgent = await this.agentService.updateAgent(req.params.id, input);

      res.status(200).json(ApiResponseBuilder.success(fullAgent, 'Agent updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.agentService.deleteAgent(req.params.id);

      res.status(200).json(ApiResponseBuilder.deleted('Agent deleted successfully'));
    } catch (error) {
      next(error);
    }
  };

  activate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fullAgent = await this.agentService.activateAgent(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(fullAgent, 'Agent activated successfully'));
    } catch (error) {
      next(error);
    }
  };

  deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fullAgent = await this.agentService.deactivateAgent(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(fullAgent, 'Agent deactivated successfully'));
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // STEP ROUTES
  // ============================================

  listSteps = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const steps = await this.agentService.getAgentSteps(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(steps));
    } catch (error) {
      next(error);
    }
  };

  getStep = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const step = await this.agentService.getAgentStep(req.params.id, req.params.key);

      res.status(200).json(ApiResponseBuilder.success(step));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /agents/:id/steps/:key
   * Updates step and recompiles prompt if inputs changed
   */
  updateStep = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: UpdateStepInput = req.body;
      const { step, promptRecompiled } = await this.agentService.updateAgentStep(
        req.params.id,
        req.params.key,
        input
      );

      const message = promptRecompiled
        ? 'Step updated and prompt recompiled'
        : 'Step updated successfully';

      res.status(200).json(ApiResponseBuilder.success(step, message));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /agents/:id/steps
   * Add a new step to an agent
   */
  addStep = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: AddStepInput = req.body;
      const step = await this.agentService.addAgentStep(req.params.id, input);

      res.status(201).json(ApiResponseBuilder.created(step, 'Step added successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /agents/:id/steps/:key
   * Remove a step from an agent
   */
  removeStep = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.agentService.removeAgentStep(req.params.id, req.params.key);

      res.status(200).json(ApiResponseBuilder.deleted('Step removed successfully'));
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // PROMPT ROUTES
  // ============================================

  listPrompts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const prompts = await this.agentService.getAgentPrompts(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(prompts));
    } catch (error) {
      next(error);
    }
  };

  getPrompt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const prompt = await this.agentService.getAgentPrompt(req.params.id, req.params.key);

      res.status(200).json(ApiResponseBuilder.success(prompt));
    } catch (error) {
      next(error);
    }
  };

  updatePrompt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: UpdatePromptInput = req.body;
      const prompt = await this.agentService.updateAgentPrompt(
        req.params.id,
        req.params.key,
        input
      );

      res.status(200).json(ApiResponseBuilder.success(prompt, 'Prompt updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // ASSESSMENT ROUTES
  // ============================================

  getAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assessment = await this.agentService.getAgentAssessment(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(assessment));
    } catch (error) {
      next(error);
    }
  };

  updateAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: UpdateAssessmentInput = req.body;
      const assessment = await this.agentService.updateAgentAssessment(req.params.id, input);

      res
        .status(200)
        .json(ApiResponseBuilder.success(assessment, 'Assessment updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // SESSION ROUTES
  // ============================================

  /**
   * GET /agents/:id/sessions
   * List sessions for this agent with participant info
   */
  listSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as SessionQueryInput;
      const result = await this.sessionService.listByAgent(req.params.id, query);

      res
        .status(200)
        .json(ApiResponseBuilder.paginated(result.data, result.page, result.limit, result.total));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /agents/:id/sessions/stats
   * Get session statistics for this agent
   */
  getSessionStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.sessionService.getAgentStats(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(stats));
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // PARTICIPANT ROUTES
  // ============================================

  /**
   * GET /agents/:id/participants
   * List participants who have sessions with this agent
   */
  listParticipants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as AgentParticipantsQueryInput;
      const result = await this.participantService.listByAgent(req.params.id, query);

      res
        .status(200)
        .json(ApiResponseBuilder.paginated(result.data, result.page, result.limit, result.total));
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // CONVERSATION ROUTES
  // ============================================

  /**
   * GET /agents/:id/conversations/stats
   * Get conversation statistics for this agent
   */
  getConversationStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.conversationService.getAgentStats(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(stats));
    } catch (error) {
      next(error);
    }
  };
}
