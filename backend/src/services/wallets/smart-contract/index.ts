// Smart Contract Wallet Services
export { FacetRegistryService } from './FacetRegistryService'
export { SmartContractWalletService } from './SmartContractWalletService'
export { WebAuthnService } from '../webauthn/WebAuthnService'

// Types and interfaces
export type { 
  FacetInfo, 
  RegisteredFacet 
} from './FacetRegistryService'

export type { 
  SmartContractWallet, 
  FacetOperation, 
  DiamondCutOperation 
} from './SmartContractWalletService'

export type { 
  WebAuthnCredential,
  WebAuthnRegistrationOptions,
  WebAuthnAuthenticationOptions,
  WebAuthnRegistrationResponse,
  WebAuthnAuthenticationResponse
} from '../webauthn/WebAuthnService'
