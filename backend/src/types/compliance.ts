/**
 * Compliance Domain Types
 * Types specific to compliance checks, document verification, and regulatory requirements
 */

/**
 * Compliance check result structure
 */
export interface ComplianceCheckResult {
  passed: boolean
  issues: string[]
  warnings: string[]
  score: number
  details: Record<string, any>
}

/**
 * Document verification result structure
 */
export interface DocumentVerificationResult {
  verified: boolean
  confidence: number
  extractedData: Record<string, any>
  issues: string[]
}

/**
 * Document upload data structure
 */
export interface DocumentUploadData {
  name: string
  documentType: string
  projectId?: string
  investorId?: string
  file: Buffer
  fileName: string
  mimeType: string
  metadata?: Record<string, any>
}

/**
 * Document metadata structure
 */
export interface DocumentMetadata {
  uploadedBy: string
  reviewedBy?: string
  tags?: string[]
  category?: string
  version?: number
  checksum?: string
}
