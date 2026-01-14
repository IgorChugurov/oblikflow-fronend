import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'
import { locales } from 'shared/lib/i18n/config'

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound()

  return {
    messages: (await import(`shared/locales/${locale}.json`)).default
  }
})
