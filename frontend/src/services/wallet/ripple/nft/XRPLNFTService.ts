import { 
  Client, 
  Wallet, 
  NFTokenMint,
  NFTokenCreateOffer,
  NFTokenAcceptOffer,
  NFTokenCancelOffer,
  NFTokenBurn,
  convertStringToHex
} from 'xrpl';
import { xrplClientManager } from '../core/XRPLClientManager';
import { XRPLNetwork } from '../config/XRPLConfig';

/**
 * NFT Metadata structure (IPFS or HTTP URI)
 */
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  collection?: string;
  creator?: string;
  external_url?: string;
}

/**
 * NFT Minting parameters
 */
export interface NFTMintParams {
  minter: Wallet;
  uri?: string; // IPFS or HTTP URI for metadata
  flags?: {
    burnable?: boolean;
    onlyXRP?: boolean;
    trustLine?: boolean;
    transferable?: boolean;
  };
  transferFee?: number; // 0-50000 (0-50%)
  taxon?: number;
}

/**
 * NFT Offer parameters
 */
export interface NFTOfferParams {
  wallet: Wallet;
  nftId: string;
  amount: string | { currency: string; issuer: string; value: string };
  destination?: string; // For sell offers
  owner?: string; // For buy offers
  expiration?: number;
}

/**
 * NFT details
 */
export interface NFTDetails {
  nftId: string;
  uri: string;
  flags: number;
  issuer: string;
  transferFee: number;
  serial: number;
  taxon: number;
}

/**
 * NFT Offer details
 */
export interface NFTOffer {
  offerIndex: string;
  owner: string;
  amount: string | object;
  destination?: string;
  expiration?: number;
}

/**
 * XRPL NFT Service
 * 
 * Handles NFT minting, trading, and marketplace operations.
 * Based on XRPL's native NFToken functionality.
 * 
 * Based on: xrpl-dev-portal _code-samples/non-fungible-token/
 */
export class XRPLNFTService {
  private client: Client | null = null;
  private network: XRPLNetwork;

  constructor(network: XRPLNetwork = 'TESTNET') {
    this.network = network;
  }

  /**
   * Initialize client connection
   */
  private async getClient(): Promise<Client> {
    if (!this.client || !this.client.isConnected()) {
      this.client = await xrplClientManager.getClient(this.network);
    }
    return this.client;
  }

