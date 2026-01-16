/**
 * Форма сброса пароля
 */

"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";

interface ResetPasswordFormProps {
  onResetPassword: (email: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function ResetPasswordForm({
  onResetPassword,
  isLoading = false,
  error: externalError,
  className = "",
}: ResetPasswordFormProps) {
  const t = useTranslations("auth.resetPassword");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const displayError = externalError || error;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await onResetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.resetFailed"));
    }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          {t("title")}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {success ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-md">
          <p className="font-medium">{t("checkEmail")}</p>
          <p className="text-sm mt-1">{t("emailInstructions")}</p>
          <div className="mt-4 text-center">
            <a
              href="/login"
              className="text-sm text-primary hover:text-primary/80"
            >
              {t("backToLogin")}
            </a>
          </div>
        </div>
      ) : (
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder={t("emailPlaceholder")}
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

          <div className="text-center">
            <a
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              {t("backToLogin")}
            </a>
          </div>
        </form>
      )}
    </div>
  );
}
