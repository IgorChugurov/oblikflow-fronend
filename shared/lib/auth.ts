/**
 * Authentication utilities shared across all applications
 *
 * This module handles JWT/cookie-based authentication that works
 * across all subdomains
 */

import type { User, AuthSession, AuthToken } from "../types";

// Cookie name for authentication token
const AUTH_TOKEN_COOKIE = "auth_token";
const AUTH_REFRESH_COOKIE = "auth_refresh_token";

/**
 * Set authentication cookies
 *
 * IMPORTANT: Cookies work differently in dev vs production:
 *
 * Production:
 * - Cookies with domain=.yourdomain.com work across all subdomains
 * - Requires HTTPS and SameSite=None; Secure
 *
 * Development (localhost):
 * - Cookies with domain don't work for localhost subdomains
 * - We use localStorage as fallback for dev mode
 * - In production, cookies are primary, localStorage is backup
 */
export const setAuthCookies = (session: AuthSession): void => {
  if (typeof document === "undefined") return;

  const domain =
    (typeof process !== "undefined" &&
      process.env?.NEXT_PUBLIC_COOKIE_DOMAIN) ||
    "";
  const isProduction =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname.includes(".localhost"));

  // Store in localStorage first (works everywhere, including dev)
  if (typeof window !== "undefined") {
    localStorage.setItem("user", JSON.stringify(session.user));
    localStorage.setItem(AUTH_TOKEN_COOKIE, session.token.accessToken);
    if (session.token.refreshToken) {
      localStorage.setItem(AUTH_REFRESH_COOKIE, session.token.refreshToken);
    }
  }

  // For production: set cookies with domain for cross-subdomain sharing
  if (isProduction && domain && !isLocalhost) {
    // Production: use domain cookie for cross-subdomain access
    const cookieDomain = domain.startsWith(".") ? domain : `.${domain}`;

    // Set access token cookie
    document.cookie = `${AUTH_TOKEN_COOKIE}=${
      session.token.accessToken
    }; path=/; domain=${cookieDomain}; SameSite=None; Secure; ${
      session.token.expiresIn ? `max-age=${session.token.expiresIn};` : ""
    }`;

    // Set refresh token cookie if available
    if (session.token.refreshToken) {
      document.cookie = `${AUTH_REFRESH_COOKIE}=${session.token.refreshToken}; path=/; domain=${cookieDomain}; SameSite=None; Secure;`;
    }
  } else if (!isLocalhost && domain) {
    // Development with custom domain (e.g., local.yourdomain.com)
    const cookieDomain = domain.startsWith(".") ? domain : `.${domain}`;
    document.cookie = `${AUTH_TOKEN_COOKIE}=${
      session.token.accessToken
    }; path=/; domain=${cookieDomain}; ${
      session.token.expiresIn ? `max-age=${session.token.expiresIn};` : ""
    }`;

    if (session.token.refreshToken) {
      document.cookie = `${AUTH_REFRESH_COOKIE}=${session.token.refreshToken}; path=/; domain=${cookieDomain};`;
    }
  } else {
    // Localhost dev mode: cookies without domain (won't share, but localStorage will)
    // This is fine for dev - localStorage is the primary storage here
    document.cookie = `${AUTH_TOKEN_COOKIE}=${
      session.token.accessToken
    }; path=/; ${
      session.token.expiresIn ? `max-age=${session.token.expiresIn};` : ""
    }`;

    if (session.token.refreshToken) {
      document.cookie = `${AUTH_REFRESH_COOKIE}=${session.token.refreshToken}; path=/;`;
    }
  }
};

/**
 * Get authentication token from cookies or localStorage
 *
 * Priority:
 * 1. Cookie (production, works across subdomains)
 * 2. localStorage (dev mode fallback, works on same origin)
 */
export const getAuthToken = (): string | null => {
  // Try cookies first (production)
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(";");
    const tokenCookie = cookies.find((cookie) =>
      cookie.trim().startsWith(`${AUTH_TOKEN_COOKIE}=`)
    );

    if (tokenCookie) {
      const token = tokenCookie.split("=")[1]?.trim();
      if (token) return token;
    }
  }

  // Fallback to localStorage (dev mode or if cookies unavailable)
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(AUTH_TOKEN_COOKIE);
    if (token) return token;
  }

  return null;
};

/**
 * Get refresh token from cookies or localStorage
 */
export const getRefreshToken = (): string | null => {
  // Try cookies first (production)
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(";");
    const refreshCookie = cookies.find((cookie) =>
      cookie.trim().startsWith(`${AUTH_REFRESH_COOKIE}=`)
    );

    if (refreshCookie) {
      const token = refreshCookie.split("=")[1]?.trim();
      if (token) return token;
    }
  }

  // Fallback to localStorage (dev mode)
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(AUTH_REFRESH_COOKIE);
    if (token) return token;
  }

  return null;
};

/**
 * Get current user from localStorage
 */
export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;

  const userStr = localStorage.getItem("user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

/**
 * Clear authentication (logout)
 * Clears both cookies and localStorage
 */
export const clearAuth = (): void => {
  const domain =
    (typeof process !== "undefined" &&
      process.env?.NEXT_PUBLIC_COOKIE_DOMAIN) ||
    "";
  const isProduction =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production";

  // Clear cookies
  if (typeof document !== "undefined") {
    if (domain && !domain.includes("localhost")) {
      // Production: clear with domain
      const cookieDomain = domain.startsWith(".") ? domain : `.${domain}`;
      document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${cookieDomain}; ${
        isProduction ? "SameSite=None; Secure;" : ""
      }`;
      document.cookie = `${AUTH_REFRESH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${cookieDomain}; ${
        isProduction ? "SameSite=None; Secure;" : ""
      }`;
    } else {
      // Localhost or no domain: clear without domain
      document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      document.cookie = `${AUTH_REFRESH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
    }
  }

  // Clear localStorage (works everywhere)
  if (typeof window !== "undefined") {
    localStorage.removeItem("user");
    localStorage.removeItem(AUTH_TOKEN_COOKIE);
    localStorage.removeItem(AUTH_REFRESH_COOKIE);
  }
};

/**
 * Get authorization header for API requests
 */
export const getAuthHeader = (): { Authorization: string } | {} => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
