import Link from "next/link";
import { Button } from "shared";
import { LogoutButton } from "./LogoutButton";
import { getServerUserFromHeaders } from "shared/auth-sdk/utils/headers";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  // Получаем пользователя из headers, установленных middleware
  const user = await getServerUserFromHeaders();

  const t = await getTranslations("home");

  return (
    <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
      <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
        {t("title")}
      </h1>
      <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {t("subtitle")}
      </p>
      {user && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Signed in as: <span className="font-medium">{user.email}</span>
        </p>
      )}
    </div>
  );
}
