"use client"

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { locales, localeNames, type Locale } from '../lib/i18n/config'
import { Languages } from 'lucide-react'

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const t = useTranslations('common')

  const switchLocale = (newLocale: Locale) => {
    // Установить cookie
    const cookieDomain = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.oblikflow.com'
      : undefined

    const cookieOptions = [
      `locale=${newLocale}`,
      'path=/',
      'max-age=31536000', // 1 год
      'SameSite=Lax',
    ]

    if (cookieDomain) {
      cookieOptions.push(`domain=${cookieDomain}`)
    }

    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('secure')
    }

    document.cookie = cookieOptions.join('; ')
    
    // Перезагрузить страницу для применения
    router.refresh()
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        onClick={() => {
          const select = document.getElementById('language-select')
          if (select) {
            ;(select as HTMLSelectElement).click()
          }
        }}
      >
        <Languages className="h-4 w-4" />
        <span className="hidden sm:inline">{localeNames[locale].native}</span>
      </button>
      
      <select
        id="language-select"
        value={locale}
        onChange={(e) => switchLocale(e.target.value as Locale)}
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
        aria-label={t('language')}
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc].native}
          </option>
        ))}
      </select>
    </div>
  )
}
