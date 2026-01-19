/**
 * Configuration Types
 * 
 * Типы для конфигурационных JSON файлов (enterprises.config.json и т.д.)
 */

import type { ListSpec } from './list-types';

// ============================================================================
// FORM TYPES (будем добавлять в Фазе 2)
// ============================================================================

export interface FormSpec {
  mode: 'create' | 'edit';
  entityName: string;
  ui: FormUiSpec;
  messages: FormMessagesSpec;
  sections: FormSectionSpec[];
  relationFieldNames: string[];
}

export interface FormUiSpec {
  pageTitle: string;
  pageDescription?: string;
  submitButtonText: string;
  cancelButtonText: string;
  successMessage: string;
  errorMessage: string;
}

export interface FormMessagesSpec {
  requiredField: string;
  invalidEmail?: string;
  minLength?: string;
  maxLength?: string;
}

export interface FormSectionSpec {
  id: number | string;
  title: string;
  description?: string;
  controls: FormFieldSpec[];
}

export interface FormFieldSpec {
  id: string;
  name: string;
  label: string;
  type: string;
  dbType: string;
  required: boolean;
  requiredText?: string;
  placeholder?: string;
  description?: string;
  forCreatePage: boolean;
  forEditPage: boolean;
  forEditPageDisabled: boolean;
  displayIndex: number;
  sectionIndex: number;
  
  // For select fields
  loadOptions?: boolean;
  optionsSource?: 'locales' | 'currencies' | 'countries' | string;
  autoSelectFromCountry?: boolean;
  
  // Default values
  defaultStringValue?: string;
  defaultNumberValue?: number;
  defaultBooleanValue?: boolean;
  
  // Validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ValidationSpec {
  fields: Record<string, FieldValidation>;
}

export interface FieldValidation {
  required: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  errorMessages?: {
    required?: string;
    minLength?: string;
    maxLength?: string;
    pattern?: string;
  };
}

// ============================================================================
// COMPILED ENTITY CONFIG
// ============================================================================

/**
 * Полная конфигурация сущности (загружается из JSON)
 */
export interface CompiledEntityConfig {
  specVersion: number;
  entityName: string;
  tableName: string;
  entityDefinitionId: string;
  
  list: ListSpec;
  formCreate: FormSpec;
  formEdit: FormSpec;
  validationCreate: ValidationSpec;
  validationEdit: ValidationSpec;
}
