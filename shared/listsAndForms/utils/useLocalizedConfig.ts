/**
 * useLocalizedConfig - React Hook для локализации конфигурационных объектов
 * 
 * Использует next-intl для резолвинга ключей переводов в конфигурационных файлах.
 * Автоматически реагирует на изменение текущей локали.
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { localizeConfigObject } from './config-resolver';

/**
 * Hook для локализации конфигурационного объекта
 * 
 * Принимает конфиг с ключами переводов (например: "entities.enterprises.list.pageTitle")
 * и возвращает конфиг с резолвенными переводами на текущем языке.
 * 
 * @example
 * ```tsx
 * import enterprisesConfig from './enterprises.config.json';
 * import { useLocalizedConfig } from './utils/useLocalizedConfig';
 * 
 * function EnterprisesListWrapper() {
 *   const localizedConfig = useLocalizedConfig(enterprisesConfig);
 *   
 *   return (
 *     <UniversalEntityListClient
 *       listSpec={localizedConfig.list}
 *       // ...
 *     />
 *   );
 * }
 * ```
 * 
 * @param config - Конфигурационный объект с ключами переводов
 * @returns Локализованный конфигурационный объект
 */
export function useLocalizedConfig<T>(config: T): T {
  // Получаем функцию перевода из next-intl
  // Она автоматически использует текущую локаль
  const t = useTranslations();
  
  // Мемоизируем результат локализации
  // Пересчитываем только при изменении конфига или функции перевода (т.е. локали)
  const localizedConfig = useMemo(() => {
    if (!config) {
      console.warn('[useLocalizedConfig] Config is null or undefined');
      return config;
    }
    
    try {
      return localizeConfigObject(config, t);
    } catch (error) {
      console.error('[useLocalizedConfig] Error localizing config:', error);
      return config; // Возвращаем исходный конфиг в случае ошибки
    }
  }, [config, t]);
  
  return localizedConfig;
}

/**
 * Hook для локализации конкретной части конфигурации
 * 
 * Полезен когда нужно локализовать только определенную секцию большого конфига.
 * 
 * @example
 * ```tsx
 * const localizedListSpec = useLocalizedConfigSection(enterprisesConfig.list);
 * ```
 * 
 * @param configSection - Секция конфигурации для локализации
 * @returns Локализованная секция
 */
export function useLocalizedConfigSection<T>(configSection: T): T {
  return useLocalizedConfig(configSection);
}
