import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { cn } from "shared/lib/utils";

import { ThemeProvider, QueryProvider, AuthProvider } from "shared";
import { Toaster } from "shared/components/ui/toaster";
import { GlobalLoader } from "shared/components/GlobalLoader";
import { getServerUserFromHeaders } from "shared/auth-sdk/utils/headers";
import { ConditionalLayout } from "./ConditionalLayout";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  // Получаем пользователя из headers (установленных middleware)
  // Это избегает повторных запросов к Supabase и БД
  const user = await getServerUserFromHeaders();

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
            <QueryProvider>
              <AuthProvider initialUser={user}>
                <ConditionalLayout>
                  {children}
                </ConditionalLayout>
              </AuthProvider>
              <Toaster />
              <GlobalLoader />
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
