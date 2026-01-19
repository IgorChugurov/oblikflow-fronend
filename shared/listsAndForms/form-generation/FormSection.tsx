"use client";

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormFieldComponent } from './FormField';
import type { FormSectionSpec } from '../types/config-types';

interface FormSectionProps {
  section: FormSectionSpec;
  form: UseFormReturn<any>;
  disabled?: boolean;
  mode: 'create' | 'edit';
}

/**
 * FormSection - секция формы с несколькими полями
 */
export function FormSection({ section, form, disabled, mode }: FormSectionProps) {
  // Фильтруем поля в зависимости от режима
  const visibleFields = section.controls.filter(field => {
    if (mode === 'create') {
      return field.forCreatePage !== false; // По умолчанию показываем
    } else {
      return field.forEditPage !== false; // По умолчанию показываем
    }
  });
  
  if (visibleFields.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      {/* Section Title */}
      <div>
        <h3 className="text-base font-semibold">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
        )}
      </div>
      
      {/* Fields */}
      <div className="flex flex-col gap-4">
        {visibleFields.map((field) => (
          <FormFieldComponent
            key={field.id}
            field={field}
            form={form}
            disabled={disabled || (mode === 'edit' && field.forEditPageDisabled)}
          />
        ))}
      </div>
    </div>
  );
}
