/**
 * Multi-Sig ABI Service
 * 
 * Handles automatic ABI population for multi-sig wallets
 * from compiled Foundry contracts.
 * 
 * Browser-compatible version using direct JSON imports
 */

import { supabase } from '@/infrastructure/database/client';
// Import the ABI JSON file directly - Vite handles this
import multiSigABI from '../../../../foundry-contracts/out/MultiSigWallet.sol/MultiSigWallet.json';

interface ABIFile {
  abi: any[];
  bytecode: any;
  deployedBytecode: any;
}

export class MultiSigABIService {
  private static instance: MultiSigABIService;
  private abiCache: { abi: any[]; abiHash: string } | null = null;

  private constructor() {}

  public static getInstance(): MultiSigABIService {
    if (!MultiSigABIService.instance) {
      MultiSigABIService.instance = new MultiSigABIService();
    }
    return MultiSigABIService.instance;
  }

  /**
   * Generate SHA-256 hash using browser crypto API
   */
  private async generateABIHash(abi: any[]): Promise<string> {
    const abiString = JSON.stringify(abi);
    const encoder = new TextEncoder();
    const data = encoder.encode(abiString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Load ABI from imported Foundry contract
   */
  private async loadABIFromFoundry(): Promise<{ abi: any[]; abiHash: string }> {
    // Use cached version if available
    if (this.abiCache) {
      return this.abiCache;
    }

    try {
      const abiFile = multiSigABI as ABIFile;
      const abi = abiFile.abi;
      
      // Generate ABI hash using browser-compatible crypto
      const abiHash = await this.generateABIHash(abi);
      
      console.log(`✅ ABI loaded from Foundry: ${abi.length} function/event definitions`);
      console.log(`🔐 ABI Hash: ${abiHash}`);
      
      // Cache the result
      this.abiCache = { abi, abiHash };
      
      return { abi, abiHash };
    } catch (error) {
      console.error('❌ Failed to load ABI from Foundry:', error);
      throw new Error('Failed to load ABI from Foundry contracts');
    }
  }

  /**
   * Populate ABI for a specific wallet
   */
  public async populateWalletABI(walletId: string): Promise<void> {
    try {
      console.log(`📝 Populating ABI for wallet ${walletId}...`);
      
      // Load ABI from Foundry
      const { abi } = await this.loadABIFromFoundry();
      
      // Update wallet ABI
      const { error: updateError } = await supabase
        .from('multi_sig_wallets')
        .update({ 
          abi,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId);
      
      if (updateError) {
        throw new Error(`Failed to update wallet ABI: ${updateError.message}`);
      }
      
      console.log(`✅ Successfully populated ABI for wallet ${walletId}`);
    } catch (error: any) {
      console.error(`❌ Failed to populate ABI for wallet ${walletId}:`, error);
      throw error;
    }
  }

  /**
   * Populate ABI for wallet and its contract master entry
   */
  public async populateWalletAndContractMasterABI(
    walletId: string,
    walletAddress: string,
    blockchain: string
  ): Promise<void> {
    try {
      console.log(`📝 Populating ABI for wallet ${walletId} and contract master...`);
      
      // Load ABI from Foundry
      const { abi, abiHash } = await this.loadABIFromFoundry();
      
      // Update wallet ABI
      const { error: walletError } = await supabase
        .from('multi_sig_wallets')
        .update({ 
          abi,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId);
      
      if (walletError) {
        throw new Error(`Failed to update wallet ABI: ${walletError.message}`);
      }
      
      console.log(`✅ Updated wallet ABI`);
      
      // Check if contract master exists
      const { data: existingContract } = await supabase
        .from('contract_masters')
        .select('id')
        .eq('contract_address', walletAddress)
        .eq('contract_type', 'MultiSigWallet')
        .maybeSingle();
      
      if (existingContract) {
        // Update existing contract master
        const { error: contractError } = await supabase
          .from('contract_masters')
          .update({
            abi,
            abi_hash: abiHash,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingContract.id);
        
        if (contractError) {
          console.error('❌ Failed to update contract master ABI:', contractError);
        } else {
          console.log(`✅ Updated contract master ABI`);
        }
      }
      
      console.log(`✅ Successfully populated ABI for wallet ${walletId}`);
    } catch (error: any) {
      console.error(`❌ Failed to populate ABI:`, error);
      // Don't throw - ABI population is non-critical for wallet functionality
      console.warn('⚠️ Wallet created successfully but ABI population failed');
    }
  }

  /**
   * Populate ABIs for all wallets without ABIs
   */
  public async populateAllMissingABIs(): Promise<{
    walletsUpdated: number;
    contractsUpdated: number;
  }> {
    try {
      console.log('🚀 Starting bulk ABI population...\n');
      
      // Load ABI from Foundry
      const { abi, abiHash } = await this.loadABIFromFoundry();
      
      // Update wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('multi_sig_wallets')
        .select('id, name, address, blockchain')
        .is('abi', null);
      
      if (walletsError) {
        throw new Error(`Failed to fetch wallets: ${walletsError.message}`);
      }
      
      let walletsUpdated = 0;
      if (wallets && wallets.length > 0) {
        console.log(`Found ${wallets.length} wallets with NULL ABI\n`);
        
        for (const wallet of wallets) {
          const { error: updateError } = await supabase
            .from('multi_sig_wallets')
            .update({ 
              abi,
              updated_at: new Date().toISOString()
            })
            .eq('id', wallet.id);
          
          if (updateError) {
            console.error(`❌ Failed to update wallet ${wallet.id}: ${updateError.message}`);
          } else {
            console.log(`✅ Updated wallet: ${wallet.name} (${wallet.address})`);
            walletsUpdated++;
          }
        }
      }
      
      // Update contract masters
      const { data: contracts, error: contractsError } = await supabase
        .from('contract_masters')
        .select('id, network, contract_address, contract_type')
        .eq('contract_type', 'MultiSigWallet')
        .is('abi', null);
      
      if (contractsError) {
        throw new Error(`Failed to fetch contracts: ${contractsError.message}`);
      }
      
      let contractsUpdated = 0;
      if (contracts && contracts.length > 0) {
        console.log(`Found ${contracts.length} contract masters with NULL ABI\n`);
        
        for (const contract of contracts) {
          const { error: updateError } = await supabase
            .from('contract_masters')
            .update({
              abi,
              abi_hash: abiHash,
              updated_at: new Date().toISOString()
            })
            .eq('id', contract.id);
          
          if (updateError) {
            console.error(`❌ Failed to update contract ${contract.id}: ${updateError.message}`);
          } else {
            console.log(`✅ Updated contract: ${contract.network} - ${contract.contract_address}`);
            contractsUpdated++;
          }
        }
      }
      
      console.log(`\n📊 Summary:`);
      console.log(`   • Wallets updated: ${walletsUpdated}`);
      console.log(`   • Contract Masters updated: ${contractsUpdated}`);
      console.log(`   • ABI Hash: ${abiHash.substring(0, 16)}...`);
      
      return { walletsUpdated, contractsUpdated };
    } catch (error: any) {
      console.error('❌ Error during bulk ABI population:', error);
      throw error;
    }
  }
}

export const multiSigABIService = MultiSigABIService.getInstance();
