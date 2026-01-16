"use client";

import { useAuth } from "shared/providers/AuthProvider";
import { Button } from "shared";
import { useTranslations } from "next-intl";

export function LogoutButton() {
  const { logout, isLoading } = useAuth();
  const t = useTranslations("home");

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoading}
      className="h-12 w-full rounded-full px-5 md:w-[158px]"
      variant="default"
    >
      {isLoading ? "..." : t("logout")}
    </Button>
  );
}
