"use client";

import { usePathname } from "next/navigation";
import Navbar from "shared/components/Navbar";
import { useAuth } from "shared";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

// Страницы авторизации без navbar
const PUBLIC_AUTH_ROUTES = [
  "/login",
  "/logout",
  "/signup",
  "/reset-password",
  "/verify-email",
  "/auth/callback",
];

export function ConditionalLayout({
  children,
}: ConditionalLayoutProps) {
  const pathname = usePathname();

  // Проверяем, является ли текущий путь страницей авторизации
  const isAuthPage = PUBLIC_AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Если это страница авторизации - рендерим без navbar
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Для всех остальных страниц получаем user и рендерим с navbar
  return <NavbarWrapper>{children}</NavbarWrapper>;
}

// Отдельный компонент для страниц с navbar, где безопасно вызывать useAuth
function NavbarWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  return (
    <main className="w-full pb-8">
      <Navbar user={user} />
      <div className="px-4 pt-4 flex w-full justify-center">{children}</div>
    </main>
  );
}
