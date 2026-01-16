import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  locales,
  defaultLocale,
  getPreferredLocale,
} from "shared/lib/i18n/config";

export default getRequestConfig(async ({ requestLocale }) => {
  // Определяем локаль из cookies или headers
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as any)) {
    // Попробуем получить из cookies
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

    // Попробуем получить из Accept-Language header
    const headersList = await headers();
    const acceptLanguage = headersList.get("accept-language");
    const browserLocale = acceptLanguage?.split(",")[0]?.split("-")[0];

    // Используем функцию из config для определения предпочитаемой локали
    locale = getPreferredLocale(cookieLocale, browserLocale);
  }

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  return {
    locale,
    messages: (await import(`shared/locales/${locale}.json`)).default,
  };
});
