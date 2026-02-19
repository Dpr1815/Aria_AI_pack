import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '../services/organization.service';
import { ApiResponseBuilder } from '../utils/response';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  AddMemberInput,
  UpdateMemberRoleInput,
} from '@validations';

export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: CreateOrganizationInput = req.body;
      const organization = await this.organizationService.createOrganization(req.user!._id, input);

      res
        .status(201)
        .json(ApiResponseBuilder.created(organization, 'Organization created successfully'));
    } catch (error) {
      next(error);
    }
  };

  getMyOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organization = await this.organizationService.getUserOrganization(req.user!._id);

      res.status(200).json(ApiResponseBuilder.success(organization));
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organization = await this.organizationService.getOrganizationById(
        req.params.id,
        req.user!._id
      );

      res.status(200).json(ApiResponseBuilder.success(organization));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: UpdateOrganizationInput = req.body;
      const organization = await this.organizationService.updateOrganization(
        req.params.id,
        req.user!._id,
        input
      );

      res
        .status(200)
        .json(ApiResponseBuilder.success(organization, 'Organization updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: AddMemberInput = req.body;
      const organization = await this.organizationService.addMember(
        req.params.id,
        req.user!._id,
        input
      );

      res.status(201).json(ApiResponseBuilder.created(organization, 'Member added successfully'));
    } catch (error) {
      next(error);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organization = await this.organizationService.removeMember(
        req.params.id,
        req.user!._id,
        req.params.memberId
      );

      res.status(200).json(ApiResponseBuilder.success(organization, 'Member removed successfully'));
    } catch (error) {
      next(error);
    }
  };

  updateMemberRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: UpdateMemberRoleInput = req.body;
      const organization = await this.organizationService.updateMemberRole(
        req.params.id,
        req.user!._id,
        req.params.memberId,
        input
      );

      res
        .status(200)
        .json(ApiResponseBuilder.success(organization, 'Member role updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  leave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.organizationService.leaveOrganization(req.params.id, req.user!._id);

      res.status(200).json(ApiResponseBuilder.deleted('Successfully left the organization'));
    } catch (error) {
      next(error);
    }
  };
}
