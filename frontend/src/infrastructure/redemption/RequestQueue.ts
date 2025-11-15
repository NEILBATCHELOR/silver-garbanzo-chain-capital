/**
 * Request Queue
 * Priority-based queue management for redemption requests
 */

import type { RedemptionRequest, QueueConfig, QueueItem, PriorityLevel } from './types';

export class RequestQueue {
  private queue: Map<string, QueueItem<RedemptionRequest>> = new Map();
  private processing: Set<string> = new Set();
  private config: QueueConfig;

  constructor(config: QueueConfig = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      processingInterval: config.processingInterval || 5000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 60000
    };
  }

  /**
   * Calculate priority score for a request
   */
  private calculatePriority(request: RedemptionRequest): number {
    let priority = 0;

    // Factor 1: Request age (older requests get higher priority)
    const ageHours = (Date.now() - new Date(request.requestedAt).getTime()) / 3600000;
    priority += Math.min(ageHours * 10, 100);

    // Factor 2: Priority level
    switch (request.metadata.priorityLevel) {
      case 'urgent':
        priority += 200;
        break;
      case 'priority':
        priority += 100;
        break;
      case 'standard':
        priority += 0;
        break;
    }

    // Factor 3: Amount (larger amounts get higher priority)
    const amountFactor = Math.log10(Number(request.amount) / 1e18) * 20;
    priority += Math.max(0, amountFactor);

    return priority;
  }

  /**
   * Get queue key for organization/grouping
   */
  private getQueueKey(request: RedemptionRequest): string {
    return `${request.tokenId}`;
  }

  /**
   * Add a request to the queue
   */
  async enqueue(request: RedemptionRequest): Promise<void> {
    if (this.queue.size >= (this.config.maxSize || 1000)) {
      throw new Error('Queue is full');
    }

    const priority = this.calculatePriority(request);
    const queueItem: QueueItem<RedemptionRequest> = {
      id: request.id,
      item: request,
      priority,
      enqueuedAt: new Date().toISOString(),
      retryCount: 0
    };

    this.queue.set(request.id, queueItem);
  }

  /**
   * Get next item from queue (highest priority)
   */
  dequeue(): RedemptionRequest | null {
    if (this.queue.size === 0) {
      return null;
    }

    // Find item with highest priority that's not being processed
    let highestPriority = -Infinity;
    let selectedId: string | null = null;

    for (const [id, item] of this.queue.entries()) {
      if (!this.processing.has(id) && item.priority > highestPriority) {
        highestPriority = item.priority;
        selectedId = id;
      }
    }

    if (!selectedId) {
      return null;
    }

    const item = this.queue.get(selectedId);
    if (!item) {
      return null;
    }

    // Mark as processing
    this.processing.add(selectedId);
    
    return item.item;
  }

  /**
   * Mark a request as completed and remove from queue
   */
  complete(requestId: string): void {
    this.queue.delete(requestId);
    this.processing.delete(requestId);
  }

  /**
   * Mark a request as failed and optionally retry
   */
  fail(requestId: string, shouldRetry: boolean = true): void {
    const item = this.queue.get(requestId);
    
    if (!item) {
      return;
    }

    this.processing.delete(requestId);

    if (shouldRetry && item.retryCount < (this.config.retryAttempts || 3)) {
      item.retryCount += 1;
      item.priority += 50; // Increase priority for retry
    } else {
      // Max retries exceeded, remove from queue
      this.queue.delete(requestId);
    }
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.size === 0;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    processing: number;
    waiting: number;
    priorityBreakdown: { urgent: number; priority: number; standard: number };
  } {
    const priorityBreakdown = { urgent: 0, priority: 0, standard: 0 };
    
    for (const item of this.queue.values()) {
      const level = item.item.metadata.priorityLevel;
      priorityBreakdown[level] += 1;
    }

    return {
      total: this.queue.size,
      processing: this.processing.size,
      waiting: this.queue.size - this.processing.size,
      priorityBreakdown
    };
  }

  /**
   * Clear the entire queue
   */
  clear(): void {
    this.queue.clear();
    this.processing.clear();
  }
}
