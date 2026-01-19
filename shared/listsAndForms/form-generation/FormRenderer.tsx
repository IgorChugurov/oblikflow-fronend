"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from 'shared/components/ui/button';
import { Form } from 'shared/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from 'shared/components/ui/card';
import { FormSection } from './FormSection';
import { buildValidationSchema } from './utils/validation-builder';
import type { FormSectionSpec } from '../types/config-types';

interface FormRendererProps<TData = any> {
  mode: 'create' | 'edit';
  sections: FormSectionSpec[];
  initialData?: TData;
  onSubmit: (data: TData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
  pageTitle?: string;
  pageDescription?: string;
  submitButtonText?: string;
  cancelButtonText?: string;
  deleteButtonText?: string;
}

/**
 * Нормализует данные формы - заменяет undefined/null на пустые строки
 * Это предотвращает ошибку "uncontrolled to controlled" в React
 */
function normalizeFormData(data: any): any {
  if (!data) return {};
  
  const normalized: any = {};
  for (const key in data) {
    const value = data[key];
    // Заменяем undefined и null на пустую строку для предотвращения uncontrolled inputs
    normalized[key] = value ?? '';
  }
  return normalized;
}

/**
 * FormRenderer - главный компонент универсальной формы
 * 
 * Рендерит форму на основе конфигурации, управляет валидацией и отправкой
 */
export function FormRenderer<TData = any>({
  mode,
  sections,
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  isLoading = false,
  pageTitle,
  pageDescription,
  submitButtonText,
  cancelButtonText,
  deleteButtonText,
}: FormRendererProps<TData>) {
  const t = useTranslations();
  
  // Собираем все поля из всех секций
  const allFields = sections.flatMap(section => section.controls);
  
  // Создаем схему валидации
  const validationSchema = buildValidationSchema(allFields);
  
  // Создаем форму с нормализованными значениями
  const form = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: normalizeFormData(initialData),
    mode: 'onBlur',
  });
  
  // Обновляем значения при изменении initialData (для edit режима)
  useEffect(() => {
    if (initialData && mode === 'edit') {
      form.reset(normalizeFormData(initialData));
    }
  }, [initialData, mode, form]);
  
  // Обработчик отправки
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data as TData);
    } catch (error) {
      console.error('Form submission error:', error);
      // Здесь можно добавить toast с ошибкой
    }
  });
  
  // Определяем текст кнопок
  const defaultSubmitText = mode === 'create' ? t('form.create') : t('form.save');
  const finalSubmitText = submitButtonText || defaultSubmitText;
  const finalCancelText = cancelButtonText || t('form.buttons.cancel');
  const finalDeleteText = deleteButtonText || t('form.buttons.delete');
  
  return (
    <Card className="w-full h-full overflow-hidden flex flex-col border-border">
      {/* Header с кнопками */}
      <CardHeader className="flex flex-shrink-0 border-b border-border bg-muted/50 py-3 px-6 !pb-3">
        <div className="flex items-center gap-3 w-full">
          <CardTitle className="flex-1">{pageTitle}</CardTitle>
          <div className="flex items-center gap-3">
            {mode === 'edit' && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
              disabled={isLoading}
            >
              {finalDeleteText}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {finalCancelText}
          </Button>
          <Button
            type="submit"
            form="universal-form"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? t('form.saving') : finalSubmitText}
          </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Content с формой */}
      <CardContent className="flex-1 overflow-y-auto max-w-[600px] pt-6">
        <Form {...form}>
          <form id="universal-form" onSubmit={handleSubmit} className="space-y-8" noValidate>
            {sections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>{t('form.noFields')}</p>
              </div>
            ) : (
              sections.map((section, sectionIdx) => (
                <div key={section.id}>
                  {sectionIdx > 0 && (
                    <div className="border-t border-border -mt-4 mb-8" />
                  )}
                  <FormSection
                    section={section}
                    form={form}
                    disabled={isLoading}
                    mode={mode}
                  />
                </div>
              ))
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
