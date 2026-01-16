/**
 * XRPL NFT Database Service
 * Handles database operations for NFT records
 * Ensures project_id is included in all database operations for multi-tenancy
 */

import { supabase } from '@/infrastructure/database/client';

export interface NFTRecord {
  id?: string;
  project_id: string;
  nft_id: string;
  issuer_address: string;
  owner_address: string;
  taxon: number;
  serial: number;
  uri?: string;
  name?: string;
  description?: string;
  image_url?: string;
  metadata_json?: Record<string, unknown>;
  transfer_fee?: number;
  flags?: number;
  is_burnable?: boolean;
  is_only_xrp?: boolean;
  is_transferable?: boolean;
  status?: string;
  mint_transaction_hash?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NFTOfferRecord {
  id?: string;
  project_id: string;
  offer_index: string;
  nft_id: string;
  offer_type: 'sell' | 'buy';
  owner_address: string;
  amount: string;
  currency_code?: string;
  issuer_address?: string;
  destination_address?: string;
  expiration?: string;
  status?: string;
  transaction_hash?: string;
  created_at?: string;
}

export interface NFTTransferRecord {
  id?: string;
  project_id: string;
  nft_id: string;
  from_address: string;
  to_address: string;
  price?: string;
  currency_code?: string;
  issuer_address?: string;
  broker_address?: string;
  broker_fee?: string;
  transaction_hash: string;
  transferred_at?: string;
}

export class XRPLNFTDatabaseService {
  /**
   * Create NFT record in database
   */
  static async createNFT(record: NFTRecord) {
    const { data, error } = await supabase
      .from('xrpl_nfts')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create NFT record: ${error.message}`);
    }

    return data;
  }

  /**
   * Get NFT by ID
   */
  static async getNFT(projectId: string, nftId: string) {
    const { data, error } = await supabase
      .from('xrpl_nfts')
      .select('*')
      .eq('project_id', projectId)
      .eq('nft_id', nftId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get NFT: ${error.message}`);
    }

    return data;
  }

  /**
   * Get NFTs for a project
   */
  static async getNFTs(projectId: string, ownerAddress?: string) {
    let query = supabase
      .from('xrpl_nfts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (ownerAddress) {
      query = query.eq('owner_address', ownerAddress);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get NFTs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update NFT owner
   */
  static async updateNFTOwner(projectId: string, nftId: string, newOwner: string) {
    const { data, error } = await supabase
      .from('xrpl_nfts')
      .update({
        owner_address: newOwner,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('nft_id', nftId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update NFT owner: ${error.message}`);
    }

    return data;
  }

  /**
   * Create NFT offer record
   */
  static async createOffer(record: NFTOfferRecord) {
    const { data, error } = await supabase
      .from('xrpl_nft_offers')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create NFT offer: ${error.message}`);
    }

    return data;
  }

  /**
   * Get NFT offers
   */
  static async getOffers(projectId: string, nftId: string, offerType?: 'sell' | 'buy') {
    let query = supabase
      .from('xrpl_nft_offers')
      .select('*')
      .eq('project_id', projectId)
      .eq('nft_id', nftId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (offerType) {
      query = query.eq('offer_type', offerType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get NFT offers: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update offer status
   */
  static async updateOfferStatus(
    projectId: string,
    offerIndex: string,
    status: 'active' | 'accepted' | 'canceled'
  ) {
    const { data, error } = await supabase
      .from('xrpl_nft_offers')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('offer_index', offerIndex)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update offer status: ${error.message}`);
    }

    return data;
  }

  /**
   * Create NFT transfer record
   */
  static async createTransfer(record: NFTTransferRecord) {
    const { data, error } = await supabase
      .from('xrpl_nft_transfers')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create NFT transfer record: ${error.message}`);
    }

    return data;
  }

  /**
   * Get NFT transfer history
   */
  static async getTransferHistory(projectId: string, nftId: string) {
    const { data, error } = await supabase
      .from('xrpl_nft_transfers')
      .select('*')
      .eq('project_id', projectId)
      .eq('nft_id', nftId)
      .order('transferred_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get transfer history: ${error.message}`);
    }

    return data || [];
  }
}
