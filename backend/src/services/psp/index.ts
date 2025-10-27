/**
 * PSP Services - Complete Export
 * 
 * All Chain Capital Warp PSP services organized by domain.
 */

// Authentication & API Keys
import { ApiKeyService } from './auth/apiKeyService';
import { WarpClientService } from './auth/warpClientService';
import { PSPEncryptionService } from './security/pspEncryptionService';

// Webhooks
import { WebhookService } from './webhooks/webhookService';

// Identity Verification
import { IdentityService } from './identity/identityService';

// Accounts
import { ExternalAccountService } from './accounts/externalAccountService';
import { VirtualAccountService } from './accounts/virtualAccountService';
import { BalanceService } from './accounts/balanceService';

// Payments & Trades
import { PaymentService } from './payments/paymentService';
import { FiatPaymentService } from './payments/fiatPaymentService';
import { CryptoPaymentService } from './payments/cryptoPaymentService';
import { TradeService } from './payments/tradeService';

// Automation
import { SettingsService } from './automation/settingsService';
import { AutomationService } from './automation/automationService';

// Reporting
import { TransactionHistoryService } from './reporting/transactionHistoryService';
import { StatementGeneratorService } from './reporting/statementGeneratorService';

// Re-export all services
export {
  ApiKeyService,
  WarpClientService,
  PSPEncryptionService,
  WebhookService,
  IdentityService,
  ExternalAccountService,
  VirtualAccountService,
  BalanceService,
  PaymentService,
  FiatPaymentService,
  CryptoPaymentService,
  TradeService,
  SettingsService,
  AutomationService,
  TransactionHistoryService,
  StatementGeneratorService
};

// Grouped exports by domain
export * as Auth from './auth';
export * as Webhooks from './webhooks';
export * as Identity from './identity';
export * as Accounts from './accounts';
export * as Payments from './payments';
export * as Automation from './automation';
export * as Reporting from './reporting';

// Default export with all services
export default {
  // Auth
  ApiKeyService,
  WarpClientService,
  PSPEncryptionService,
  
  // Webhooks
  WebhookService,
  
  // Identity
  IdentityService,
  
  // Accounts
  ExternalAccountService,
  VirtualAccountService,
  BalanceService,
  
  // Payments
  PaymentService,
  FiatPaymentService,
  CryptoPaymentService,
  TradeService,
  
  // Automation
  SettingsService,
  AutomationService,
  
  // Reporting
  TransactionHistoryService,
  StatementGeneratorService
};
