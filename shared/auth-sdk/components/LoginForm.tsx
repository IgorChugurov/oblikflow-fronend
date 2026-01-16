/**
 * Форма входа
 */

"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { LoginCredentials, OAuthProviderType } from "../types";
import { OAuthButtons } from "./OAuthButtons";

interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  onOAuthLogin: (provider: OAuthProviderType) => Promise<void>;
  onResetPassword?: (email: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  showOAuth?: boolean;
  showSignUpLink?: boolean;
  signUpLinkHref?: string;
  showResetPasswordLink?: boolean;
  resetPasswordLinkHref?: string;
  className?: string;
}

export function LoginForm({
  onLogin,
  onOAuthLogin,
  onResetPassword,
  isLoading = false,
  error: externalError,
  showOAuth = true,
  showSignUpLink = true,
  signUpLinkHref = "/signup",
  showResetPasswordLink = true,
  resetPasswordLinkHref = "/reset-password",
  className = "",
}: LoginFormProps) {
  const t = useTranslations("auth.login");
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  const displayError = externalError || error;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await onLogin(credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loginFailed"));
    }
  };

  const handleInputChange =
    (field: keyof LoginCredentials) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  return (
    <div className={`space-y-8 ${className}`}>
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          {t("title")}
        </h2>
        {showSignUpLink && (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <a
              href={signUpLinkHref}
              className="font-medium text-primary hover:text-primary/80"
            >
              {t("signUp")}
            </a>
          </p>
        )}
      </div>

      {showOAuth && (
        <>
          <OAuthButtons onOAuthClick={onOAuthLogin} isLoading={isLoading} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("orContinueWith")}
              </span>
            </div>
          </div>
        </>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              {t("email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={credentials.email}
              onChange={handleInputChange("email")}
              className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              placeholder={t("emailPlaceholder")}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                {t("password")}
              </label>
              {showResetPasswordLink && (
                <a
                  href={resetPasswordLinkHref}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  {t("forgotPassword")}
                </a>
              )}
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={credentials.password}
              onChange={handleInputChange("password")}
              className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              placeholder={t("passwordPlaceholder")}
            />
          </div>
        </div>

        {displayError && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-md">
            {displayError}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t("submitting") : t("submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
