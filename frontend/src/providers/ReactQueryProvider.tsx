/**
 * React Query Provider Configuration
 * 
 * Sets up React Query with optimized caching configuration for the token dashboard
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Note: ReactQueryDevtools may need to be installed separately if not available
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create a client with optimized settings for token caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // GC time - how long data stays in cache after component unmounts (replaces cacheTime)
      gcTime: 15 * 60 * 1000, // 15 minutes
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      
      // Retry delay
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Background refetch settings
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: 'always',
      
      // Use error boundary (throwOnError replaces deprecated useErrorBoundary)
      throwOnError: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      
      // Use error boundary for mutations (throwOnError replaces useErrorBoundary)
      throwOnError: false,
    },
  },
});

interface ReactQueryProviderProps {
  children: React.ReactNode;
}

export const ReactQueryProvider: React.FC<ReactQueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show React Query devtools in development */}
      {/* ReactQueryDevtools is commented out until package is installed
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
      */}
    </QueryClientProvider>
  );
};

export { queryClient };
export default ReactQueryProvider;