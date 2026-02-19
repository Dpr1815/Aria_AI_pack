export interface OrganizationMemberDTO {
  userId: string;
  email: string;
  role: string;
  addedAt: string;
  updatedAt?: string;
}

export interface OrganizationDTO {
  _id: string;
  name: string;
  logoUrl?: string;
  creatorId: string;
  members: OrganizationMemberDTO[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
