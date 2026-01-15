import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AccreditationRequest {
  user_id: string;
  wallet_address: string;
  accreditation_type: 
    | 'income_individual' 
    | 'income_joint' 
    | 'net_worth' 
    | 'professional_certification';
  verification_method?: 'self_certification' | 'document_upload' | 'third_party' | 'attorney_letter';
  supporting_data: {
    income?: number;
    joint_income?: number;
    net_worth?: number;
    net_worth_excluding_residence?: number;
    certification_type?: string; // Series 7, 65, 82
    certification_number?: string;
  };
  documents?: {
    type: string;
    file: Buffer | string;
  }[];
}

export interface AccreditationResult {
  success: boolean;
  verification_id: string;
  status: 'approved' | 'pending' | 'rejected';
  accreditation_type: string;
  verified_at?: Date;
  expires_at?: Date;
  rejection_reason?: string;
}

/**
 * Accreditation Service
 * 
 * Verifies accredited investor status according to SEC regulations:
 * 
 * Income Thresholds:
 * - Individual: $200,000+ annual income (last 2 years)
 * - Joint: $300,000+ joint annual income (last 2 years)
 * 
 * Net Worth:
 * - $1,000,000+ net worth (excluding primary residence)
 * 
 * Professional Certifications:
 * - Series 7, 65, or 82 license holders
 * - Other recognized professional credentials
 */
export class AccreditationService {
  // Accreditation thresholds (per SEC regulations)
  private readonly INCOME_THRESHOLD_INDIVIDUAL = 200000;
  private readonly INCOME_THRESHOLD_JOINT = 300000;
  private readonly NET_WORTH_THRESHOLD = 1000000;

  /**
   * Submit accreditation verification request
   * Alias for submitAccreditation for route compatibility
   */
  async submitVerification(
    request: AccreditationRequest
  ): Promise<AccreditationResult> {
    return this.submitAccreditation(request);
  }

  /**
   * Submit accreditation verification request
   */
  async submitAccreditation(
    request: AccreditationRequest
  ): Promise<AccreditationResult> {
    try {
      // 1. Check if user already has valid accreditation
      const existing = await this.getActiveAccreditation(request.wallet_address);
      if (existing) {
        return {
          success: false,
          verification_id: existing.id,
          status: existing.verification_status,
          accreditation_type: existing.accreditation_type,
          verified_at: existing.verified_at ? new Date(existing.verified_at) : undefined,
          expires_at: existing.expires_at ? new Date(existing.expires_at) : undefined,
          rejection_reason: 'User already has active accreditation',
        };
      }

      // 2. Validate accreditation criteria
      const validation = this.validateAccreditation(request);
      if (!validation.valid) {
        return {
          success: false,
          verification_id: '',
          status: 'rejected',
          accreditation_type: request.accreditation_type,
          rejection_reason: validation.reason,
        };
      }

      // 3. Create accreditation verification record
      const { data: verification, error: verificationError } = await supabase
        .from('accreditation_verifications')
        .insert({
          user_id: request.user_id,
          wallet_address: request.wallet_address.toLowerCase(),
          accreditation_type: request.accreditation_type,
          verification_status: 'pending',
          verification_method: this.getVerificationMethod(request.accreditation_type),
          supporting_data: request.supporting_data,
        })
        .select()
        .single();

      if (verificationError || !verification) {
        throw new Error(
          `Failed to create accreditation: ${verificationError?.message}`
        );
      }

      // 4. Upload supporting documents if provided
      if (request.documents && request.documents.length > 0) {
        await this.uploadAccreditationDocuments(
          verification.id,
          request.documents
        );
      }

      // 5. Auto-approve if professional certification
      let finalStatus: 'approved' | 'pending' | 'rejected' = 'pending';
      let verifiedAt: Date | undefined;
      let expiresAt: Date | undefined;

      if (request.accreditation_type === 'professional_certification') {
        // Verify certification (would integrate with FINRA/SEC APIs in production)
        const certValid = await this.verifyCertification(
          request.supporting_data.certification_type!,
          request.supporting_data.certification_number!
        );

        if (certValid) {
          finalStatus = 'approved';
          verifiedAt = new Date();
          expiresAt = this.calculateExpiryDate();

          await supabase
            .from('accreditation_verifications')
            .update({
              verification_status: 'approved',
              verified_at: verifiedAt.toISOString(),
              expires_at: expiresAt.toISOString(),
            })
            .eq('id', verification.id);
        } else {
          finalStatus = 'rejected';
          await supabase
            .from('accreditation_verifications')
            .update({
              verification_status: 'rejected',
              rejection_reason: 'Certification not valid',
            })
            .eq('id', verification.id);
        }
      }

      // 6. Update compliance cache
      if (finalStatus === 'approved') {
        await this.updateComplianceCache(
          request.wallet_address,
          true
        );
      }

      // 7. Create audit trail
      await this.createAuditEntry({
        user_id: request.user_id,
        wallet_address: request.wallet_address,
        action_type: 'accreditation_submitted',
        action_details: {
          verification_id: verification.id,
          accreditation_type: request.accreditation_type,
          status: finalStatus,
        },
      });

      return {
        success: true,
        verification_id: verification.id,
        status: finalStatus,
        accreditation_type: request.accreditation_type,
        verified_at: verifiedAt,
        expires_at: expiresAt,
      };
    } catch (error: any) {
      console.error('Accreditation verification error:', error);
      throw error;
    }
  }

