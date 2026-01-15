import { createClient } from '@supabase/supabase-js';
import { KYCProviderInterface } from './providers/KYCProviderInterface';
import { InternalKYCProvider } from './providers/InternalKYCProvider';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface KYCVerificationRequest {
  user_id: string;
  wallet_address: string;
  documents: {
    type: string;
    file: Buffer | string;
  }[];
}

export interface KYCVerificationResult {
  success: boolean;
  verification_id: string;
  status: 'approved' | 'pending' | 'rejected';
  verified_at?: Date;
  expires_at?: Date;
  rejection_reason?: string;
  provider_reference?: string;
}

export class KYCVerificationService {
  private kycProvider: KYCProviderInterface;

  constructor(provider?: KYCProviderInterface) {
    this.kycProvider = provider || new InternalKYCProvider();
  }

  /**
   * Submit KYC verification request
   */
  async submitVerification(
    request: KYCVerificationRequest
  ): Promise<KYCVerificationResult> {
    try {
      // 1. Check if user already has verification
      const { data: existing } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', request.user_id)
        .single();

      if (existing && existing.verification_status === 'approved') {
        return {
          success: false,
          verification_id: existing.id,
          status: 'approved',
          rejection_reason: 'User already verified',
        };
      }

      // 2. Create verification record
      const { data: verification, error: verificationError } = await supabase
        .from('kyc_verifications')
        .insert({
          user_id: request.user_id,
          wallet_address: request.wallet_address,
          verification_status: 'pending',
          verification_provider: this.kycProvider.getProviderName(),
        })
        .select()
        .single();

      if (verificationError || !verification) {
        throw new Error(
          `Failed to create verification: ${verificationError?.message}`
        );
      }

      // 3. Upload and store documents
      const documentIds: string[] = [];
      for (const doc of request.documents) {
        const docResult = await this.uploadDocument(
          verification.id,
          doc.type,
          doc.file
        );
        documentIds.push(docResult.id);
      }

      // 4. Submit to KYC provider for verification
      // Map documents to provider format with proper types
      const providerDocuments = request.documents.map(doc => ({
        type: doc.type as 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'selfie',
        file: doc.file,
        fileName: undefined,
        mimeType: undefined,
      }));

      const providerResult = await this.kycProvider.verifyIdentity({
        user_id: request.user_id,
        wallet_address: request.wallet_address,
        documents: providerDocuments,
      });

      // 5. Update verification status based on provider result
      const updateData: any = {
        verification_reference: providerResult.reference,
        updated_at: new Date().toISOString(),
      };

      if (providerResult.status === 'approved') {
        updateData.verification_status = 'approved';
        updateData.verified_at = new Date().toISOString();
        updateData.expires_at = this.calculateExpiryDate();
      } else if (providerResult.status === 'rejected') {
        updateData.verification_status = 'rejected';
        updateData.rejection_reason = providerResult.rejection_reason;
      }

      await supabase
        .from('kyc_verifications')
        .update(updateData)
        .eq('id', verification.id);

      // 6. Update compliance cache
      await this.updateComplianceCache(
        request.wallet_address,
        providerResult.status === 'approved'
      );

      // 7. Create audit trail
      await this.createAuditEntry({
        user_id: request.user_id,
        wallet_address: request.wallet_address,
        action_type: 'kyc_submitted',
        action_details: {
          verification_id: verification.id,
          provider: this.kycProvider.getProviderName(),
          document_count: request.documents.length,
        },
      });

      return {
        success: true,
        verification_id: verification.id,
        status: providerResult.status,
        verified_at:
          providerResult.status === 'approved' ? new Date() : undefined,
        expires_at:
          providerResult.status === 'approved'
            ? this.calculateExpiryDate()
            : undefined,
        rejection_reason: providerResult.rejection_reason,
        provider_reference: providerResult.reference,
      };
    } catch (error: any) {
      console.error('KYC verification error:', error);
      throw error;
    }
  }

  /**
   * Get verification status for user
   */
  async getVerificationStatus(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('kyc_verifications')
      .select(
        `
        *,
        documents:kyc_documents(*)
      `
      )
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Check if user is KYC verified
   */
  async isVerified(walletAddress: string): Promise<boolean> {
    const { data } = await supabase
      .from('kyc_verifications')
      .select('verification_status, expires_at')
      .eq('wallet_address', walletAddress)
      .single();

    if (!data) return false;

    if (data.verification_status !== 'approved') return false;

    if (data.expires_at) {
      const expiryDate = new Date(data.expires_at);
      if (expiryDate < new Date()) {
        await supabase
          .from('kyc_verifications')
          .update({ verification_status: 'expired' })
          .eq('wallet_address', walletAddress);
        return false;
      }
    }

    return true;
  }

  /**
   * Get documents for a verification
   */
  async getDocuments(verificationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('verification_id', verificationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Upload document to secure storage
   */
  private async uploadDocument(
    verificationId: string,
    documentType: string,
    file: Buffer | string
  ): Promise<any> {
    const fileName = `${verificationId}/${documentType}_${Date.now()}`;
    const fileBuffer =
      typeof file === 'string' ? Buffer.from(file, 'base64') : file;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(fileName, fileBuffer, {
        contentType: this.getContentType(documentType),
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Document upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = await supabase.storage
      .from('kyc-documents')
      .createSignedUrl(fileName, 31536000);

    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const { data: docRecord, error: docError } = await supabase
      .from('kyc_documents')
      .insert({
        verification_id: verificationId,
        document_type: documentType,
        document_url: urlData?.signedUrl || '',
        document_hash: hash,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Document record creation failed: ${docError.message}`);
    }

    return docRecord;
  }

  /**
   * Update compliance data cache
   */
  private async updateComplianceCache(
    walletAddress: string,
    kycVerified: boolean
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase
      .from('compliance_data_cache')
      .upsert(
        {
          wallet_address: walletAddress.toLowerCase(),
          kyc_verified: kycVerified,
          last_updated: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'wallet_address',
        }
      );
  }

  /**
   * Calculate KYC expiry date (1 year from now)
   */
  private calculateExpiryDate(): Date {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
  }

  /**
   * Get content type for document
   */
  private getContentType(documentType: string): string {
    const types: Record<string, string> = {
      passport: 'image/jpeg',
      drivers_license: 'image/jpeg',
      national_id: 'image/jpeg',
      utility_bill: 'application/pdf',
      selfie: 'image/jpeg',
    };
    return types[documentType] || 'application/octet-stream';
  }

  /**
   * Create audit trail entry
   */
  private async createAuditEntry(data: any): Promise<void> {
    await supabase.from('compliance_audit_trail').insert({
      user_id: data.user_id,
      wallet_address: data.wallet_address,
      action_type: data.action_type,
      action_details: data.action_details,
      performed_at: new Date().toISOString(),
    });
  }
}
