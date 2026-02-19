/**
 * User DTO - public user data
 */
export interface UserDTO {
  _id: string;
  email: string;
  name: string;
  companyName?: string;
  organizationId?: string;
  planId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Token pair DTO
 */
export interface TokenPairDTO {
  accessToken: string;
  refreshToken: string;
}

/**
 * Auth response DTO - returned on signup, login, password change
 */
export interface AuthResponseDTO {
  user: UserDTO;
  accessToken: string;
  refreshToken: string;
}
