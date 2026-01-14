/**
 * Server-side helper для next-intl
 * Используется в Server Components и middleware
 */

import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { defaultLocale, isValidLocale, type Locale } from './config'

export default getRequestConfig(async () => {
  // Получить locale из cookie или header
  let locale: Locale = defaultLocale

  try {
    // 1. Попробовать получить из cookie
    const cookieStore = await cookies()
    const cookieLocale = cookieStore.get('locale')?.value

    if (cookieLocale && isValidLocale(cookieLocale)) {
      locale = cookieLocale
    } else {
      // 2. Попробовать определить из Accept-Language header
      const headersList = await headers()
      const acceptLanguage = headersList.get('accept-language')
      
      if (acceptLanguage) {
        const primaryLang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase()
        if (isValidLocale(primaryLang)) {
          locale = primaryLang
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get locale, using default:', error)
  }

  return {
    locale,
    messages: (await import(`../../locales/${locale}.json`)).default,
  }
})
