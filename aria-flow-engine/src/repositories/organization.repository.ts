import { ObjectId } from "mongodb";
import { BaseRepository } from "./base.repository";
import {
  OrganizationDocument,
  OrganizationMember,
} from "../models/documents/organization.document";
import { IDatabase } from "../connectors/database/IDatabase";
import { Role } from "../constants";

const COLLECTION_NAME = "organizations";

export class OrganizationRepository extends BaseRepository<OrganizationDocument> {
  constructor(db: IDatabase) {
    super(db, COLLECTION_NAME);
  }

  async findByCreatorId(
    creatorId: ObjectId,
  ): Promise<OrganizationDocument | null> {
    return this.findOne({ creatorId });
  }

  async findByMemberId(userId: ObjectId): Promise<OrganizationDocument | null> {
    return this.findOne({ "members.userId": userId });
  }

  async findMemberByUserId(
    organizationId: ObjectId,
    userId: ObjectId,
  ): Promise<OrganizationMember | null> {
    const org = await this.findById(organizationId);
    if (!org) return null;
    return org.members.find((m) => m.userId.equals(userId)) || null;
  }

  async addMember(
    organizationId: ObjectId,
    member: OrganizationMember,
  ): Promise<OrganizationDocument | null> {
    return this.updateById(organizationId, {
      $push: { members: member },
    } as any);
  }

  async removeMember(
    organizationId: ObjectId,
    userId: ObjectId,
  ): Promise<OrganizationDocument | null> {
    return this.updateById(organizationId, {
      $pull: { members: { userId } },
    } as any);
  }

  async updateMemberRole(
    organizationId: ObjectId,
    userId: ObjectId,
    role: Role,
  ): Promise<OrganizationDocument | null> {
    const collection = this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: organizationId, "members.userId": userId },
      {
        $set: {
          "members.$.role": role,
          "members.$.updatedAt": new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    return result;
  }

  async countMembers(organizationId: ObjectId): Promise<number> {
    const org = await this.findById(organizationId);
    return org ? org.members.length : 0;
  }

  async isMember(organizationId: ObjectId, userId: ObjectId): Promise<boolean> {
    const member = await this.findMemberByUserId(organizationId, userId);
    return member !== null;
  }

  async getMemberRole(
    organizationId: ObjectId,
    userId: ObjectId,
  ): Promise<Role | null> {
    const member = await this.findMemberByUserId(organizationId, userId);
    return member ? member.role : null;
  }

  async createIndexes(): Promise<void> {
    const collection = this.getCollection();
    await collection.createIndex({ creatorId: 1 });
    await collection.createIndex({ "members.userId": 1 });
  }
}
