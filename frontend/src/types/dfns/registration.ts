/**
 * DFNS Registration Types - Complete type definitions for registration API
 * 
 * This file defines all TypeScript interfaces needed for DFNS registration
 * endpoints and workflows, based on the official DFNS API documentation.
 */

// ===== Core Registration Types =====

export interface RegistrationInitRequest {
  username: string;
  registrationCode: string;
  orgId?: string;
}

export interface RegistrationChallenge {
  user: RegistrationUser;
  temporaryAuthenticationToken: string;
  supportedCredentialKinds: SupportedCredentialKinds;
  challenge: string;
  challengeIdentifier: string;
  expiresAt: string;
  pubKeyCredParam: PublicKeyCredentialParameters[];
  rp: RelyingParty;
  allowCredentials?: PublicKeyCredentialDescriptor[];
}

export interface RegistrationUser {
  id: string;
  username: string;
  orgId: string;
  status: 'PendingRegistration' | 'Active' | 'Inactive';
}

export interface SupportedCredentialKinds {
  firstFactorCredentials: CredentialKind[];
  secondFactorCredentials: CredentialKind[];
  recoveryCredentials: CredentialKind[];
}

export type CredentialKind = 'Fido2' | 'Key' | 'PasswordProtectedKey' | 'RecoveryKey';

export interface PublicKeyCredentialParameters {
  alg: number;
  type: string;
}

export interface RelyingParty {
  id: string;
  name: string;
}

export interface PublicKeyCredentialDescriptor {
  id: string;
  type: string;
  transports?: string[];
}

// ===== Registration Completion Types =====

export interface CompleteRegistrationRequest {
  challengeIdentifier: string;
  firstFactor: CredentialRegistration;
  secondFactor?: CredentialRegistration;
  recoveryCredential?: CredentialRegistration;
}

export interface EndUserRegistrationRequest extends CompleteRegistrationRequest {
  wallets?: WalletSpec[];
}

export interface CredentialRegistration {
  credentialKind: CredentialKind;
  credentialName: string;
  credentialInfo: Fido2CredentialInfo | KeyCredentialInfo | PasswordProtectedKeyInfo;
}

// ===== Credential Info Types =====

export interface Fido2CredentialInfo {
  credId: string;
  clientData: string;
  attestationData: string;
  transports?: AuthenticatorTransport[];
}

export interface KeyCredentialInfo {
  publicKey: string;
  signature: string;
}

export interface PasswordProtectedKeyInfo {
  encryptedPrivateKey: string;
  publicKey: string;
}

export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid';

// ===== Wallet Specification =====

export interface WalletSpec {
  network: string;
  name?: string;
  externalId?: string;
  tags?: string[];
}

// ===== Registration Result =====

export interface RegistrationResult {
  user: RegisteredUser;
  wallets?: RegisteredWallet[];
  permissions?: string[];
}

export interface RegisteredUser {
  id: string;
  username: string;
  email?: string;
  status: 'Active' | 'PendingEmailVerification';
  kind: 'EndUser' | 'Employee' | 'PatientUser';
  orgId: string;
  registeredAt: string;
  credentials: RegisteredCredential[];
}

export interface RegisteredCredential {
  credentialId: string;
  name: string;
  kind: CredentialKind;
  status: 'Active' | 'Inactive';
  enrolledAt: string;
}

export interface RegisteredWallet {
  walletId: string;
  network: string;
  address: string;
  name?: string;
  status: 'Active' | 'Inactive';
}

// ===== Registration Code Management =====

export interface RegistrationCodeRequest {
  username: string;
  orgId?: string;
}

// ===== Social Registration =====

export interface SocialRegistrationRequest {
  idToken: string;
  providerKind: SocialProvider;
  orgId?: string;
}

export type SocialProvider = 'Google' | 'GitHub' | 'Microsoft' | 'Apple';

// ===== Registration State Management =====

export interface RegistrationState {
  step: RegistrationStep;
  challenge?: RegistrationChallenge;
  completedCredentials: CompletedCredential[];
  pendingCredentials: PendingCredential[];
  walletSpecs: WalletSpec[];
  isEndUserRegistration: boolean;
}

export type RegistrationStep = 
  | 'init'
  | 'first_factor'
  | 'second_factor'
  | 'recovery'
  | 'wallet_config'
  | 'complete';

export interface CompletedCredential {
  type: 'first_factor' | 'second_factor' | 'recovery';
  kind: CredentialKind;
  name: string;
  credentialInfo: any;
}

export interface PendingCredential {
  type: 'first_factor' | 'second_factor' | 'recovery';
  kind: CredentialKind;
  name: string;
  required: boolean;
}

// ===== Registration Configuration =====

