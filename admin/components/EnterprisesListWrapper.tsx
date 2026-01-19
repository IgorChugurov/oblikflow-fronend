/**
 * EnterprisesListWrapper - Обертка для списка предприятий
 * 
 * Формирует props для UniversalEntityListClient:
 * - Загружает конфигурацию
 * - Подключает enterprisesSDK
 * - Настраивает routing для Next.js
 */

'use client';

import React from 'react';
import { UniversalEntityListClient } from 'shared/listsAndForms/universal-list';
import { enterprisesSDK } from 'shared/api/sdk';
import enterprisesConfig from 'shared/listsAndForms/configuration-setup/enterprises.config.json';
import { useLocalizedConfig } from 'shared/listsAndForms/utils/useLocalizedConfig';
import type { Enterprise } from 'shared/types/enterprises';
import type { LoadDataFn, LoadDataResult, ListSpec } from 'shared/listsAndForms/types';

interface EnterprisesListWrapperProps {
  readOnly?: boolean;
}

export function EnterprisesListWrapper({ readOnly = false }: EnterprisesListWrapperProps) {
  // ========================================
  // 1. Локализация конфигурации
  // ========================================
  const localizedConfig = useLocalizedConfig(enterprisesConfig);
  const listSpec = localizedConfig.list as ListSpec;

  // ========================================
  // 2. onLoadData - Адаптер SDK → Universal
  // ========================================
  const onLoadData: LoadDataFn<Enterprise> = async (params) => {
    // Вызываем SDK
    const result = await enterprisesSDK.getAll();

    // Проверяем ошибки
    if (result.error) {
      throw new Error(result.error.message || 'Failed to load enterprises');
    }

    // Получаем данные
    const enterprises = result.data?.data || [];
    const total = result.data?.meta?.total || enterprises.length;

    // ========================================
    // Client-side filtering (search)
    // ========================================
    let filteredData = enterprises;

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredData = enterprises.filter((e) => e.name.toLowerCase().includes(searchLower));
    }

    // ========================================
    // Client-side filtering (filters)
    // ========================================
    if (params.filters) {
      // Filter by status
      if (params.filters.status) {
        filteredData = filteredData.filter((e) => e.status === params.filters!.status);
      }

      // Filter by role (is_owner)
      if (params.filters.is_owner !== undefined) {
        const isOwner = params.filters.is_owner === 'true' || params.filters.is_owner === true;
        filteredData = filteredData.filter((e) => e.is_owner === isOwner);
      }
    }

    // ========================================
    // Client-side pagination
    // ========================================
    const start = (params.page - 1) * params.limit;
    const end = start + params.limit;
    const paginatedData = filteredData.slice(start, end);

    // ========================================
    // Return result
    // ========================================
    const loadDataResult: LoadDataResult<Enterprise> = {
      data: paginatedData,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / params.limit),
        hasPreviousPage: params.page > 1,
        hasNextPage: end < filteredData.length,
      },
    };

    return loadDataResult;
  };

  // ========================================
  // 3. onDelete - Адаптер SDK → Universal
  // ========================================
  const onDelete = async (id: string) => {
    // TODO: Implement delete in SDK
    // const result = await enterprisesSDK.delete(id);
    // if (result.error) {
    //   throw new Error(result.error.message);
    // }
    
    // Temporary: throw error
    throw new Error('Delete not implemented yet');
  };

  // ========================================
  // 4. Routing для Next.js
  // ========================================
  const routing = {
    createUrlTemplate: '/enterprises/new',
    editUrlTemplate: '/enterprises/{id}/edit',
    basePath: '/',
  };

  // ========================================
  // 5. Обработчик клика по строке (переход в workspace)
  // ========================================
  const handleRowClick = (enterprise: Enterprise) => {
    // Устанавливаем enterprise_id в cookie (как указано в rowClick config)
    document.cookie = `enterprise_id=${enterprise.id}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 дней
    
    // Получаем WORKSPACE_URL из environment
    const workspaceUrl = process.env.NEXT_PUBLIC_WORKSPACE_URL || 'http://localhost:3002';
    
    // Формируем URL (/{id}/workspace)
    const targetUrl = `${workspaceUrl}/${enterprise.id}/workspace`;
    console.log(targetUrl);
    // Переходим в workspace
    window.location.href = targetUrl;
  };

  // ========================================
  // 6. Передаем все в Universal компонент
  // ========================================
  return (
    <UniversalEntityListClient<Enterprise>
      projectId="admin"
      serviceType="enterprises"
      listSpec={listSpec}
      routing={routing}
      onLoadData={onLoadData}
      onDelete={onDelete}
      // onRowClick={handleRowClick}
      readOnly={readOnly}
    />
  );
}