  /**
   * Mint new NFT
   */
  async mintNFT(params: NFTMintParams): Promise<{
    nftId: string;
    transactionHash: string;
    explorerUrl: string;
  }> {
    try {
      const client = await this.getClient();

      let flags = 0;
      
      if (params.flags?.burnable) {
        flags |= 0x0001; // tfBurnable
      }
      if (params.flags?.onlyXRP) {
        flags |= 0x0002; // tfOnlyXRP
      }
      if (params.flags?.trustLine) {
        flags |= 0x0004; // tfTrustLine
      }
      if (params.flags?.transferable) {
        flags |= 0x0008; // tfTransferable
      }

      const tx: NFTokenMint = {
        TransactionType: 'NFTokenMint',
        Account: params.minter.address,
        URI: params.uri ? convertStringToHex(params.uri) : undefined,
        Flags: flags,
        TransferFee: params.transferFee,
        NFTokenTaxon: params.taxon || 0
      };

      const response = await client.submitAndWait(tx, {
        wallet: params.minter,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`NFT minting failed: ${response.result.meta.TransactionResult}`);
        }
      }

      // Extract NFT ID from metadata
      const nftId = this.extractNFTId(response.result.meta);
      const explorerUrl = this.getExplorerUrl(nftId, 'nft');

      return {
        nftId,
        transactionHash: response.result.hash,
        explorerUrl
      };
    } catch (error) {
      throw new Error(
        `Failed to mint NFT: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Batch mint NFTs
   */
  async batchMintNFTs(
    minter: Wallet,
    nfts: Array<Omit<NFTMintParams, 'minter'>>
  ): Promise<Array<{
    nftId: string;
    transactionHash: string;
  }>> {
    const results = [];

    for (const nft of nfts) {
      const result = await this.mintNFT({ ...nft, minter });
      results.push(result);
      
      // Small delay to avoid overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Create sell offer for NFT
   */
  async createSellOffer(params: NFTOfferParams): Promise<{
    offerIndex: string;
    transactionHash: string;
  }> {
    try {
      const client = await this.getClient();

      const tx: NFTokenCreateOffer = {
        TransactionType: 'NFTokenCreateOffer',
        Account: params.wallet.address,
        NFTokenID: params.nftId,
        Amount: params.amount,
        Destination: params.destination,
        Expiration: params.expiration,
        Flags: 1 // tfSellNFToken
      };

      const response = await client.submitAndWait(tx, {
        wallet: params.wallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Sell offer creation failed: ${response.result.meta.TransactionResult}`);
        }
      }

      const offerIndex = this.extractOfferIndex(response.result.meta);

      return {
        offerIndex,
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to create sell offer: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create buy offer for NFT
   */
  async createBuyOffer(params: NFTOfferParams): Promise<{
    offerIndex: string;
    transactionHash: string;
  }> {
    try {
      const client = await this.getClient();

      const tx: NFTokenCreateOffer = {
        TransactionType: 'NFTokenCreateOffer',
        Account: params.wallet.address,
        NFTokenID: params.nftId,
        Owner: params.owner!,
        Amount: params.amount,
        Expiration: params.expiration,
        Flags: 0
      };

      const response = await client.submitAndWait(tx, {
        wallet: params.wallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Buy offer creation failed: ${response.result.meta.TransactionResult}`);
        }
      }

      const offerIndex = this.extractOfferIndex(response.result.meta);

      return {
        offerIndex,
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to create buy offer: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Accept NFT offer (either buy or sell)
   */
  async acceptOffer(
    wallet: Wallet,
    offerIndex: string,
    brokerFee?: string
  ): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: NFTokenAcceptOffer = {
        TransactionType: 'NFTokenAcceptOffer',
        Account: wallet.address,
        NFTokenSellOffer: offerIndex,
        NFTokenBrokerFee: brokerFee
      };

      const response = await client.submitAndWait(tx, {
        wallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Offer acceptance failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to accept offer: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Accept offer as broker (matching buy and sell)
   */
  async brokerNFTSale(
    broker: Wallet,
    sellOfferIndex: string,
    buyOfferIndex: string,
    brokerFee?: string
  ): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: NFTokenAcceptOffer = {
        TransactionType: 'NFTokenAcceptOffer',
        Account: broker.address,
        NFTokenSellOffer: sellOfferIndex,
        NFTokenBuyOffer: buyOfferIndex,
        NFTokenBrokerFee: brokerFee
      };

      const response = await client.submitAndWait(tx, {
        wallet: broker,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Brokered sale failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to broker NFT sale: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Cancel NFT offer
   */
  async cancelOffer(
    wallet: Wallet,
    offerIndexes: string[]
  ): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: NFTokenCancelOffer = {
        TransactionType: 'NFTokenCancelOffer',
        Account: wallet.address,
        NFTokenOffers: offerIndexes
      };

      const response = await client.submitAndWait(tx, {
        wallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Offer cancellation failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to cancel offer: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Burn NFT
   */
  async burnNFT(
    owner: Wallet,
    nftId: string
  ): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: NFTokenBurn = {
        TransactionType: 'NFTokenBurn',
        Account: owner.address,
        NFTokenID: nftId
      };

      const response = await client.submitAndWait(tx, {
        wallet: owner,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`NFT burning failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to burn NFT: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get NFTs owned by account
   */
  async getAccountNFTs(address: string): Promise<NFTDetails[]> {
    try {
      const client = await this.getClient();

      const response = await client.request({
        command: 'account_nfts',
        account: address,
        ledger_index: 'validated'
      });

      return response.result.account_nfts.map((nft: unknown) => {
        const nftData = nft as Record<string, unknown>;
        return {
          nftId: nftData.NFTokenID as string,
          uri: nftData.URI ? Buffer.from(nftData.URI as string, 'hex').toString('utf8') : '',
          flags: nftData.Flags as number,
          issuer: nftData.Issuer as string,
          transferFee: nftData.TransferFee as number,
          serial: nftData.nft_serial as number,
          taxon: nftData.NFTokenTaxon as number
        };
      });
    } catch (error) {
      throw new Error(
        `Failed to get account NFTs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get sell offers for NFT
   */
  async getNFTSellOffers(nftId: string): Promise<NFTOffer[]> {
    try {
      const client = await this.getClient();

      const response = await client.request({
        command: 'nft_sell_offers',
        nft_id: nftId,
        ledger_index: 'validated'
      });

      if (!response.result.offers) {
        return [];
      }

      return response.result.offers.map((offer: unknown) => {
        const offerData = offer as Record<string, unknown>;
        return {
          offerIndex: offerData.nft_offer_index as string,
          owner: offerData.owner as string,
          amount: offerData.amount as string | object,
          destination: offerData.destination as string | undefined,
          expiration: offerData.expiration as number | undefined
        };
      });
    } catch (error) {
      throw new Error(
        `Failed to get NFT sell offers: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get buy offers for NFT
   */
  async getNFTBuyOffers(nftId: string): Promise<NFTOffer[]> {
    try {
      const client = await this.getClient();

      const response = await client.request({
        command: 'nft_buy_offers',
        nft_id: nftId,
        ledger_index: 'validated'
      });

      if (!response.result.offers) {
        return [];
      }

      return response.result.offers.map((offer: unknown) => {
        const offerData = offer as Record<string, unknown>;
        return {
          offerIndex: offerData.nft_offer_index as string,
          owner: offerData.owner as string,
          amount: offerData.amount as string | object,
          expiration: offerData.expiration as number | undefined
        };
      });
    } catch (error) {
      throw new Error(
        `Failed to get NFT buy offers: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract NFT ID from transaction metadata
   */
  private extractNFTId(meta: unknown): string {
    if (!meta || typeof meta !== 'object') {
      throw new Error('Invalid transaction metadata');
    }

    const metaObj = meta as Record<string, unknown>;
    
    if ('AffectedNodes' in metaObj && Array.isArray(metaObj.AffectedNodes)) {
      for (const node of metaObj.AffectedNodes) {
        const nodeData = node as Record<string, unknown>;
        
        if ('CreatedNode' in nodeData) {
          const createdNode = nodeData.CreatedNode as Record<string, unknown>;
          
          if (createdNode.LedgerEntryType === 'NFTokenPage' && 'NewFields' in createdNode) {
            const newFields = createdNode.NewFields as Record<string, unknown>;
            
            if ('NFTokens' in newFields && Array.isArray(newFields.NFTokens)) {
              const tokens = newFields.NFTokens;
              if (tokens.length > 0) {
                const token = tokens[0] as Record<string, unknown>;
                if ('NFToken' in token) {
                  const nftoken = token.NFToken as Record<string, unknown>;
                  return nftoken.NFTokenID as string;
                }
              }
            }
          }
        }
      }
    }

    throw new Error('Could not extract NFT ID from transaction metadata');
  }

  /**
   * Extract offer index from transaction metadata
   */
  private extractOfferIndex(meta: unknown): string {
    if (!meta || typeof meta !== 'object') {
      throw new Error('Invalid transaction metadata');
    }

    const metaObj = meta as Record<string, unknown>;
    
    if ('AffectedNodes' in metaObj && Array.isArray(metaObj.AffectedNodes)) {
      const createdNode = metaObj.AffectedNodes.find((node: unknown) => {
        const nodeData = node as Record<string, unknown>;
        if ('CreatedNode' in nodeData) {
          const created = nodeData.CreatedNode as Record<string, unknown>;
          return created.LedgerEntryType === 'NFTokenOffer';
        }
        return false;
      });

      if (createdNode && typeof createdNode === 'object' && 'CreatedNode' in createdNode) {
        const created = (createdNode as Record<string, unknown>).CreatedNode as Record<string, unknown>;
        if ('LedgerIndex' in created && typeof created.LedgerIndex === 'string') {
          return created.LedgerIndex;
        }
      }
    }

    throw new Error('Could not extract offer index from transaction metadata');
  }

  /**
   * Get explorer URL for entity
   */
  private getExplorerUrl(id: string, type: 'nft' | 'transaction'): string {
    const explorers: Record<string, string> = {
      MAINNET: 'https://livenet.xrpl.org',
      TESTNET: 'https://testnet.xrpl.org',
      DEVNET: 'https://devnet.xrpl.org'
    };

    const baseUrl = explorers[this.network] || explorers.TESTNET;
    return `${baseUrl}/${type}/${id}`;
  }
}
