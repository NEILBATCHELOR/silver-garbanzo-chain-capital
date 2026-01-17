/**
 * XRPL Identity Database Service
 * Manages DID and credential data persistence
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export class XRPLIdentityDatabaseService {
  private supabase: SupabaseClient

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.SUPABASE_URL || '',
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
  }

  /**
   * Save DID
   */
  async saveDID(params: {
    projectId: string
    did: string
    accountAddress: string
    didDocument: any
    uri?: string
    data?: string
    transactionHash: string
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_dids')
      .insert({
        project_id: params.projectId,
        did: params.did,
        account_address: params.accountAddress,
        did_document: params.didDocument,
        uri: params.uri,
        data: params.data,
        creation_transaction_hash: params.transactionHash,
        status: 'active'
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save DID: ${error.message}`)
    return data.id
  }

  /**
   * Update DID
   */
  async updateDID(params: {
    did: string
    didDocument?: any
    uri?: string
    data?: string
    transactionHash: string
  }): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_dids')
      .update({
        did_document: params.didDocument,
        uri: params.uri,
        data: params.data,
        updated_at: new Date().toISOString()
      })
      .eq('did', params.did)

    if (error) throw new Error(`Failed to update DID: ${error.message}`)
  }

  /**
   * Delete DID
   */
  async deleteDID(did: string, transactionHash: string): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_dids')
      .update({
        status: 'deleted',
        deletion_transaction_hash: transactionHash,
        deleted_at: new Date().toISOString()
      })
      .eq('did', did)

    if (error) throw new Error(`Failed to delete DID: ${error.message}`)
  }

  /**
   * Get DID
   */
  async getDID(did: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('xrpl_dids')
      .select('*')
      .eq('did', did)
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get DID: ${error.message}`)
    }

    return data
  }

  /**
   * Save credential
   */
  async saveCredential(params: {
    projectId: string
    credentialId: string
    issuerAddress: string
    subjectAddress: string
    credentialType: string
    credentialData: any
    uri?: string
    expiration?: Date
    transactionHash: string
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_credentials')
      .insert({
        project_id: params.projectId,
        credential_id: params.credentialId,
        issuer_address: params.issuerAddress,
        subject_address: params.subjectAddress,
        credential_type: params.credentialType,
        credential_data: params.credentialData,
        uri: params.uri,
        expiration: params.expiration?.toISOString(),
        issue_transaction_hash: params.transactionHash,
        status: 'issued'
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save credential: ${error.message}`)
    return data.id
  }

  /**
   * Accept credential
   */
  async acceptCredential(credentialId: string, transactionHash: string): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_credentials')
      .update({
        status: 'accepted',
        accept_transaction_hash: transactionHash,
        accepted_at: new Date().toISOString()
      })
      .eq('credential_id', credentialId)

    if (error) throw new Error(`Failed to accept credential: ${error.message}`)
  }

  /**
   * Revoke credential
   */
  async revokeCredential(credentialId: string, transactionHash: string): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_credentials')
      .update({
        status: 'revoked',
        revoke_transaction_hash: transactionHash,
        revoked_at: new Date().toISOString()
      })
      .eq('credential_id', credentialId)

    if (error) throw new Error(`Failed to revoke credential: ${error.message}`)
  }

  /**
   * Get credential
   */
  async getCredential(credentialId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('xrpl_credentials')
      .select('*')
      .eq('credential_id', credentialId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get credential: ${error.message}`)
    }

    return data
  }

  /**
   * List credentials for subject
   */
  async listCredentials(params: {
    subjectAddress?: string
    issuerAddress?: string
    status?: string[]
  }): Promise<any[]> {
    let query = this.supabase
      .from('xrpl_credentials')
      .select('*')

    if (params.subjectAddress) {
      query = query.eq('subject_address', params.subjectAddress)
    }

    if (params.issuerAddress) {
      query = query.eq('issuer_address', params.issuerAddress)
    }

    if (params.status && params.status.length > 0) {
      query = query.in('status', params.status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to list credentials: ${error.message}`)
    return data || []
  }

  /**
   * Save verification result
   */
  async saveVerification(params: {
    didId: string
    verifierAddress: string
    verificationType: string
    isValid: boolean
    verificationData?: any
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_did_verifications')
      .insert({
        did_id: params.didId,
        verifier_address: params.verifierAddress,
        verification_type: params.verificationType,
        is_valid: params.isValid,
        verification_data: params.verificationData
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save verification: ${error.message}`)
    return data.id
  }
}