  /**
   * Get accreditation status for user
   * Alias for getAccreditationStatus for route compatibility
   */
  async getVerificationStatus(userId: string): Promise<any> {
    return this.getAccreditationStatus(userId);
  }

  /**
   * Get accreditation status for user
   */
  async getAccreditationStatus(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('accreditation_verifications')
      .select(
        `
        *,
        documents:accreditation_documents(*)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
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
   * Get documents for a verification
   */
  async getDocuments(verificationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('accreditation_documents')
      .select('*')
      .eq('verification_id', verificationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Renew accreditation verification
   */
  async renewVerification(data: {
    user_id: string;
    wallet_address: string;
    previous_verification_id?: string;
  }): Promise<AccreditationResult> {
    let previousVerificationId = data.previous_verification_id;
    
    // If no previous verification ID provided, find the most recent one
    if (!previousVerificationId) {
      const { data: recentVerification } = await supabase
        .from('accreditation_verifications')
        .select('id')
        .eq('user_id', data.user_id)
        .eq('wallet_address', data.wallet_address.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!recentVerification) {
        throw new Error('No previous verification found for this user');
      }
      
      previousVerificationId = recentVerification.id;
    }
    
    // Get previous verification
    const { data: previous, error: previousError } = await supabase
      .from('accreditation_verifications')
      .select('*')
      .eq('id', previousVerificationId)
      .single();

    if (previousError || !previous) {
      throw new Error('Previous verification not found');
    }

    // Create new verification with same accreditation type
    return this.submitAccreditation({
      user_id: data.user_id,
      wallet_address: data.wallet_address,
      accreditation_type: previous.accreditation_type,
      supporting_data: previous.supporting_data || {},
    });
  }

  /**
   * Check if user is accredited investor
   */
  async isAccredited(walletAddress: string): Promise<boolean> {
    const accreditation = await this.getActiveAccreditation(walletAddress);
    return !!accreditation;
  }

  /**
   * Approve accreditation (manual review)
   */
  async approveAccreditation(
    verificationId: string,
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    const { data: verification } = await supabase
      .from('accreditation_verifications')
      .select('*')
      .eq('id', verificationId)
      .single();

    if (!verification) {
      throw new Error('Verification not found');
    }

    const verifiedAt = new Date();
    const expiresAt = this.calculateExpiryDate();

    await supabase
      .from('accreditation_verifications')
      .update({
        verification_status: 'approved',
        verified_at: verifiedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        reviewed_by: reviewedBy,
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', verificationId);

    // Update compliance cache
    await this.updateComplianceCache(verification.wallet_address, true);

    // Audit trail
    await this.createAuditEntry({
      user_id: verification.user_id,
      wallet_address: verification.wallet_address,
      action_type: 'accreditation_approved',
      action_details: {
        verification_id: verificationId,
        reviewed_by: reviewedBy,
        notes,
      },
    });
  }

  /**
   * Reject accreditation (manual review)
   */
  async rejectAccreditation(
    verificationId: string,
    reviewedBy: string,
    reason: string
  ): Promise<void> {
    const { data: verification } = await supabase
      .from('accreditation_verifications')
      .select('*')
      .eq('id', verificationId)
      .single();

    if (!verification) {
      throw new Error('Verification not found');
    }

    await supabase
      .from('accreditation_verifications')
      .update({
        verification_status: 'rejected',
        rejection_reason: reason,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', verificationId);

    // Audit trail
    await this.createAuditEntry({
      user_id: verification.user_id,
      wallet_address: verification.wallet_address,
      action_type: 'accreditation_rejected',
      action_details: {
        verification_id: verificationId,
        reviewed_by: reviewedBy,
        reason,
      },
    });
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Get active accreditation for user
   */
  private async getActiveAccreditation(walletAddress: string): Promise<any> {
    const { data } = await supabase
      .from('accreditation_verifications')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('verification_status', 'approved')
      .gt('expires_at', new Date().toISOString())
      .order('verified_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  /**
   * Validate accreditation criteria
   */
  private validateAccreditation(request: AccreditationRequest): {
    valid: boolean;
    reason?: string;
  } {
    const { accreditation_type, supporting_data } = request;

    switch (accreditation_type) {
      case 'income_individual':
        if (!supporting_data.income || supporting_data.income < this.INCOME_THRESHOLD_INDIVIDUAL) {
          return {
            valid: false,
            reason: `Income must be at least $${this.INCOME_THRESHOLD_INDIVIDUAL.toLocaleString()}`,
          };
        }
        break;

      case 'income_joint':
        if (!supporting_data.joint_income || supporting_data.joint_income < this.INCOME_THRESHOLD_JOINT) {
          return {
            valid: false,
            reason: `Joint income must be at least $${this.INCOME_THRESHOLD_JOINT.toLocaleString()}`,
          };
        }
        break;

      case 'net_worth':
        if (
          !supporting_data.net_worth_excluding_residence ||
          supporting_data.net_worth_excluding_residence < this.NET_WORTH_THRESHOLD
        ) {
          return {
            valid: false,
            reason: `Net worth (excluding primary residence) must be at least $${this.NET_WORTH_THRESHOLD.toLocaleString()}`,
          };
        }
        break;

      case 'professional_certification':
        if (!supporting_data.certification_type || !supporting_data.certification_number) {
          return {
            valid: false,
            reason: 'Certification type and number required',
          };
        }
        break;

      default:
        return {
          valid: false,
          reason: 'Invalid accreditation type',
        };
    }

    return { valid: true };
  }

  /**
   * Get verification method based on accreditation type
   */
  private getVerificationMethod(accreditationType: string): string {
    const methods: Record<string, string> = {
      income_individual: 'tax_return',
      income_joint: 'tax_return',
      net_worth: 'financial_statement',
      professional_certification: 'certification_lookup',
    };
    return methods[accreditationType] || 'manual_review';
  }

  /**
   * Verify professional certification
   */
  private async verifyCertification(
    certificationType: string,
    certificationNumber: string
  ): Promise<boolean> {
    // In production, integrate with FINRA CRD, SEC registrations, etc.
    // For MVP, do basic validation
    const validCertifications = ['series_7', 'series_65', 'series_82'];
    return validCertifications.includes(certificationType.toLowerCase());
  }

  /**
   * Upload accreditation documents
   */
  private async uploadAccreditationDocuments(
    verificationId: string,
    documents: { type: string; file: Buffer | string }[]
  ): Promise<void> {
    for (const doc of documents) {
      const fileName = `${verificationId}/${doc.type}_${Date.now()}`;
      const fileBuffer =
        typeof doc.file === 'string'
          ? Buffer.from(doc.file, 'base64')
          : doc.file;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('accreditation-documents')
        .upload(fileName, fileBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('Document upload error:', uploadError);
        continue;
      }

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('accreditation-documents')
        .createSignedUrl(fileName, 31536000); // 1 year

      // Calculate hash
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Store record
      await supabase.from('accreditation_documents').insert({
        verification_id: verificationId,
        document_type: doc.type,
        document_url: urlData?.signedUrl || '',
        document_hash: hash,
        verification_status: 'pending',
      });
    }
  }

  /**
   * Update compliance cache
   */
  private async updateComplianceCache(
    walletAddress: string,
    accredited: boolean
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Valid for 1 year

    await supabase
      .from('compliance_data_cache')
      .upsert(
        {
          wallet_address: walletAddress.toLowerCase(),
          accredited_investor: accredited,
          last_updated: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'wallet_address',
        }
      );
  }

  /**
   * Calculate expiry date (1 year from now)
   */
  private calculateExpiryDate(): Date {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
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
