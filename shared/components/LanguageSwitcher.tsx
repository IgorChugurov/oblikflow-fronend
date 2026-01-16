"use client";

import { useLocale, useTranslations } from "next-intl";
import { locales, localeNames, type Locale } from "../lib/i18n/config";
import { Languages } from "lucide-react";
import type { LocaleDto } from "../lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

interface LanguageSwitcherProps {
  locales?: LocaleDto[];
}

export function LanguageSwitcher({ locales: dynamicLocales }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");

  // Используем динамический список или fallback на статический
  const availableLocales = dynamicLocales || locales.map((code) => ({
    code,
    name_native: localeNames[code].native,
    name_en: localeNames[code].en,
    is_active: true,
  }));

  const switchLocale = (newLocale: string) => {
    // Перенаправляем на текущую страницу с query параметром ?lang=
    // Middleware перехватит, установит cookie и сделает redirect
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const searchParams = new URLSearchParams(currentSearch);
    
    // Устанавливаем или обновляем параметр lang
    searchParams.set("lang", newLocale);
    
    // Перезагружаем страницу с новым параметром
    window.location.href = `${currentPath}?${searchParams.toString()}`;
  };

  // Получаем название текущего языка
  const currentLocaleName = availableLocales.find((l) => l.code === locale)?.name_native || locale.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" title={t("language") || "Language"}>
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t("language") || "Language"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLocales.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => switchLocale(loc.code)}
            className={locale === loc.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{loc.name_native}</span>
            {locale === loc.code && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
