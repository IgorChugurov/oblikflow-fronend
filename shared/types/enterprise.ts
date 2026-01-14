/**
 * Enterprise-related типы
 */

// Базовая структура предприятия
export interface Enterprise {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

// Предприятие с ролью пользователя
export interface EnterpriseWithRole extends Enterprise {
  role: "owner" | "admin";
  is_owner: boolean;
}

// Член предприятия
export interface Member {
  user_id: string;
  email: string;
  role: "owner" | "admin";
  is_owner: boolean;
  created_at: string;
}

// Контекст предприятия (для EnterpriseProvider)
export interface EnterpriseContext {
  enterprise: Enterprise | null;
  isLoading: boolean;
  error: Error | null;
  setEnterpriseId: (id: string) => void;
  refetch: () => void;
}
