import { Request, Response, NextFunction } from 'express';
import { StatisticsService } from '../services/statistics.service';
import { ApiResponseBuilder } from '../utils/response';

export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  getAgentStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const statistics = await this.statisticsService.getAgentStatistics(req.params.agentId);

      res.status(200).json(ApiResponseBuilder.success(statistics));
    } catch (error) {
      next(error);
    }
  };

  calculateAgentStatistics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const statistics = await this.statisticsService.calculateAgentStatistics(req.params.agentId);

      res
        .status(200)
        .json(ApiResponseBuilder.success(statistics, 'Statistics calculated successfully'));
    } catch (error) {
      next(error);
    }
  };

  deleteAgentStatistics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.statisticsService.deleteAgentStatistics(req.params.agentId);

      res.status(200).json(ApiResponseBuilder.deleted('Agent statistics deleted successfully'));
    } catch (error) {
      next(error);
    }
  };
}
