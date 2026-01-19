import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { cn } from "shared/lib/utils";

import {
  ThemeProvider,
  QueryProvider,
  AuthProvider,
  AdminNavbar,
} from "shared";
import { Toaster } from "shared/components/ui/toaster";
import { GlobalLoader } from "shared/components/GlobalLoader";
import { getServerUserFromHeaders } from "shared/auth-sdk/utils/headers";

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
  title: "Oblikflow - Enterprise Management",
  description: "Manage your enterprises and projects",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  console.log("locale", locale);
  const messages = await getMessages();

  // Получаем пользователя из headers (установленных middleware)
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
                <main className="w-full pb-8">
                  <AdminNavbar user={user} />
                  <div className="px-4 pt-4 flex w-full justify-center">
                    {children}
                  </div>
                </main>
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
