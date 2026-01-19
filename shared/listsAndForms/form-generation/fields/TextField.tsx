"use client";

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from 'shared/components/ui/input';
import { Label } from 'shared/components/ui/label';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'shared/components/ui/form';
import type { FormFieldSpec } from '../../types/config-types';

interface TextFieldProps {
  field: FormFieldSpec;
  form: UseFormReturn<any>;
  disabled?: boolean;
}

/**
 * TextField - универсальное текстовое поле
 * 
 * Поддерживает типы: text, email, password, number
 */
export function TextField({ field, form, disabled }: TextFieldProps) {
  const inputType = field.type === 'email' ? 'email' : 
                    field.type === 'password' ? 'password' :
                    field.type === 'number' ? 'number' : 'text';
  
  return (
    <FormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              {...formField}
              type={inputType}
              placeholder={field.placeholder}
              disabled={disabled || field.forEditPageDisabled}
              className="w-full"
            />
          </FormControl>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
