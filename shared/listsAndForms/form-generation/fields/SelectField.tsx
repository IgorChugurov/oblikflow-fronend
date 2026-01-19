"use client";

import React, { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared/components/ui/select';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'shared/components/ui/form';
import { useSelectOptions } from 'shared/api/hooks/reference';
import type { FormFieldSpec } from '../../types/config-types';

interface SelectFieldProps {
  field: FormFieldSpec;
  form: UseFormReturn<any>;
  disabled?: boolean;
}

/**
 * SelectField - универсальное поле выбора
 * 
 * Поддерживает:
 * - Загрузку опций из справочников (locales, currencies, countries)
 * - Автоматический выбор валюты по стране (autoSelectFromCountry)
 */
export function SelectField({ field, form, disabled }: SelectFieldProps) {
  // Загружаем опции из справочника
  const {
    localeOptions,
    currencyOptions,
    countryOptions,
    isLoading,
  } = useSelectOptions();
  
  // Определяем, какие опции использовать
  let options: Array<{ value: string; label: string }> = [];
  
  if (field.loadOptions && field.optionsSource) {
    switch (field.optionsSource) {
      case 'locales':
        options = localeOptions;
        break;
      case 'currencies':
        options = currencyOptions;
        break;
      case 'countries':
        options = countryOptions;
        break;
    }
  }
  
  // Автоматический выбор валюты по стране
  useEffect(() => {
    if (field.autoSelectFromCountry && field.optionsSource === 'currencies') {
      const countryCode = form.watch('country_code');
      if (countryCode) {
        // Карта стран -> валюты
        const countryToCurrency: Record<string, string> = {
          'UA': 'UAH',
          'PL': 'PLN',
          'US': 'USD',
          'GB': 'GBP',
          'EU': 'EUR',
          // ... добавить больше при необходимости
        };
        
        const defaultCurrency = countryToCurrency[countryCode];
        if (defaultCurrency && !form.getValues(field.name)) {
          form.setValue(field.name, defaultCurrency);
        }
      }
    }
  }, [form.watch('country_code'), field, form]);
  
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
          <Select
            onValueChange={formField.onChange}
            value={formField.value}
            disabled={disabled || isLoading}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || 'Оберіть значення'} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading" disabled>Завантаження...</SelectItem>
              ) : options.length === 0 ? (
                <SelectItem value="empty" disabled>Немає опцій</SelectItem>
              ) : (
                options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
