import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { cn } from "shared/lib/utils";

import { ThemeProvider, AuthProvider } from "shared";
import Navbar from "shared/components/Navbar";
import { Toaster } from "shared/components/ui/toaster";
import { GlobalLoader } from "shared/components/GlobalLoader";
import { cookies } from "next/headers";
import { getServerUserFromHeaders } from "shared/auth-sdk/utils/headers";
import { fetchLocalesWithFallback, type LocaleDto } from "shared/lib/api";
import { locales, localeNames } from "shared/lib/i18n/config";
import { unstable_cache } from "next/cache";

const GeistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const GeistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const MontserratSerif = Montserrat({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "OBLIKflow - Site",
  description: "Авторизация и регистрация",
};

// Кеширование списка локалей (обновляется раз в час)
const getCachedLocales = unstable_cache(
  async (): Promise<LocaleDto[]> => {
    // Создаем fallback список из статической конфигурации
    const fallbackLocales: LocaleDto[] = locales.map((code) => ({
      code,
      name_native: localeNames[code].native,
      name_en: localeNames[code].en,
      is_active: true,
    }));

    return await fetchLocalesWithFallback(fallbackLocales);
  },
  ["site-locales"],
  {
    revalidate: 3600, // 1 час
    tags: ["locales"],
  }
);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Получаем пользователя из headers (установленных middleware)
  // Это избегает повторных запросов к Supabase и БД
  const user = await getServerUserFromHeaders();

  // Получаем список доступных языков
  const availableLocales = await getCachedLocales();

  const publicAuthRoutes = [
    "/login",
    "/logout",
    "/signup",
    "/reset-password",
    "/auth/callback",
  ];

  const cookieStore = await cookies();
  const hasAccessToken = cookieStore.get("sb-access-token") !== undefined;
  const isPublicAuthRoute =
    publicAuthRoutes.includes(pathname) && !hasAccessToken;

  return (
    <html
      lang={locale}
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        MontserratSerif.variable,
        "bg-background text-foreground"
      )}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider initialUser={user}>
              {isPublicAuthRoute ? (
                children
              ) : (
                <>
                  <main className="w-full pb-8 ">
                    <Navbar locales={availableLocales} />
                    <div className="px-4 pt-4 flex w-full justify-center">
                      {children}
                    </div>
                  </main>
                </>
              )}
            </AuthProvider>
            <Toaster />
            <GlobalLoader />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
