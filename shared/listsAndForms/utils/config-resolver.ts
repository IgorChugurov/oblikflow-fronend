/**
 * Config Resolver - Утилиты для резолвинга i18n ключей в конфигурациях
 * 
 * Рекурсивно проходит по объекту конфигурации и заменяет строки-ключи
 * на переводы из next-intl.
 */

/**
 * Проверяет, является ли значение ключом перевода
 * Ключи должны начинаться с букв и содержать точки (например: entities.enterprises.list.pageTitle)
 * 
 * НЕ считаются ключами:
 * - Форматы дат (dd.MM.yyyy, dd/MM/yyyy HH:mm)
 * - Строки с плейсхолдерами ({name}, {min}, {max})
 * - URL-ы (http://, https://)
 * - Email-ы (user@domain.com)
 */
export function isTranslationKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  
  // Ключ должен содержать хотя бы одну точку
  if (!value.includes('.')) return false;
  
  // Ключ не должен начинаться с точки
  if (value.startsWith('.')) return false;
  
  // Ключ должен начинаться с букв (не с цифр, спецсимволов и т.д.)
  if (!/^[a-zA-Z]/.test(value)) return false;
  
  // НЕ переводим форматы дат (dd.MM.yyyy, dd/MM/yyyy, etc)
  if (/^[dmyHhMsSa./:,\s]+$/.test(value)) return false;
  
  // НЕ переводим строки с плейсхолдерами в фигурных скобках
  if (value.includes('{') && value.includes('}')) return false;
  
  // НЕ переводим URL-ы
  if (value.startsWith('http://') || value.startsWith('https://')) return false;
  
  // НЕ переводим email-ы
  if (value.includes('@') && value.includes('.')) return false;
  
  // Ключ должен содержать минимум 2 части, разделенные точкой
  const parts = value.split('.');
  if (parts.length < 2) return false;
  
  // Все части должны быть буквенно-цифровыми (camelCase или snake_case)
  if (!parts.every(part => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(part))) return false;
  
  return true;
}

/**
 * Получает перевод по ключу из функции next-intl
 * 
 * @param key - Ключ перевода (например: "entities.enterprises.list.pageTitle")
 * @param t - Функция перевода из next-intl (должна поддерживать t.raw())
 * @returns Переведенная строка или исходный ключ, если перевод не найден
 */
export function resolveTranslationKey(key: string, t: any): string {
  try {
    // Используем t.raw() для получения сырой строки БЕЗ форматирования плейсхолдеров
    // Это позволяет избежать FORMATTING_ERROR когда в переводе есть {name}, {min}, {max}
    // Значения для плейсхолдеров будут подставлены позже в компонентах
    const translation = t.raw ? t.raw(key) : t(key);
    
    // Если next-intl вернул сам ключ, значит перевод не найден
    // В этом случае возвращаем исходный ключ
    if (translation === key) {
      console.warn(`[i18n] Translation not found for key: ${key}`);
      return key;
    }
    
    return translation;
  } catch (error: any) {
    // FORMATTING_ERROR возникает когда в переводе есть плейсхолдеры {name}, {min}, {max}
    // но мы их не передаем. Это нормально для конфигов - значения подставятся позже.
    if (error?.code === 'FORMATTING_ERROR') {
      // Возвращаем исходный текст с плейсхолдерами
      return error.originalMessage || key;
    }
    
    // MISSING_MESSAGE - перевод не найден, возвращаем ключ
    if (error?.code === 'MISSING_MESSAGE') {
      console.warn(`[i18n] Translation not found for key: ${key}`);
      return key;
    }
    
    console.error(`[i18n] Error resolving translation key: ${key}`, error);
    return key;
  }
}

/**
 * Рекурсивно локализует объект конфигурации
 * 
 * Проходит по всем полям объекта и заменяет строки-ключи на переводы.
 * Поддерживает вложенные объекты и массивы.
 * 
 * @param obj - Объект конфигурации для локализации
 * @param t - Функция перевода из next-intl (должна поддерживать t.raw())
 * @returns Локализованный объект
 */
export function localizeConfigObject<T>(obj: T, t: any): T {
  // Обработка примитивов
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Обработка строк - проверяем, является ли ключом перевода
  if (typeof obj === 'string') {
    if (isTranslationKey(obj)) {
      return resolveTranslationKey(obj, t) as any;
    }
    return obj;
  }
  
  // Обработка чисел, булевых значений и т.д.
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // Обработка массивов
  if (Array.isArray(obj)) {
    return obj.map(item => localizeConfigObject(item, t)) as any;
  }
  
  // Обработка объектов
  const result: any = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = localizeConfigObject((obj as any)[key], t);
    }
  }
  
  return result as T;
}

/**
 * Вспомогательная функция для получения значения из вложенного объекта по пути
 * Используется для доступа к переводам по пути типа "entities.enterprises.list.pageTitle"
 * 
 * @param obj - Объект для обхода
 * @param path - Массив ключей пути
 * @returns Значение по указанному пути или undefined
 */
export function getNestedValue(obj: any, path: string[]): any {
  return path.reduce((current, key) => {
    return current?.[key];
  }, obj);
}
