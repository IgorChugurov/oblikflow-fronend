"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormRenderer } from 'shared/listsAndForms/form-generation';
import { useCreateEnterprise, useUpdateEnterprise, useEnterprise } from 'shared/api/hooks/enterprises';
import { useToast } from 'shared/hooks/use-toast';
import { useLocalizedConfig } from 'shared/listsAndForms/utils/useLocalizedConfig';
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
  const t = useTranslations();
  
  // Локализуем конфиг
  const localizedConfig = useLocalizedConfig(enterprisesConfig);
  
  // Загружаем данные для edit режима
  const { data: enterpriseResponse, isLoading: isLoadingEnterprise } = useEnterprise(
    enterpriseId!,
    { enabled: mode === 'edit' && !!enterpriseId }
  );
  
  const enterprise = enterpriseResponse?.data;
  
  // Mutations
  const createMutation = useCreateEnterprise('admin');
  const updateMutation = useUpdateEnterprise(enterpriseId!, 'admin');
  
  // Delete handler (soft delete - change status to suspended)
  const handleDelete = async () => {
    if (!enterpriseId) return;
    
    try {
      await updateMutation.mutateAsync({ status: 'suspended' });
      toast({
        title: t('entities.enterprises.toast.suspended'),
        description: t('entities.enterprises.toast.suspendedDescription'),
      });
      router.push('/');
    } catch (error: any) {
      toast({
        title: t('errors.generic'),
        description: error.message || t('entities.enterprises.toast.suspendError'),
        variant: 'destructive',
      });
    }
  };
  
  // Определяем локализованную конфигурацию в зависимости от режима
  const formConfig = mode === 'create' 
    ? localizedConfig.formCreate 
    : localizedConfig.formEdit;
  
  // Обработчик отправки
  const handleSubmit = async (data: CreateEnterpriseDto | UpdateEnterpriseDto) => {
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(data as CreateEnterpriseDto);
        toast({
          title: t('entities.enterprises.formCreate.successMessage'),
          description: t('entities.enterprises.toast.createdDescription'),
        });
      } else {
        await updateMutation.mutateAsync(data as UpdateEnterpriseDto);
        toast({
          title: t('entities.enterprises.formEdit.successMessage'),
          description: t('entities.enterprises.toast.updatedDescription'),
        });
      }
      
      // Возвращаемся к списку
      router.push('/');
    } catch (error: any) {
      toast({
        title: t('errors.generic'),
        description: error.message || t('entities.enterprises.toast.saveError'),
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
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }
  
  // Error state - enterprise не найдено
  if (mode === 'edit' && !enterprise) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t('entities.enterprises.notFound')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('entities.enterprises.notFoundDescription')}
          </p>
          <button
            onClick={handleCancel}
            className="text-primary hover:underline"
          >
            {t('entities.enterprises.backToList')}
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
      pageTitle={formConfig.ui.pageTitle}
      pageDescription={formConfig.ui.pageDescription}
      submitButtonText={formConfig.ui.submitButtonText}
      cancelButtonText={formConfig.ui.cancelButtonText}
      deleteButtonText={t('entities.enterprises.suspendButton')}
    />
  );
}
