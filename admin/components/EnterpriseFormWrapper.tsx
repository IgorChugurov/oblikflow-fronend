"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { FormRenderer } from 'shared/listsAndForms/form-generation';
import { useCreateEnterprise, useUpdateEnterprise, useEnterprise } from 'shared/api/hooks/enterprises';
import { useToast } from 'shared/hooks/use-toast';
import enterprisesConfig from 'shared/listsAndForms/configuration-setup/enterprises.config.json';
import type { CreateEnterpriseDto, UpdateEnterpriseDto } from 'shared/types/enterprises';

interface EnterpriseFormWrapperProps {
  mode: 'create' | 'edit';
  enterpriseId?: string;
}

/**
 * EnterpriseFormWrapper
 * 
 * Обертка над FormRenderer для создания и редактирования предприятий.
 * Интегрируется с enterprisesSDK через React Query hooks.
 */
export function EnterpriseFormWrapper({ mode, enterpriseId }: EnterpriseFormWrapperProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // Загружаем данные для edit режима
  const { data: enterpriseResponse, isLoading: isLoadingEnterprise } = useEnterprise(
    enterpriseId!,
    { enabled: mode === 'edit' && !!enterpriseId }
  );
  
  const enterprise = enterpriseResponse?.data;
  
  // Mutations
  const createMutation = useCreateEnterprise();
  const updateMutation = useUpdateEnterprise(enterpriseId!);
  
  // Delete handler (soft delete - change status to suspended)
  const handleDelete = async () => {
    if (!enterpriseId) return;
    
    try {
      await updateMutation.mutateAsync({ status: 'suspended' });
      toast({
        title: 'Підприємство призупинено',
        description: 'Статус підприємства змінено на "призупинено".',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Помилка',
        description: error.message || 'Не вдалося призупинити підприємство.',
        variant: 'destructive',
      });
    }
  };
  
  // Определяем конфигурацию в зависимости от режима
  const formConfig = mode === 'create' 
    ? enterprisesConfig.formCreate 
    : enterprisesConfig.formEdit;
  
  // Обработчик отправки
  const handleSubmit = async (data: CreateEnterpriseDto | UpdateEnterpriseDto) => {
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(data as CreateEnterpriseDto);
        toast({
          title: 'Підприємство створено',
          description: 'Підприємство успішно додано до списку.',
        });
      } else {
        await updateMutation.mutateAsync(data as UpdateEnterpriseDto);
        toast({
          title: 'Підприємство оновлено',
          description: 'Зміни успішно збережено.',
        });
      }
      
      // Возвращаемся к списку
      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Помилка',
        description: error.message || 'Не вдалося зберегти зміни.',
        variant: 'destructive',
      });
    }
  };
  
  // Обработчик отмены
  const handleCancel = () => {
    router.push('/');
  };
  
  // Loading state для edit режима
  if (mode === 'edit' && isLoadingEnterprise) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Завантаження...</p>
        </div>
      </div>
    );
  }
  
  // Error state - enterprise не найдено
  if (mode === 'edit' && !enterprise) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Підприємство не знайдено</h2>
          <p className="text-muted-foreground mb-4">
            Можливо, воно було видалено або у вас немає доступу.
          </p>
          <button
            onClick={handleCancel}
            className="text-primary hover:underline"
          >
            Повернутися до списку
          </button>
        </div>
      </div>
    );
  }
  
  // Преобразуем Enterprise в формат для формы (null → пустая строка)
  const initialFormData = enterprise ? {
    name: enterprise.name || '',
    country_code: enterprise.country_code || '',
    default_currency: enterprise.default_currency || '',
    default_locale: enterprise.default_locale || '',
  } : undefined;
  
  return (
    <FormRenderer
      mode={mode}
      sections={formConfig.sections}
      initialData={mode === 'edit' ? initialFormData : undefined}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onDelete={mode === 'edit' ? handleDelete : undefined}
      isLoading={createMutation.isPending || updateMutation.isPending}
      pageTitle={
        mode === 'create' 
          ? 'Створити підприємство' 
          : 'Редагувати підприємство'
      }
      submitButtonText={mode === 'create' ? 'Створити' : 'Зберегти'}
      cancelButtonText="Скасувати"
      deleteButtonText="Призупинити"
    />
  );
}
