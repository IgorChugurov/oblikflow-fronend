/**
 * Common types shared across all applications
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AuthSession {
  user: User;
  token: AuthToken;
}
