/**
 * Auth-related типы
 */

import type {
  User as SupabaseUser,
  Session as SupabaseSession,
} from "@supabase/supabase-js";

// Используем типы из Supabase
export type User = SupabaseUser;
export type Session = SupabaseSession;

// Auth состояние приложения
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Credentials для логина
export interface LoginCredentials {
  email: string;
  password: string;
}

// Данные для регистрации
export interface SignupData {
  email: string;
  password: string;
}

// Данные для сброса пароля
export interface ResetPasswordData {
  email: string;
}

// Данные для обновления пароля
export interface UpdatePasswordData {
  password: string;
}
