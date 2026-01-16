/**
 * XRPL DID Database Service
 * Manages DID records in the database
 */

import { supabase } from '@/infrastructure/database/client';
import {
  DIDRecord,
  DIDVerificationRecord,
  DIDUpdateHistoryRecord,
  DIDDocument
} from './did-types';

export class XRPLDIDDatabaseService {
  /**
   * Create a new DID record
   */
  static async createDID(record: DIDRecord): Promise<DIDRecord> {
    const { data, error } = await supabase
      .from('xrpl_dids')
      .insert({
        project_id: record.project_id,
        did: record.did,
        account_address: record.account_address,
        did_document: record.did_document,
        uri: record.uri,
        data: record.data,
        status: record.status,
        creation_transaction_hash: record.creation_transaction_hash,
        metadata: record.metadata
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create DID record: ${error.message}`);
    }

    return data;
  }

  /**
   * Get DID by ID
   */
  static async getDID(didId: string): Promise<DIDRecord | null> {
    const { data, error } = await supabase
      .from('xrpl_dids')
      .select('*')
      .eq('id', didId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get DID: ${error.message}`);
    }

    return data;
  }

  /**
   * Get DID by DID string
   */
  static async getDIDByString(did: string): Promise<DIDRecord | null> {
    const { data, error } = await supabase
      .from('xrpl_dids')
      .select('*')
      .eq('did', did)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get DID by string: ${error.message}`);
    }

    return data;
  }

  /**
   * Get DID by account address
   */
  static async getDIDByAccount(accountAddress: string): Promise<DIDRecord | null> {
    const { data, error } = await supabase
      .from('xrpl_dids')
      .select('*')
      .eq('account_address', accountAddress)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get DID by account: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all DIDs for a project
   */
  static async getDIDsByProject(projectId: string): Promise<DIDRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_dids')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get DIDs for project: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update DID document
   */
  static async updateDIDDocument(
    didId: string,
    newDocument: DIDDocument,
    transactionHash: string
  ): Promise<DIDRecord> {
    const { data, error } = await supabase
      .from('xrpl_dids')
      .update({
        did_document: newDocument,
        updated_at: new Date().toISOString()
      })
      .eq('id', didId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update DID document: ${error.message}`);
    }

    return data;
  }

  /**
   * Mark DID as deleted
   */
  static async deleteDID(
    didId: string,
    transactionHash: string
  ): Promise<DIDRecord> {
    const { data, error } = await supabase
      .from('xrpl_dids')
      .update({
        status: 'deleted',
        deletion_transaction_hash: transactionHash,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', didId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to delete DID: ${error.message}`);
    }

    return data;
  }

  /**
   * Record a DID verification
   */
  static async recordVerification(
    record: DIDVerificationRecord
  ): Promise<DIDVerificationRecord> {
    const { data, error } = await supabase
      .from('xrpl_did_verifications')
      .insert({
        did_id: record.did_id,
        verifier_address: record.verifier_address,
        verification_type: record.verification_type,
        is_valid: record.is_valid,
        verification_data: record.verification_data
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record verification: ${error.message}`);
    }

    return data;
  }

  /**
   * Get verification history for a DID
   */
  static async getVerificationHistory(
    didId: string
  ): Promise<DIDVerificationRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_did_verifications')
      .select('*')
      .eq('did_id', didId)
      .order('verified_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get verification history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Record a DID update in history
   */
  static async recordUpdate(
    record: DIDUpdateHistoryRecord
  ): Promise<DIDUpdateHistoryRecord> {
    const { data, error } = await supabase
      .from('xrpl_did_update_history')
      .insert({
        did_id: record.did_id,
        update_type: record.update_type,
        old_document: record.old_document,
        new_document: record.new_document,
        transaction_hash: record.transaction_hash
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record update: ${error.message}`);
    }

    return data;
  }

  /**
   * Get update history for a DID
   */
  static async getUpdateHistory(didId: string): Promise<DIDUpdateHistoryRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_did_update_history')
      .select('*')
      .eq('did_id', didId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get update history: ${error.message}`);
    }

    return data || [];
  }
}
