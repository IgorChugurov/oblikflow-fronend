/**
 * Форма регистрации
 */

"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { SignUpData, OAuthProviderType } from "../types";
import { OAuthButtons } from "./OAuthButtons";

interface SignUpFormProps {
  onSignUp: (data: SignUpData) => Promise<void>;
  onOAuthSignUp: (provider: OAuthProviderType) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  showOAuth?: boolean;
  showLoginLink?: boolean;
  loginLinkHref?: string;
  className?: string;
}

export function SignUpForm({
  onSignUp,
  onOAuthSignUp,
  isLoading = false,
  error: externalError,
  showOAuth = true,
  showLoginLink = true,
  loginLinkHref = "/login",
  className = "",
}: SignUpFormProps) {
  const t = useTranslations("auth.signup");
  const [formData, setFormData] = useState<
    SignUpData & { confirmPassword: string }
  >({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const displayError = externalError || error;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация
    if (formData.password !== formData.confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }

    if (formData.password.length < 6) {
      setError(t("errors.invalidPassword"));
      return;
    }

    try {
      await onSignUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.signupFailed"));
    }
  };

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
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
        {showLoginLink && (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <a
              href={loginLinkHref}
              className="font-medium text-primary hover:text-primary/80"
            >
              {t("signIn")}
            </a>
          </p>
        )}
      </div>

      {showOAuth && (
        <>
          <OAuthButtons onOAuthClick={onOAuthSignUp} isLoading={isLoading} />

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

      {success ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-md">
          <p className="font-medium">{t("checkEmail")}</p>
          <p className="text-sm mt-1">{t("emailInstructions")}</p>
        </div>
      ) : (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-foreground"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleInputChange("firstName")}
                  className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="John"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-foreground"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleInputChange("lastName")}
                  className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Doe"
                />
              </div>
            </div>

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
                value={formData.email}
                onChange={handleInputChange("email")}
                className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder={t("emailPlaceholder")}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                {t("password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleInputChange("password")}
                className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder={t("passwordPlaceholder")}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-foreground"
              >
                {t("confirmPassword")}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange("confirmPassword")}
                className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder={t("confirmPasswordPlaceholder")}
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
      )}
    </div>
  );
}
