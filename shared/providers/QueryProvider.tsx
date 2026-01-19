"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * QueryProvider - провайдер React Query для всего приложения
 *
 * Оборачивает приложение в QueryClientProvider с оптимальными настройками.
 * Используется во всех приложениях монорепо (admin, platform, workspace).
 *
 * @example
 * ```tsx
 * <QueryProvider>
 *   <YourApp />
 * </QueryProvider>
 * ```
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Создаем QueryClient один раз при монтировании компонента
  // useState гарантирует, что клиент не будет пересоздаваться при ре-рендерах
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Данные считаются свежими 5 минут
            staleTime: 5 * 60 * 1000,
            // Кеш хранится 10 минут
            gcTime: 10 * 60 * 1000,
            // Не перезагружать при фокусе окна
            refetchOnWindowFocus: false,
            // Не перезагружать при переподключении
            refetchOnReconnect: false,
            // 2 попытки повтора при ошибке
            retry: 2,
            // Интервал между попытками (в мс)
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // 1 попытка для мутаций
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
