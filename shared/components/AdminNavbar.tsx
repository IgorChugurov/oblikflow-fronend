"use client";
import { LogOut, Moon, Sun, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { useAuth } from "../providers/AuthProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLocales } from "../api/hooks";
import type { User } from "../auth-sdk/types";

interface AdminNavbarProps {
  user?: User | null;
}

const AdminNavbar = ({ user }: AdminNavbarProps) => {
  const { data: localesData } = useLocales();
  const t = useTranslations();
  const { setTheme } = useTheme();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // После успешного logout редиректим на site
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://oblikflow.com";
      window.location.href = `${siteUrl}/login`;
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback: прямая перезагрузка на site login
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://oblikflow.com";
      window.location.href = `${siteUrl}/login`;
    }
  };

  const getUserInitials = (user: unknown) => {
    if (
      user &&
      typeof user === "object" &&
      "firstName" in user &&
      "lastName" in user
    ) {
      const u = user as { firstName?: string; lastName?: string };
      if (u.firstName && u.lastName) {
        return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
      }
    }
    if (user && typeof user === "object" && "email" in user) {
      const u = user as { email?: string };
      if (u.email) {
        return u.email[0].toUpperCase();
      }
    }
    return "U";
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="p-2 py-4 flex items-center justify-between">
        {/* Left side - App name */}
        <div className="flex items-center px-4">
          <Link
            href="/"
            className="text-xl font-semibold hover:opacity-80 transition-opacity"
          >
            {t("admin.appName")}
          </Link>
        </div>

        {/* Right side - controls */}
        <div className="flex items-center gap-4">
          {/* language switcher */}
          <LanguageSwitcher locales={localesData?.data} />

          {/* theme menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* user menu - always visible in admin */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar>
                  <AvatarImage
                    src={user?.avatar || "https://github.com/shadcn.png"}
                  />
                  <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent sideOffset={10}>
                <DropdownMenuLabel>
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || t("navbar.myAccount")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <UserIcon className="h-[1.2rem] w-[1.2rem] mr-2" />
                    {t("navbar.profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut className="h-[1.2rem] w-[1.2rem] mr-2" />
                  {t("navbar.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
