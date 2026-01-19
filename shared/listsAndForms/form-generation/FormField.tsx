"use client";

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { TextField, SelectField, TextareaField } from './fields';
import type { FormFieldSpec } from '../types/config-types';

interface FormFieldProps {
  field: FormFieldSpec;
  form: UseFormReturn<any>;
  disabled?: boolean;
}

/**
 * FormField - универсальный роутер полей
 * 
 * Определяет тип поля и рендерит соответствующий компонент
 */
export function FormFieldComponent({ field, form, disabled }: FormFieldProps) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'password':
    case 'number':
      return <TextField field={field} form={form} disabled={disabled} />;
    
    case 'select':
      return <SelectField field={field} form={form} disabled={disabled} />;
    
    case 'textarea':
      return <TextareaField field={field} form={form} disabled={disabled} />;
    
    default:
      console.warn(`Unsupported field type: ${field.type}`);
      return null;
  }
}
