/**
 * KYC Provider Interface
 * Defines contract for KYC verification providers
 */

export interface KYCDocument {
  type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'selfie';
  file: Buffer | string; // Binary data or base64
  fileName?: string;
  mimeType?: string;
}

export interface KYCVerificationRequest {
  user_id: string;
  wallet_address: string;
  documents: KYCDocument[];
  user_data?: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    address?: string;
    nationality?: string;
  };
}

export interface KYCVerificationResult {
  status: 'approved' | 'pending' | 'rejected';
  reference: string; // Provider reference ID
  verified_at?: Date;
  expires_at?: Date;
  rejection_reason?: string;
  confidence_score?: number; // 0-100
  fraud_indicators?: string[];
  verification_checks?: {
    document_authenticity?: boolean;
    face_match?: boolean;
    address_verification?: boolean;
    age_verification?: boolean;
  };
}

/**
 * KYC Provider Interface
 * All KYC providers must implement this interface
 */
export interface KYCProviderInterface {
  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Verify user identity
   * @param request Verification request with documents
   * @returns Verification result
   */
  verifyIdentity(request: KYCVerificationRequest): Promise<KYCVerificationResult>;

  /**
   * Check verification status (for async providers)
   * @param reference Provider reference ID
   * @returns Current verification status
   */
  checkVerificationStatus(reference: string): Promise<KYCVerificationResult>;

  /**
   * Get verification details
   * @param reference Provider reference ID
   * @returns Detailed verification information
   */
  getVerificationDetails(reference: string): Promise<any>;

  /**
   * Cancel verification
   * @param reference Provider reference ID
   */
  cancelVerification(reference: string): Promise<void>;

  /**
   * Resubmit verification with additional documents
   * @param reference Original verification reference
   * @param documents Additional documents
   */
  resubmitVerification(
    reference: string,
    documents: KYCDocument[]
  ): Promise<KYCVerificationResult>;
}
