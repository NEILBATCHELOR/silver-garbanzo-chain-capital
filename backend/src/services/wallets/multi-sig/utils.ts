/**
 * Multi-Sig Wallet Utilities
 * Helper functions for working with multi-sig wallets
 */

import { getDatabase } from '../../../infrastructure/database/client';

/**
 * Get owner addresses for a multi-sig wallet
 * Joins multi_sig_wallet_owners with user_addresses to return actual blockchain addresses
 */
export async function getWalletOwnerAddresses(walletId: string): Promise<string[]> {
  const db = getDatabase();
  
  const owners = await db.multi_sig_wallet_owners.findMany({
    where: { wallet_id: walletId },
    select: {
      user_addresses: {
        select: {
          address: true
        }
      }
    }
  });
  
  // Extract addresses, filtering out any nulls
  return owners
    .map(owner => owner.user_addresses?.address)
    .filter((address): address is string => address !== null && address !== undefined);
}

/**
 * Get owner count for a multi-sig wallet
 */
export async function getWalletOwnerCount(walletId: string): Promise<number> {
  const db = getDatabase();
  
  const count = await db.multi_sig_wallet_owners.count({
    where: { wallet_id: walletId }
  });
  
  return count;
}

/**
 * Check if an address is an owner of a wallet
 */
export async function isWalletOwner(walletId: string, address: string): Promise<boolean> {
  const owners = await getWalletOwnerAddresses(walletId);
  return owners.includes(address);
}
