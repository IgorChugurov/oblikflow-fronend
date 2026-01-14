/**
 * Конфигурация локализации
 * Список поддерживаемых языков и настройки
 */

export const locales = ['uk', 'en', 'pl', 'ru', 'de', 'fr', 'sk', 'es'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'uk'

export const localeNames: Record<Locale, { native: string; en: string }> = {
  uk: { native: 'Українська', en: 'Ukrainian' },
  en: { native: 'English', en: 'English' },
  pl: { native: 'Polski', en: 'Polish' },
  ru: { native: 'Русский', en: 'Russian' },
  de: { native: 'Deutsch', en: 'German' },
  fr: { native: 'Français', en: 'French' },
  sk: { native: 'Slovenčina', en: 'Slovak' },
  es: { native: 'Español', en: 'Spanish' },
}

// Функция для проверки поддерживаемого языка
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}

// Получить язык из cookie или browser
export function getPreferredLocale(cookieLocale?: string, browserLocale?: string): Locale {
  // 1. Проверить cookie
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale
  }

  // 2. Проверить browser locale
  if (browserLocale) {
    const primaryLang = browserLocale.split('-')[0].toLowerCase()
    if (isValidLocale(primaryLang)) {
      return primaryLang
    }
  }

  // 3. Вернуть дефолтный
  return defaultLocale
}
