"use client";

import { ResetPasswordClient } from "shared/auth-sdk/components";

/**
 * Клиентская обертка для ResetPasswordClient
 * Обрабатывает постобработку после успешного обновления пароля
 */
export function ResetPasswordWrapper() {
  const handlePasswordUpdated = async () => {
    // Очистка временных данных при смене пароля
    if (typeof window !== "undefined") {
      // Очищаем localStorage от временных данных если есть
      localStorage.removeItem("temp_auth_data");
      
      // Можно добавить очистку cookies проекта/workspace если нужно:
      // document.cookie = "current_project_id=; path=/; max-age=0; SameSite=Lax";
      // document.cookie = "current_workspace_id=; path=/; max-age=0; SameSite=Lax";
    }
    
    console.log("[Auth] Password updated successfully, redirecting to login...");
  };

  return (
    <ResetPasswordClient
      onPasswordUpdated={handlePasswordUpdated}
      redirectToAfterUpdate="/login?passwordUpdated=true"
    />
  );
}
