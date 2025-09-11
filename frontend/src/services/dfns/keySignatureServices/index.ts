/**
 * DFNS Key Signature Services - Index
 * 
 * Export all DFNS key signature generation services
 * Supports 14+ blockchain networks with specialized services
 */

// Core Key Signature Service
export { 
  DfnsKeySignatureGenerationService,
  getDfnsKeySignatureGenerationService 
} from './keySignatureGenerationService';

export type {
  DfnsKeySignatureRequest,
  DfnsKeySignatureBody,
  DfnsKeySignatureResponse,
  DfnsSignature,
  // Universal types
  DfnsHashSignature,
  DfnsMessageSignature,
  // EVM types
  DfnsEvmTransactionSignature,
  DfnsEvmMessageSignature,
  DfnsEvmEip712Signature,
  DfnsEvmEip7702Signature,
  // Bitcoin types
  DfnsBitcoinPsbtSignature,
  DfnsBitcoinBip322Signature,
  // Solana types
  DfnsSolanaTransactionSignature,
  // Cosmos types
  DfnsCosmosSignDocDirectSignature,
  // Other blockchain types
  DfnsAlgorandTransactionSignature,
  DfnsAptosTransactionSignature,
  DfnsCardanoTransactionSignature,
  DfnsStellarTransactionSignature,
  DfnsSubstrateSignerPayloadSignature,
  DfnsTezosOperationSignature,
  DfnsTonRawPayloadSignature,
  DfnsTronTransactionSignature,
  DfnsXrpLedgerTransactionSignature
} from './keySignatureGenerationService';

// Specialized Blockchain Services
export { 
  DfnsEvmKeySignatureService,
  getDfnsEvmKeySignatureService 
} from './evmKeySignatureService';

export type {
  EvmTransactionInput,
  Eip712TypedData,
  Eip7702Authorization,
  EvmSignatureOptions,
  EvmNetworkName
} from './evmKeySignatureService';

export { 
  DfnsBitcoinKeySignatureService,
  getDfnsBitcoinKeySignatureService 
} from './bitcoinKeySignatureService';

export type {
  BitcoinPsbtInput,
  BitcoinBip322Input,
  BitcoinSignatureOptions,
  BitcoinUtxo,
  BitcoinTransactionInput,
  BitcoinNetworkName
} from './bitcoinKeySignatureService';

// Network Constants
export { EVM_NETWORKS } from './evmKeySignatureService';
export { BITCOIN_NETWORKS } from './bitcoinKeySignatureService';