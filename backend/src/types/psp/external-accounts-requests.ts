/**
 * PSP External Accounts API Request Types
 * 
 * Type definitions for external account route handlers
 */

export interface CreateAchAccountRequestBody {
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  accountHolderName?: string;
  bankName?: string;
  description: string;
}

export interface CreateWireAccountRequestBody {
  routingNumber: string;
  accountNumber: string;
  accountHolderName?: string;
  bankName?: string;
  bankAddress?: string;
  receiverAddress?: string;
  description: string;
}

export interface CreateCryptoAccountRequestBody {
  walletAddress: string;
  network: string;
  description: string;
}

export interface AccountParamsRequest {
  Params: {
    id: string;
  };
}
