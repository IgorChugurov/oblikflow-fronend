/**
 * useListRouting - Навигация для списка
 * 
 * Универсальный хук для навигации (create, edit, details).
 * Работает с Next.js App Router.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { RoutingConfig, NavigationParams } from '../../types';

interface UseListRoutingOptions {
  routing: RoutingConfig;
  projectId: string;
}

export function useListRouting({ routing, projectId }: UseListRoutingOptions) {
  const router = useRouter();

  /**
   * Navigate to create page
   */
  const navigateToCreate = useCallback(
    (params?: NavigationParams) => {
      if (!routing.createUrlTemplate) {
        console.warn('createUrlTemplate not configured');
        return;
      }

      let url = routing.createUrlTemplate;

      // Add query params if provided
      if (params) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.set(key, String(value));
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      router.push(url);
    },
    [routing.createUrlTemplate, router]
  );

  /**
   * Navigate to edit page
   */
  const navigateToEdit = useCallback(
    (id: string, params?: NavigationParams) => {
      if (!routing.editUrlTemplate) {
        console.warn('editUrlTemplate not configured');
        return;
      }

      let url = routing.editUrlTemplate.replace('{id}', id).replace('{instanceId}', id);

      // Add query params if provided
      if (params) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.set(key, String(value));
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      router.push(url);
    },
    [routing.editUrlTemplate, router]
  );

  /**
   * Navigate to details page
   */
  const navigateToDetails = useCallback(
    (id: string, additionalUrl?: string) => {
      if (!routing.detailsUrlTemplate) {
        console.warn('detailsUrlTemplate not configured');
        return;
      }

      let url = routing.detailsUrlTemplate.replace('{id}', id).replace('{instanceId}', id);

      if (additionalUrl) {
        url += additionalUrl;
      }

      router.push(url);
    },
    [routing.detailsUrlTemplate, router]
  );

  /**
   * Navigate to custom URL (for actions like "members")
   */
  const navigateToCustom = useCallback(
    (urlTemplate: string, row: any) => {
      let url = urlTemplate;

      // Replace all placeholders
      Object.keys(row).forEach((key) => {
        url = url.replace(`{${key}}`, String(row[key]));
      });

      router.push(url);
    },
    [router]
  );

  return {
    navigateToCreate,
    navigateToEdit,
    navigateToDetails,
    navigateToCustom,
  };
}
