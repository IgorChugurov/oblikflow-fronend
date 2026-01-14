/**
 * API Request/Response типы для NestJS Backend
 */

// ============================================
// ENTERPRISE TYPES
// ============================================

export interface Enterprise {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseWithRole extends Enterprise {
  role: "owner" | "admin";
  is_owner: boolean;
}

export interface CreateEnterpriseRequest {
  name: string;
}

export interface UpdateEnterpriseRequest {
  name?: string;
}

// ============================================
// MEMBER TYPES
// ============================================

export interface Member {
  user_id: string;
  email: string;
  role: "owner" | "admin";
  is_owner: boolean;
  created_at: string;
}

export interface AddMemberRequest {
  email: string;
  role: "admin"; // Только admin можно добавлять
}

// ============================================
// API RESPONSE WRAPPERS
// ============================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// ============================================
// PAGINATION
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
