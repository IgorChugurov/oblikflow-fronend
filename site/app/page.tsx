import Link from "next/link";
import { Button } from "shared";
import { LogoutButton } from "./LogoutButton";
import {
  createServerSupabaseClient,
  createServerAuthClient,
} from "shared/auth-sdk/server";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  // Проверяем, залогинен ли пользователь
  const supabase = createServerSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const authClient = createServerAuthClient(supabase);
  const user = await authClient.getUser();

  const t = await getTranslations("home");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
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
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          {user ? (
            <LogoutButton />
          ) : (
            <Button asChild className="h-12 w-full rounded-full px-5 md:w-[158px]">
              <Link href="/login">{t("login")}</Link>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
