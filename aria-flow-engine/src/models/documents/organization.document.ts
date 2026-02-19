import { ObjectId } from "mongodb";
import { Role } from "../../constants";

export interface OrganizationMember {
  userId: ObjectId;
  email: string;
  role: Role;
  addedAt: Date;
  updatedAt?: Date;
}

export interface OrganizationDocument {
  _id: ObjectId;
  name: string;
  logoUrl?: string;
  creatorId: ObjectId;
  members: OrganizationMember[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
