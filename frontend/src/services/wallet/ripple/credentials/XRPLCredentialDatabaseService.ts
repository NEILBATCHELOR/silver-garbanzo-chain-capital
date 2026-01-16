/**
 * XRPL Credential Database Service
 * Handles database operations for credential records
 * Ensures project_id is included in all database operations for multi-tenancy
 */

import { supabase } from '@/infrastructure/database/client';

export interface CredentialRecord {
  id?: string;
  project_id: string;
  credential_id: string;
  issuer_address: string;
  subject_address: string;
  credential_type: string;
  data_json: Record<string, unknown>;
  data_hash?: string;
  status?: string;
  is_accepted?: boolean;
  expiration?: string;
  issue_transaction_hash: string;
  created_at?: string;
  updated_at?: string;
}

export class XRPLCredentialDatabaseService {
  /**
   * Create credential record in database
   */
  static async createCredential(record: CredentialRecord) {
    const { data, error } = await supabase
      .from('xrpl_credentials')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create credential: ${error.message}`);
    }
    return data;
  }

  /**
   * Get credential by ID
   */
  static async getCredential(projectId: string, credentialId: string) {
    const { data, error } = await supabase
      .from('xrpl_credentials')
      .select('*')
      .eq('project_id', projectId)
      .eq('credential_id', credentialId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get credential: ${error.message}`);
    }
    return data;
  }

  /**
   * Get credentials for a project
   */
  static async getCredentials(
    projectId: string,
    address?: string,
    credentialType?: string
  ) {
    let query = supabase
      .from('xrpl_credentials')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (address) {
      query = query.or(`issuer_address.eq.${address},subject_address.eq.${address}`);
    }

    if (credentialType) {
      query = query.eq('credential_type', credentialType);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to get credentials: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Update credential status
   */
  static async updateCredentialStatus(
    projectId: string,
    credentialId: string,
    status: 'active' | 'accepted' | 'deleted',
    isAccepted?: boolean,
    transactionHash?: string
  ) {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (isAccepted !== undefined) {
      updates.is_accepted = isAccepted;
    }

    if (status === 'accepted' && transactionHash) {
      updates.accept_transaction_hash = transactionHash;
      updates.accepted_at = new Date().toISOString();
    } else if (status === 'deleted' && transactionHash) {
      updates.delete_transaction_hash = transactionHash;
      updates.deleted_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('xrpl_credentials')
      .update(updates)
      .eq('project_id', projectId)
      .eq('credential_id', credentialId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update credential status: ${error.message}`);
    }
    return data;
  }

  /**
   * Get credentials by type
   */
  static async getCredentialsByType(projectId: string, credentialType: string) {
    const { data, error } = await supabase
      .from('xrpl_credentials')
      .select('*')
      .eq('project_id', projectId)
      .eq('credential_type', credentialType)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get credentials by type: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Get credentials by subject
   */
  static async getCredentialsBySubject(projectId: string, subjectAddress: string) {
    const { data, error } = await supabase
      .from('xrpl_credentials')
      .select('*')
      .eq('project_id', projectId)
      .eq('subject_address', subjectAddress)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get credentials by subject: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Get credentials by issuer
   */
  static async getCredentialsByIssuer(projectId: string, issuerAddress: string) {
    const { data, error } = await supabase
      .from('xrpl_credentials')
      .select('*')
      .eq('project_id', projectId)
      .eq('issuer_address', issuerAddress)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get credentials by issuer: ${error.message}`);
    }
    return data || [];
  }
}
