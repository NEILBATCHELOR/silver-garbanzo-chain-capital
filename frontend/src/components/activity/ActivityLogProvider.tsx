/**
 * Activity Log Provider
 * 
 * React context provider for activity logging functionality
 */

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { enhancedActivityService } from '@/services/activity';
import type { ActivityEvent, ActivityFilters, ActivityResult } from '@/services/activity';

interface ActivityLogContextType {
  logActivity: (activity: ActivityEvent) => Promise<void>;
  getActivities: (filters?: ActivityFilters) => Promise<ActivityResult>;
  getQueueMetrics: () => {
    queueSize: number;
    cacheSize: number;
    processingRate: number;
    errorRate: number;
  };
  flushQueue: () => Promise<void>;
  clearCache: () => void;
}

const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

interface ActivityLogProviderProps {
  children: ReactNode;
}

export const ActivityLogProvider: React.FC<ActivityLogProviderProps> = ({ children }) => {
  const logActivity = useCallback(async (activity: ActivityEvent) => {
    await enhancedActivityService.logActivity(activity);
  }, []);

  const getActivities = useCallback(async (filters?: ActivityFilters) => {
    return await enhancedActivityService.getActivities(filters);
  }, []);

  const getQueueMetrics = useCallback(() => {
    return enhancedActivityService.getQueueMetrics();
  }, []);

  const flushQueue = useCallback(async () => {
    await enhancedActivityService.flushQueue();
  }, []);

  const clearCache = useCallback(() => {
    enhancedActivityService.clearCache();
  }, []);

  const contextValue: ActivityLogContextType = {
    logActivity,
    getActivities,
    getQueueMetrics,
    flushQueue,
    clearCache
  };

  return (
    <ActivityLogContext.Provider value={contextValue}>
      {children}
    </ActivityLogContext.Provider>
  );
};

export const useActivityLog = (): ActivityLogContextType => {
  const context = useContext(ActivityLogContext);
  if (!context) {
    throw new Error('useActivityLog must be used within an ActivityLogProvider');
  }
  return context;
};

export default ActivityLogProvider;
