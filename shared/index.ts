// i18n exports
export * from "./lib/i18n/config";
export { LanguageSwitcher } from "./components/LanguageSwitcher";

// Supabase exports
export { createClient as createSupabaseClient } from "./lib/supabase/client";
export { createClient as createSupabaseServerClient } from "./lib/supabase/server";
export { updateSession } from "./lib/supabase/middleware";

// API exports
export { apiClient, ApiClient } from "./lib/api/client";

// Types exports
export * from "./types";
