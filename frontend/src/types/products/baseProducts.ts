/**
 * Base product type definitions
 */

import { ProjectType } from '@/types/projects/projectTypes';

/**
 * Common base interface for all products
 */
export interface BaseProduct {
  id: string;
  projectId: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  targetRaise?: number;
}
