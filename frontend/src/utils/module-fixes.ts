// src/utils/module-fixes.ts
// Fix for "Class extends value [object Module] is not a constructor or null"

// Ensure proper default exports for problematic modules
export const ensureDefaultExport = <T>(module: T | { default: T }): T => {
  if (module && typeof module === 'object' && 'default' in module) {
    return (module as { default: T }).default
  }
  return module as T
}

// Fix for async module loading
export const loadModule = async <T>(moduleLoader: () => Promise<T | { default: T }>): Promise<T> => {
  const module = await moduleLoader()
  return ensureDefaultExport(module)
}

// Type-safe dynamic import wrapper
export const safeDynamicImport = async <T>(
  importFn: () => Promise<T | { default: T }>
): Promise<T> => {
  try {
    const module = await importFn()
    return ensureDefaultExport(module)
  } catch (error) {
    console.error('Dynamic import failed:', error)
    throw error
  }
}

// Re-export commonly problematic modules with fixes
export const getInvestorTypes = () => loadModule(() => import('./compliance/investorTypes'))
export const getInvestorService = () => loadModule(() => import('../services/investor/investors'))
export const getTokenService = () => loadModule(() => import('../components/tokens/services/tokenService'))
export const getActivityLogger = () => loadModule(() => import('../infrastructure/activityLogger'))
export const getApprovalService = () => loadModule(() => import('../services/policy/approvalService'))
