/**
 * API клиент для запросов к NestJS Backend
 * Автоматически добавляет JWT и X-Enterprise-ID headers
 */

import { createClient as createSupabaseClient } from "../supabase/client";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Получить JWT токен из Supabase
   */
  private async getToken(): Promise<string | null> {
    const supabase = createSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Получить текущий Enterprise ID из cookie/localStorage
   */
  private getCurrentEnterpriseId(): string | null {
    if (typeof window === "undefined") return null;

    // Production: cookie
    if (process.env.NODE_ENV === "production") {
      const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("current_enterprise_id="));
      return cookie ? cookie.split("=")[1] : null;
    }

    // Development: localStorage
    return localStorage.getItem("current_enterprise_id");
  }

  /**
   * Выполнить API запрос
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeEnterpriseId: boolean = false
  ): Promise<T> {
    const token = await this.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Добавить JWT токен
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Добавить Enterprise ID (опционально)
    if (includeEnterpriseId) {
      const enterpriseId = this.getCurrentEnterpriseId();
      if (enterpriseId) {
        headers["X-Enterprise-ID"] = enterpriseId;
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Convenience methods
  async get<T>(endpoint: string, includeEnterpriseId = false): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" }, includeEnterpriseId);
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    includeEnterpriseId = false
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      },
      includeEnterpriseId
    );
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    includeEnterpriseId = false
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PATCH",
        body: data ? JSON.stringify(data) : undefined,
      },
      includeEnterpriseId
    );
  }

  async delete<T>(endpoint: string, includeEnterpriseId = false): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" }, includeEnterpriseId);
  }
}

// Singleton instance
export const apiClient = new ApiClient();
