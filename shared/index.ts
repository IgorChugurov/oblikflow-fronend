// i18n exports
export * from "./lib/i18n/config";
export { LanguageSwitcher } from "./components/LanguageSwitcher";

// Components exports
export { default as AdminNavbar } from "./components/AdminNavbar";

// Navigation exports
export {
  getSiteUrl,
  getAdminUrl,
  getWorkspaceUrl,
  getPlatformUrl,
  navigateToSite,
  navigateToAdmin,
  navigateToWorkspace,
  navigateToPlatform,
} from "./lib/navigation";

// Supabase exports (use auth-sdk instead)
// NOTE: Supabase client should be imported from auth-sdk (client only):
// Client: import { createBrowserSupabaseClient } from "shared/auth-sdk/client";

// API exports
export {
  httpClient,
  HttpClient,
  fetchLocales,
  fetchLocalesWithFallback,
  type LocaleDto,
  type LocalesResponse,
  type ApiResult,
  type ApiError,
  ErrorCode,
} from "./lib/api";

// UI exports
export { Button } from "./components/ui/button";
export { Input } from "./components/ui/input";
export { Label } from "./components/ui/label";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/ui/card";
export { Toaster } from "./components/ui/toaster";
export { useToast } from "./hooks/use-toast";

// Auth SDK components exports
export { LoginForm } from "./auth-sdk/components/LoginForm";
export { SignUpForm } from "./auth-sdk/components/SignUpForm";
export { ResetPasswordForm } from "./auth-sdk/components/ResetPasswordForm";
export { UpdatePasswordForm } from "./auth-sdk/components/UpdatePasswordForm";
export { OAuthButtons } from "./auth-sdk/components/OAuthButtons";
export { ResetPasswordClient } from "./auth-sdk/components/ResetPasswordClient";

// Providers
export { ThemeProvider } from "./providers/ThemeProvider";
export { QueryProvider } from "./providers/QueryProvider";
export type { ThemeProviderProps } from "next-themes";

// Auth SDK hooks and providers
export { useAuth } from "./providers/AuthProvider";
export { AuthProvider } from "./providers/AuthProvider";

// Auth SDK client exports
export {
  createBrowserSupabaseClient,
  createClientAuthClient,
} from "./auth-sdk/client";

// Auth SDK types
export type {
  User,
  AuthState,
  LoginCredentials,
  SignUpData,
} from "./auth-sdk/types";

// Types exports
export * from "./types";

// API SDK exports
export * from "./api/sdk";

// API Hooks exports
export * from "./api/hooks";

// API Types exports (for convenience)
export type {
  Enterprise,
  Member,
  CreateEnterpriseDto,
  UpdateEnterpriseDto,
  AddMemberDto,
  LocaleEntity,
  Currency,
  Country,
  EnterpriseListResponse,
  EnterpriseDetailsResponse,
  MemberListResponse,
  LocaleListResponse,
  CurrencyListResponse,
  CountryListResponse,
} from "./types/enterprises";

// ============================================================================
// LISTS AND FORMS
// ============================================================================

// Universal List
export * from './listsAndForms/universal-list';
export * from './listsAndForms/types';

// Form Generation
export * from './listsAndForms/form-generation';
