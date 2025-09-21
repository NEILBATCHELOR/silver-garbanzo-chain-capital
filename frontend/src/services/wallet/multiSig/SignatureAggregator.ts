/**
 * Signature Aggregator Service
 * Aggregates multiple signatures for different blockchain types
 */

import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { ChainType } from '../AddressUtils';
import type { ProposalSignature, MultiSigWallet } from './MultiSigTransactionService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AggregatedSignature {
  type: 'single' | 'multi';
  signature: string;
  signers: string[];
}

export interface EVMMultiSigData {
  v: number[];
  r: string[];
  s: string[];
}

export interface BitcoinMultiSigScript {
  redeemScript: Buffer;
  witnessScript?: Buffer;
  signatures: Buffer[];
}

// ============================================================================
// SIGNATURE AGGREGATOR
// ============================================================================

export class SignatureAggregator {
  /**
   * Main aggregation method - routes to chain-specific implementations
   */
  async aggregate(
    transaction: any,
    signatures: ProposalSignature[],
    chainType: ChainType,
    wallet: MultiSigWallet
  ): Promise<string> {
    // Route to appropriate aggregator
    if (this.isEVMChain(chainType)) {
      return this.aggregateEVMSignatures(transaction, signatures, wallet);
    }
    
    if (chainType === ChainType.BITCOIN) {
      return this.aggregateBitcoinSignatures(transaction, signatures, wallet);
    }
    
    if (chainType === ChainType.SOLANA) {
      return this.aggregateSolanaSignatures(transaction, signatures, wallet);
    }

    throw new Error(`Signature aggregation not implemented for ${chainType}`);
  }

  // ============================================================================
  // EVM SIGNATURE AGGREGATION
  // ============================================================================

  private aggregateEVMSignatures(
    transaction: any,
    signatures: ProposalSignature[],
    wallet: MultiSigWallet
  ): string {
    try {
      // Parse signatures into v, r, s components
      const parsedSignatures = signatures.map(sig => {
        const signature = sig.signature.startsWith('0x') 
          ? sig.signature 
          : '0x' + sig.signature;
        
        const splitSig = ethers.Signature.from(signature);
        return {
          v: splitSig.v,
          r: splitSig.r,
          s: splitSig.s,
          signer: sig.signerAddress
        };
      });

      // Sort signatures by signer address (required for some multi-sig contracts)
      parsedSignatures.sort((a, b) => 
        a.signer.toLowerCase().localeCompare(b.signer.toLowerCase())
      );

      // Create aggregated signature data
      const multiSigData: EVMMultiSigData = {
        v: parsedSignatures.map(s => s.v),
        r: parsedSignatures.map(s => s.r),
        s: parsedSignatures.map(s => s.s)
      };

      // Encode for smart contract execution
      const encodedSignatures = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8[]', 'bytes32[]', 'bytes32[]'],
        [multiSigData.v, multiSigData.r, multiSigData.s]
      );

      // Build final transaction with signatures
      const finalTx = {
        ...transaction,
        signatures: encodedSignatures
      };

      // Serialize transaction
      return ethers.Transaction.from(finalTx).serialized;

    } catch (error) {
      throw new Error(`EVM signature aggregation failed: ${error.message}`);
    }
  }

  // ============================================================================
  // BITCOIN SIGNATURE AGGREGATION (P2SH/P2WSH)
  // ============================================================================

  private aggregateBitcoinSignatures(
    transaction: any,
    signatures: ProposalSignature[],
    wallet: MultiSigWallet
  ): string {
    try {
      // Parse transaction
      const psbt = bitcoin.Psbt.fromBase64(transaction.psbt);
      
      // Add signatures to PSBT
      signatures.forEach((sig, index) => {
        const signature = Buffer.from(sig.signature, 'hex');
        const pubkey = Buffer.from(wallet.owners[index], 'hex');
        
        // Add partial signature for each input
        for (let i = 0; i < psbt.inputCount; i++) {
          psbt.addSignature(i, {
            pubkey,
            signature
          });
        }
      });

      // Validate signatures meet threshold
      if (!psbt.validateSignaturesOfAllInputs()) {
        throw new Error('Invalid Bitcoin signatures');
      }

      // Finalize if we have enough signatures
      if (signatures.length >= wallet.threshold) {
        psbt.finalizeAllInputs();
        return psbt.extractTransaction().toHex();
      }

      // Return partially signed transaction
      return psbt.toBase64();

    } catch (error) {
      throw new Error(`Bitcoin signature aggregation failed: ${error.message}`);
    }
  }
  // ============================================================================
  // SOLANA SIGNATURE AGGREGATION
  // ============================================================================

  private aggregateSolanaSignatures(
    transaction: any,
    signatures: ProposalSignature[],
    wallet: MultiSigWallet
  ): string {
    try {
      // Deserialize transaction
      const tx = Transaction.from(Buffer.from(transaction.serialized, 'base64'));
      
      // Add signatures
      signatures.forEach(sig => {
        const signature = Buffer.from(sig.signature, 'hex');
        const pubkey = new PublicKey(sig.signerAddress);
        
        // Find the index of this signer
        const signerIndex = tx.signatures.findIndex(s => 
          s.publicKey.equals(pubkey)
        );
        
        if (signerIndex >= 0) {
          tx.signatures[signerIndex].signature = signature;
        }
      });

      // Verify we have enough signatures
      const validSignatures = tx.signatures.filter(s => s.signature !== null);
      if (validSignatures.length < wallet.threshold) {
        throw new Error(`Insufficient Solana signatures: ${validSignatures.length}/${wallet.threshold}`);
      }

      // Serialize signed transaction
      return Buffer.from(tx.serialize()).toString('base64');

    } catch (error) {
      throw new Error(`Solana signature aggregation failed: ${error.message}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Verify signature validity
   */
  async verifySignature(
    message: string,
    signature: string,
    signerAddress: string,
    chainType: ChainType
  ): Promise<boolean> {
    try {
      if (this.isEVMChain(chainType)) {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === signerAddress.toLowerCase();
      }

      // Add other chain verification as needed
      return false;

    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Check if chain is EVM compatible
   */
  private isEVMChain(chainType: ChainType): boolean {
    const evmChains = [
      ChainType.ETHEREUM,
      ChainType.POLYGON,
      ChainType.ARBITRUM,
      ChainType.OPTIMISM,
      ChainType.BASE,
      ChainType.BSC,
      ChainType.AVALANCHE,
      ChainType.ZKSYNC
    ];
    return evmChains.includes(chainType);
  }

  /**
   * Create multi-sig script for Bitcoin
   */
  createBitcoinMultiSigScript(
    m: number,
    pubkeys: Buffer[]
  ): Buffer {
    return bitcoin.script.multisig.output.encode(m, pubkeys);
  }

  /**
   * Create Solana multi-sig instruction
   */
  createSolanaMultiSigInstruction(
    programId: PublicKey,
    multiSigAccount: PublicKey,
    signers: PublicKey[],
    m: number
  ): any {
    // This would use the Solana multi-sig program
    // Implementation depends on specific program being used
    return {
      programId,
      keys: [
        { pubkey: multiSigAccount, isSigner: false, isWritable: true },
        ...signers.map(signer => ({
          pubkey: signer,
          isSigner: true,
          isWritable: false
        }))
      ],
      data: Buffer.from([m]) // Threshold
    };
  }
}