export interface RegistrationConfig {
  allowedCredentialKinds: CredentialKind[];
  requiresRecoveryCredential: boolean;
  allowsSecondFactor: boolean;
  socialProviders: SocialProvider[];
  defaultWalletNetworks: string[];
  autoCreateWallets: boolean;
  assignDefaultPermissions: boolean;
}

// ===== Registration Errors =====

export interface RegistrationError {
  code: RegistrationErrorCode;
  message: string;
  details?: any;
  field?: string;
}

export type RegistrationErrorCode =
  | 'INVALID_REGISTRATION_CODE'
  | 'USERNAME_ALREADY_EXISTS'
  | 'INVALID_USERNAME'
  | 'CHALLENGE_EXPIRED'
  | 'INVALID_CREDENTIAL'
  | 'CREDENTIAL_ALREADY_EXISTS'
  | 'UNSUPPORTED_CREDENTIAL_KIND'
  | 'RECOVERY_CREDENTIAL_REQUIRED'
  | 'SOCIAL_TOKEN_INVALID'
  | 'ORGANIZATION_NOT_FOUND'
  | 'REGISTRATION_DISABLED';

// ===== Registration Events =====

export interface RegistrationEvent {
  type: RegistrationEventType;
  timestamp: string;
  userId?: string;
  data?: any;
}

export type RegistrationEventType =
  | 'registration_initiated'
  | 'challenge_created'
  | 'credential_registered'
  | 'registration_completed'
  | 'registration_failed'
  | 'code_resent'
  | 'social_registration_initiated';

// ===== Utility Types =====

export interface RegistrationProgress {
  currentStep: RegistrationStep;
  completedSteps: RegistrationStep[];
  totalSteps: number;
  percentComplete: number;
  estimatedTimeRemaining?: number;
}

export interface RegistrationMetrics {
  totalRegistrations: number;
  successfulRegistrations: number;
  failedRegistrations: number;
  averageCompletionTime: number;
  mostCommonFailureReason: RegistrationErrorCode;
  credentialKindUsage: Record<CredentialKind, number>;
}

// ===== Type Guards =====

export function isRegistrationChallenge(obj: any): obj is RegistrationChallenge {
  return obj && 
         typeof obj.challengeIdentifier === 'string' &&
         typeof obj.temporaryAuthenticationToken === 'string' &&
         obj.user && typeof obj.user.username === 'string';
}

export function isRegistrationError(obj: any): obj is RegistrationError {
  return obj && 
         typeof obj.code === 'string' &&
         typeof obj.message === 'string';
}

export function isFido2CredentialInfo(obj: any): obj is Fido2CredentialInfo {
  return obj &&
         typeof obj.credId === 'string' &&
         typeof obj.clientData === 'string' &&
         typeof obj.attestationData === 'string';
}

export function isKeyCredentialInfo(obj: any): obj is KeyCredentialInfo {
  return obj &&
         typeof obj.publicKey === 'string' &&
         typeof obj.signature === 'string';
}

// ===== Helper Functions =====

export function createRegistrationState(challenge?: RegistrationChallenge): RegistrationState {
  return {
    step: challenge ? 'first_factor' : 'init',
    challenge,
    completedCredentials: [],
    pendingCredentials: [],
    walletSpecs: [],
    isEndUserRegistration: false
  };
}

export function calculateRegistrationProgress(state: RegistrationState): RegistrationProgress {
  const stepOrder: RegistrationStep[] = ['init', 'first_factor', 'second_factor', 'recovery', 'wallet_config', 'complete'];
  const currentIndex = stepOrder.indexOf(state.step);
  
  return {
    currentStep: state.step,
    completedSteps: stepOrder.slice(0, currentIndex),
    totalSteps: stepOrder.length,
    percentComplete: Math.round((currentIndex / stepOrder.length) * 100),
    estimatedTimeRemaining: (stepOrder.length - currentIndex) * 30 // 30 seconds per step estimate
  };
}

export function validateCredentialKind(kind: string, supportedKinds: SupportedCredentialKinds): boolean {
  return [...supportedKinds.firstFactorCredentials, 
          ...supportedKinds.secondFactorCredentials, 
          ...supportedKinds.recoveryCredentials].includes(kind as CredentialKind);
}

export function getRequiredCredentials(config: RegistrationConfig): PendingCredential[] {
  const credentials: PendingCredential[] = [
    {
      type: 'first_factor',
      kind: config.allowedCredentialKinds[0] || 'Fido2',
      name: 'Primary Authentication',
      required: true
    }
  ];

  if (config.requiresRecoveryCredential) {
    credentials.push({
      type: 'recovery',
      kind: 'RecoveryKey',
      name: 'Account Recovery',
      required: true
    });
  }

  return credentials;
}
