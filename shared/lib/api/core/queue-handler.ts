/**
 * Queue Handler - очередь запросов при offline
 */

import type { QueuedRequest, RequestConfig, ApiResult } from './types';

export class QueueHandler {
  private queue: QueuedRequest[] = [];
  private maxQueueSize: number;
  private isOnline: boolean = true;
  private isProcessing: boolean = false;

  constructor(maxQueueSize: number = 50) {
    this.maxQueueSize = maxQueueSize;
    this.setupOnlineListener();
  }

  /**
   * Проверить находится ли клиент в offline режиме
   */
  isOffline(): boolean {
    return !this.isOnline;
  }

  /**
   * Добавить запрос в очередь
   * Возвращает Promise который resolve'ится когда запрос выполнится
   */
  enqueue<T>(
    config: RequestConfig,
    executor: () => Promise<ApiResult<T>>
  ): Promise<ApiResult<T>> {
    return new Promise((resolve, reject) => {
      // Проверить размер очереди
      if (this.queue.length >= this.maxQueueSize) {
        reject(
          new Error(
            `Queue is full (max ${this.maxQueueSize}). Request rejected.`
          )
        );
        return;
      }

      // Добавить в очередь
      const queuedRequest: QueuedRequest = {
        id: this.generateId(),
        config,
        resolve: resolve as (value: ApiResult<unknown>) => void,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(queuedRequest);
    });
  }

  /**
   * Обработать очередь запросов
   */
  private async processQueue(): Promise<void> {
    // Если уже обрабатываем - пропустить
    if (this.isProcessing) {
      return;
    }

    // Если нет запросов в очереди - пропустить
    if (this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Обработать все запросы по порядку
    while (this.queue.length > 0) {
      // Проверить что все еще online
      if (!this.isOnline) {
        break;
      }

      // Взять первый запрос из очереди
      const request = this.queue.shift();
      if (!request) break;

      try {
        // Этот запрос должен быть выполнен через http-client
        // Мы не можем выполнить его здесь, так как у нас нет executor
        // Поэтому просто reject с информацией
        request.reject(
          new Error(
            'Queue processing not implemented. Requests should be retried manually.'
          )
        );
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Очистить очередь (отменить все запросы)
   */
  clearQueue(): void {
    this.queue.forEach((request) => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Получить размер очереди
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Настроить слушатель online/offline событий
   */
  private setupOnlineListener(): void {
    // Работает только в браузере
    if (typeof window === 'undefined') {
      return;
    }

    // Начальное состояние
    this.isOnline = navigator.onLine;

    // Слушать online события
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue().catch((error) => {
        console.error('Error processing queue:', error);
      });
    });

    // Слушать offline события
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Генерировать уникальный ID для запроса
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Проверить статус сети
   */
  checkOnlineStatus(): boolean {
    if (typeof window === 'undefined') {
      return true; // На сервере всегда считаем online
    }

    this.isOnline = navigator.onLine;
    return this.isOnline;
  }
}
