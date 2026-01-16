/**
 * Backend Types Entry Point
 * Centralized exports for all backend types organized by domain
 */

// Re-export Prisma-generated types (base models and database types)
export * from '@/infrastructure/database/generated/index'

// Domain-specific types (avoiding conflicts with Prisma types)
export * from './api'
export * from './auth'
export * from './projects'
export type {
  // Only export non-conflicting types from investors
  InvestorWithStats,
  InvestorStatistics,
  InvestorCreateRequest,
  InvestorUpdateRequest,
  InvestorQueryOptions,
  InvestorValidationResult,
  InvestorCreationResult,
  BulkInvestorUpdateRequest,
  InvestorComplianceSummary,
  InvestorAnalytics,
  InvestorAuditEntry
} from './investors'
export * from './tokens'
export * from './blockchain'
export * from './compliance'
export * from './analytics'
export * from './files'
export * from './system'
export * from './utils'
export * from './xrpl'

// Service-specific types
export * from '../types/captable-service'
export * from '../types/project-service'
export * from './subscriptions'
export type {
  // Only export non-conflicting types from user-role-service
  User as ServiceUser,
  Role,
  Permission,
  UserStatus,
  UserResponse,
  UserCreateRequest,
  UserUpdateRequest,
  UserQueryOptions,
  RoleResponse,
  RoleCreateRequest,
  RoleUpdateRequest,
  RoleQueryOptions,
  PermissionsResponse,
  UserStatistics,
  RoleStatistics,
  PermissionStatistics,
  UserAnalytics,
  SecurityEvent,
  UserAuditEntry
} from '../types/user-role-service'

// PSP (Payment Service Provider) types - Export with aliases to avoid conflicts
export type {
  PSPEnvironment,
  PSPApiKeyStatus,
  WebhookStatus,
  IdentityCaseType,
  IdentityCaseStatus,
  ExternalAccountType,
  CurrencyType,
  AccountClassification,
  TransferMethod,
  ExternalAccountStatus,
  VirtualAccountType,
  VirtualAccountStatus,
  PaymentType,
  PaymentDirection,
  SourceDestinationType,
  PaymentRail,
  PaymentStatus,
  TradeStatus as PSPTradeStatus, // Alias to avoid conflict with Prisma's TradeStatus
  AssetType,
  WithdrawalFrequency,
  PSPApiKey,
  CreateApiKeyRequest,
  ApiKeyResponse,
  PSPWebhook,
  RegisterWebhookRequest,
  WebhookEvent,
  WebhookEventName,
  BusinessData,
  PersonData,
  Address,
  PSPIdentityCase,
  CreateIdentityCaseRequest,
  PSPExternalAccount,
  CreateExternalAchAccountRequest,
  CreateExternalWireAccountRequest,
  CreateExternalCryptoAccountRequest,
  PSPVirtualAccount,
  DepositInstructions,
  CryptoDepositAddress,
  CreateVirtualAccountRequest,
  PSPPayment,
  CreateFiatPaymentRequest,
  CreateCryptoPaymentRequest,
  PSPTrade,
  CreateTradeRequest,
  MarketRate,
  PSPBalance,
  WalletInfo,
  PSPPaymentSettings,
  UpdatePaymentSettingsRequest,
  TransactionHistoryQuery,
  TransactionSummary,
  PSPServiceResult,
  WarpApiError,
  EncryptedReference,
  PIIType,
  WarpApiResponse,
  WarpWebhookEventPayload
} from './psp'
