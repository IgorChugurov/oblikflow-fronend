import { z } from 'zod';
import type { FormFieldSpec } from '../../types/config-types';

/**
 * Создает Zod схему валидации на основе конфигурации полей
 */
export function buildValidationSchema(fields: FormFieldSpec[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  
  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;
    
    // Базовый тип
    switch (field.type) {
      case 'number':
        fieldSchema = z.coerce.number({
          message: field.requiredText || `${field.label} обов'язкове`,
        });
        break;
      
      case 'email':
        fieldSchema = z.string({
          message: field.requiredText || `${field.label} обов'язкове`,
        }).email('Невірний формат email');
        break;
      
      case 'select':
        fieldSchema = z.string({
          message: field.requiredText || `${field.label} обов'язкове`,
        });
        break;
      
      default:
        fieldSchema = z.string({
          message: field.requiredText || `${field.label} обов'язкове`,
        });
    }
    
    // Дополнительные валидации
    if (field.type === 'text' || field.type === 'textarea' || field.type === 'email') {
      if (field.minLength) {
        fieldSchema = (fieldSchema as z.ZodString).min(
          field.minLength,
          `Мінімальна довжина ${field.minLength} символів`
        );
      }
      if (field.maxLength) {
        fieldSchema = (fieldSchema as z.ZodString).max(
          field.maxLength,
          `Максимальна довжина ${field.maxLength} символів`
        );
      }
      if (field.pattern) {
        fieldSchema = (fieldSchema as z.ZodString).regex(
          new RegExp(field.pattern),
          'Невірний формат'
        );
      }
    }
    
    // Optional если не required
    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }
    
    shape[field.name] = fieldSchema;
  });
  
  return z.object(shape);
}
