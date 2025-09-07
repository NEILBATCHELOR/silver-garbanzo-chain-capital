/**
 * DFNS Official SDK Client - Replaces custom HTTP client
 * 
 * This file shows how to properly use the official DFNS SDK instead of the custom HTTP client
 */

import { DfnsApiClient } from '@dfns/sdk';
import { AsymmetricKeySigner } from '@dfns/sdk-keysigner';
import { WebAuthnSigner } from '@dfns/sdk-browser';
import { DFNS_CONFIG } from './config';

// ===== Proper SDK Client Initialization =====

/**
 * Create authenticated DFNS client using official SDK
 */
export function createAuthenticatedDfnsClient(): DfnsApiClient {
  // For Service Account authentication
  if (DFNS_CONFIG.serviceAccountId && DFNS_CONFIG.serviceAccountPrivateKey) {
    return new DfnsApiClient({
      appId: DFNS_CONFIG.appId,
      baseUrl: DFNS_CONFIG.baseUrl,
      signer: new AsymmetricKeySigner({
        privateKey: DFNS_CONFIG.serviceAccountPrivateKey,
        credId: DFNS_CONFIG.serviceAccountId,
      })
    });
  }

  // For WebAuthn authentication (delegated)
  return new DfnsApiClient({
    appId: DFNS_CONFIG.appId,
    baseUrl: DFNS_CONFIG.baseUrl,
    // WebAuthn signer will be added during authentication flow
  });
}

/**
 * Example: Real wallet creation using official SDK
 */
export async function createWalletExample(): Promise<any> {
  const client = createAuthenticatedDfnsClient();
  
  // This is a REAL API call, not mock data
  const response = await client.wallets.createWallet({
    body: {
      network: 'Ethereum',
      name: 'My Test Wallet'
    }
  });
  
  return response;
}

/**
 * Example: Real wallet listing using official SDK
 */
export async function listWalletsExample(): Promise<any> {
  const client = createAuthenticatedDfnsClient();
  
  // This is a REAL API call, not mock data - FIXED
  const response = await client.wallets.listWallets({
    query: {
      paginationToken: undefined,
      limit: '10'
    }
  });
  
  return response;
}

/**
 * Example: Real asset transfer using official SDK
 */
export async function transferAssetExample(walletId: string): Promise<any> {
  const client = createAuthenticatedDfnsClient();
  
  // This is a REAL API call, not mock data
  const response = await client.wallets.transferAsset({
    walletId,
    body: {
      kind: 'Native', // Required field for DFNS transfer
      to: '0x742d35Cc6635C0532925a3b8D65eea10B2D89c10',
      amount: '100000000000000000' // Amount in wei for native ETH transfer
    }
  });
  
  return response;
}

/**
 * Example: Real wallet balances using official SDK
 */
export async function getWalletAssetsExample(walletId: string): Promise<any> {
  const client = createAuthenticatedDfnsClient();
  
  // This is a REAL API call, not mock data
  const response = await client.wallets.getWalletAssets({
    walletId
  });
  
  return response;
}
