import { ObjectId } from 'mongodb';
import { OrganizationRepository } from '../repositories/organization.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  OrganizationDocument,
  OrganizationMember,
} from '../models/documents/organization.document';
import { OrganizationDTO } from '@models';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  AddMemberInput,
  UpdateMemberRoleInput,
} from '../validations/organization.validation';
import { Role, RoleHierarchy, PlanConfig } from '../constants';
import { ConflictError, ForbiddenError, NotFoundError, createLogger, toObjectId } from '@utils';

const logger = createLogger('OrganizationService');

export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository
  ) {}

  // ============================================
  // CONTROLLER-FACING OPERATIONS (→ DTOs)
  // ============================================

  async createOrganization(
    creatorId: ObjectId,
    input: CreateOrganizationInput
  ): Promise<OrganizationDTO> {
    const creator = await this.userRepository.findByIdOrThrow(creatorId, 'User');

    if (creator.organizationId) {
      throw new ConflictError('User already belongs to an organization');
    }

    const existingOrg = await this.organizationRepository.findByCreatorId(creatorId);
    if (existingOrg) {
      throw new ConflictError('User has already created an organization');
    }

    const organization = await this.organizationRepository.create({
      name: input.name,
      ...(input.logoUrl && { logoUrl: input.logoUrl }),
      creatorId,
      members: [
        {
          userId: creatorId,
          email: creator.email,
          role: Role.ADMIN,
          addedAt: new Date(),
        },
      ],
      active: true,
    } as OrganizationDocument);

    await this.userRepository.setOrganization(creatorId, organization._id);

    logger.info('Organization created', {
      organizationId: organization._id.toString(),
      creatorId: creatorId.toString(),
    });

    return this.toResponse(organization);
  }

  async getOrganizationById(
    organizationId: string | ObjectId,
    requesterId: ObjectId
  ): Promise<OrganizationDTO> {
    const organization = await this.organizationRepository.findByIdOrThrow(
      organizationId,
      'Organization'
    );

    const isMember = organization.members.some((m) => m.userId.equals(requesterId));
    if (!isMember) {
      throw new ForbiddenError('You are not a member of this organization');
    }

    return this.toResponse(organization);
  }

  async getUserOrganization(userId: ObjectId): Promise<OrganizationDTO> {
    const organization = await this.organizationRepository.findByMemberId(userId);
    if (!organization) {
      throw new NotFoundError('Organization for user');
    }
    return this.toResponse(organization);
  }

  async updateOrganization(
    organizationId: string | ObjectId,
    requesterId: ObjectId,
    input: UpdateOrganizationInput
  ): Promise<OrganizationDTO> {
    const objectId = toObjectId(organizationId);
    const organization = await this.organizationRepository.findByIdOrThrow(
      objectId,
      'Organization'
    );

    await this.requireRole(organization, requesterId, Role.ADMIN);

    const updated = await this.organizationRepository.updateByIdOrThrow(
      objectId,
      input,
      'Organization'
    );

    logger.info('Organization updated', {
      organizationId: updated._id.toString(),
      updatedBy: requesterId.toString(),
    });

    return this.toResponse(updated);
  }

  async addMember(
    organizationId: string | ObjectId,
    requesterId: ObjectId,
    input: AddMemberInput
  ): Promise<OrganizationDTO> {
    const objectId = toObjectId(organizationId);
    const organization = await this.organizationRepository.findByIdOrThrow(
      objectId,
      'Organization'
    );

    await this.requireRole(organization, requesterId, Role.ADMIN);

    const creator = await this.userRepository.findByIdOrThrow(
      organization.creatorId,
      'Organization creator'
    );
    const planLimits = PlanConfig[creator.planId];

    if (organization.members.length >= planLimits.seats) {
      throw new ForbiddenError(
        `Organization has reached maximum seats (${planLimits.seats}) for current plan`
      );
    }

    const userToAdd = await this.userRepository.findByEmail(input.email);
    if (!userToAdd) {
      throw new NotFoundError('User', input.email);
    }

    if (userToAdd.organizationId) {
      throw new ConflictError('User already belongs to an organization');
    }

    const existingMember = organization.members.find((m) => m.userId.equals(userToAdd._id));
    if (existingMember) {
      throw new ConflictError('User is already a member of this organization');
    }

    const newMember: OrganizationMember = {
      userId: userToAdd._id,
      email: userToAdd.email,
      role: input.role,
      addedAt: new Date(),
    };

    const updated = await this.organizationRepository.addMember(organization._id, newMember);
    if (!updated) {
      throw new NotFoundError('Organization', objectId.toString());
    }

    await this.userRepository.setOrganization(userToAdd._id, organization._id);

    logger.info('Member added to organization', {
      organizationId: organization._id.toString(),
      memberId: userToAdd._id.toString(),
      addedBy: requesterId.toString(),
    });

    return this.toResponse(updated);
  }

  async removeMember(
    organizationId: string | ObjectId,
    requesterId: ObjectId,
    memberUserId: string | ObjectId
  ): Promise<OrganizationDTO> {
    const objectId = toObjectId(organizationId);
    const memberObjectId = toObjectId(memberUserId);

    const organization = await this.organizationRepository.findByIdOrThrow(
      objectId,
      'Organization'
    );

    await this.requireRole(organization, requesterId, Role.ADMIN);

    if (organization.creatorId.equals(memberObjectId)) {
      throw new ForbiddenError('Cannot remove the organization creator');
    }

    const member = organization.members.find((m) => m.userId.equals(memberObjectId));
    if (!member) {
      throw new NotFoundError('Member in organization');
    }

    const updated = await this.organizationRepository.removeMember(
      organization._id,
      memberObjectId
    );
    if (!updated) {
      throw new NotFoundError('Organization', objectId.toString());
    }

    await this.userRepository.setOrganization(memberObjectId, null);

    logger.info('Member removed from organization', {
      organizationId: organization._id.toString(),
      memberId: memberObjectId.toString(),
      removedBy: requesterId.toString(),
    });

    return this.toResponse(updated);
  }

  async updateMemberRole(
    organizationId: string | ObjectId,
    requesterId: ObjectId,
    memberUserId: string | ObjectId,
    input: UpdateMemberRoleInput
  ): Promise<OrganizationDTO> {
    const objectId = toObjectId(organizationId);
    const memberObjectId = toObjectId(memberUserId);

    const organization = await this.organizationRepository.findByIdOrThrow(
      objectId,
      'Organization'
    );

    await this.requireRole(organization, requesterId, Role.ADMIN);

    if (organization.creatorId.equals(memberObjectId)) {
      throw new ForbiddenError('Cannot change the role of the organization creator');
    }

    const member = organization.members.find((m) => m.userId.equals(memberObjectId));
    if (!member) {
      throw new NotFoundError('Member in organization');
    }

    const updated = await this.organizationRepository.updateMemberRole(
      organization._id,
      memberObjectId,
      input.role
    );
    if (!updated) {
      throw new NotFoundError('Organization', objectId.toString());
    }

    logger.info('Member role updated', {
      organizationId: organization._id.toString(),
      memberId: memberObjectId.toString(),
      newRole: input.role,
      updatedBy: requesterId.toString(),
    });

    return this.toResponse(updated);
  }

  async leaveOrganization(organizationId: string | ObjectId, userId: ObjectId): Promise<void> {
    const objectId = toObjectId(organizationId);
    const organization = await this.organizationRepository.findByIdOrThrow(
      objectId,
      'Organization'
    );

    if (organization.creatorId.equals(userId)) {
      throw new ForbiddenError(
        'Organization creator cannot leave. Transfer ownership or delete the organization.'
      );
    }

    const member = organization.members.find((m) => m.userId.equals(userId));
    if (!member) {
      throw new NotFoundError('Member in organization');
    }

    await this.organizationRepository.removeMember(organization._id, userId);
    await this.userRepository.setOrganization(userId, null);

    logger.info('Member left organization', {
      organizationId: organization._id.toString(),
      memberId: userId.toString(),
    });
  }

  // ============================================
  // INTERNAL OPERATIONS (Service-to-service → Documents)
  // ============================================

  /**
   * Get organization document by user ID
   * Used internally by other services that need the raw document.
   */
  async getOrganizationByUserId(userId: ObjectId): Promise<OrganizationDocument | null> {
    return this.organizationRepository.findByMemberId(userId);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async requireRole(
    organization: OrganizationDocument,
    userId: ObjectId,
    requiredRole: Role
  ): Promise<void> {
    const member = organization.members.find((m) => m.userId.equals(userId));
    if (!member) {
      throw new ForbiddenError('You are not a member of this organization');
    }

    if (RoleHierarchy[member.role] < RoleHierarchy[requiredRole]) {
      throw new ForbiddenError(`Requires ${requiredRole} role or higher`);
    }
  }

  // ============================================
  // RESPONSE TRANSFORMERS (private)
  // ============================================

  private toResponse(organization: OrganizationDocument): OrganizationDTO {
    return {
      _id: organization._id.toString(),
      name: organization.name,
      logoUrl: organization.logoUrl,
      creatorId: organization.creatorId.toString(),
      members: organization.members.map((m) => ({
        userId: m.userId.toString(),
        email: m.email,
        role: m.role,
        addedAt: m.addedAt.toISOString(),
        updatedAt: m.updatedAt?.toISOString(),
      })),
      active: organization.active,
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString(),
    };
  }
}
