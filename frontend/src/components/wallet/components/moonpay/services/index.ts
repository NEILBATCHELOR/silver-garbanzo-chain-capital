/**
 * MoonPay Services - Redirect to Proper Services Location
 * 
 * This file redirects to the consolidated MoonPay services in /src/services/wallet/moonpay/
 * All MoonPay services have been moved to the proper location following the recommended architecture.
 */

// Re-export all services from the proper services location
export * from '@/services/wallet/moonpay';

// For backwards compatibility, provide direct access to the service manager
export { 
  moonPayServices as moonpayServices,
  createMoonPayServices as createMoonpayServices,
  checkMoonPayServicesHealth as checkServicesHealth,
  MoonPayUtils as MoonpayUtils
} from '@/services/wallet/moonpay';

// Legacy compatibility exports
export {
  moonPayServices as default
} from '@/services/wallet/moonpay';
