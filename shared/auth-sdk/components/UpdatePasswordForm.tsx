/**
 * Форма для установки нового пароля (после перехода по ссылке из email)
 */

"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";

interface UpdatePasswordFormProps {
  onUpdatePassword: (password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function UpdatePasswordForm({
  onUpdatePassword,
  isLoading = false,
  error: externalError,
  className = "",
}: UpdatePasswordFormProps) {
  const t = useTranslations("auth.resetPasswordConfirm");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const displayError = externalError || error;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError(t("errors.invalidPassword"));
      return;
    }

    if (password.length < 6) {
      setError(t("errors.invalidPassword"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }

    try {
      await onUpdatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.updateFailed"));
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
          <p className="font-medium">{t("success")}</p>
          <p className="text-sm mt-1">{t("successDescription")}</p>
        </div>
      ) : (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
