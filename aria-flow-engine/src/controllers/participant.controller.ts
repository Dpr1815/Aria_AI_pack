import { Request, Response, NextFunction } from 'express';
import { ParticipantService } from '../services/participant.service';
import { ApiResponseBuilder } from '../utils/response';
import {
  UpdateParticipantInput,
  ParticipantQueryInput,
} from '../validations/participant.validation';

export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ParticipantQueryInput;
      const result = await this.participantService.list(req.tenantAgentIds!, query);

      res
        .status(200)
        .json(ApiResponseBuilder.paginated(result.data, result.page, result.limit, result.total));
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const participant = await this.participantService.getById(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(participant));
    } catch (error) {
      next(error);
    }
  };

  getByEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const participant = await this.participantService.getByEmail(req.params.email);

      res.status(200).json(ApiResponseBuilder.success(participant));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: UpdateParticipantInput = req.body;
      const participant = await this.participantService.update(req.params.id, input);

      res
        .status(200)
        .json(ApiResponseBuilder.success(participant, 'Participant updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.participantService.delete(req.params.id);

      res
        .status(200)
        .json(
          ApiResponseBuilder.success(
            { sessionsDeleted: result.sessionsDeleted },
            'Participant and associated sessions deleted successfully'
          )
        );
    } catch (error) {
      next(error);
    }
  };
}
