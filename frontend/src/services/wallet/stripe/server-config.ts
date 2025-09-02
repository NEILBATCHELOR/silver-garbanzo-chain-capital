// Server-side Stripe Configuration
// This should only be used in server-side environments (Node.js/API routes)

/**
 * Server-side Stripe configuration that includes secret keys
 * ⚠️ WARNING: This should NEVER be used in client-side code
 */
export const getServerStripeConfig = () => {
  // This would typically be used in server-side API routes or Node.js environments
  // For this frontend application, we'll use environment variables that would be
  // available in server-side contexts (e.g., Vercel functions, Express API routes)
  
  const config = {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    environment: (process.env.STRIPE_ENVIRONMENT as 'test' | 'live') || 'test',
    apiVersion: '2024-06-20' as const,
    publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '' // For reference only
  };

  return config;
};

/**
 * Validates that server-side Stripe configuration is complete
 */
export const validateServerStripeConfig = (): { isValid: boolean; missingKeys: string[] } => {
  const config = getServerStripeConfig();
  const missingKeys: string[] = [];
  
  if (!config.secretKey) {
    missingKeys.push('STRIPE_SECRET_KEY');
  }
  
  if (!config.webhookSecret) {
    missingKeys.push('STRIPE_WEBHOOK_SECRET');
  }
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys
  };
};

/**
 * Type-safe error for server-side Stripe configuration issues
 */
export class ServerStripeConfigError extends Error {
  constructor(message: string, public missingKeys: string[]) {
    super(message);
    this.name = 'ServerStripeConfigError';
  }
}

/**
 * Gets validated server-side Stripe configuration or throws
 */
export const getValidatedServerStripeConfig = () => {
  const config = getServerStripeConfig();
  const validation = validateServerStripeConfig();
  
  if (!validation.isValid) {
    throw new ServerStripeConfigError(
      `Missing required server-side Stripe configuration: ${validation.missingKeys.join(', ')}`,
      validation.missingKeys
    );
  }
  
  return config;
};

/**
 * Development-friendly server config that doesn't throw in dev mode
 */
export const getServerStripeConfigSafe = () => {
  const config = getServerStripeConfig();
  const validation = validateServerStripeConfig();
  
  if (!validation.isValid) {
    console.warn('⚠️ Server Stripe Config: Missing keys in development mode:', validation.missingKeys);
  }
  
  return {
    ...config,
    isConfigured: validation.isValid,
    missingKeys: validation.missingKeys
  };
};
