"use client";

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Textarea } from 'shared/components/ui/textarea';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'shared/components/ui/form';
import type { FormFieldSpec } from '../../types/config-types';

interface TextareaFieldProps {
  field: FormFieldSpec;
  form: UseFormReturn<any>;
  disabled?: boolean;
}

/**
 * TextareaField - многострочное текстовое поле
 */
export function TextareaField({ field, form, disabled }: TextareaFieldProps) {
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
            <Textarea
              {...formField}
              placeholder={field.placeholder}
              disabled={disabled || field.forEditPageDisabled}
              className="w-full min-h-[100px]"
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
