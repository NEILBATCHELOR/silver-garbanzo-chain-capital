/**
 * Document Upload Service
 * 
 * Handles IPFS document upload and verification for commodity trade finance
 * Supports: BoL, certificates, inspection reports, assay reports
 * 
 * Provider Support: Pinata, Web3.Storage, or custom IPFS node
 */

import { createHash } from 'crypto';

// ============================================================================
// INTERFACES
// ============================================================================

export enum DocumentType {
  BILL_OF_LADING = 'bill_of_lading',
  ASSAY_CERTIFICATE = 'assay_certificate',
  INSPECTION_REPORT = 'inspection_report',
  CERTIFICATE_OF_ORIGIN = 'certificate_of_origin',
  INSURANCE_CERTIFICATE = 'insurance_certificate',
  PHYTOSANITARY_CERTIFICATE = 'phytosanitary_certificate',
  QUALITY_CERTIFICATE = 'quality_certificate',
  WAREHOUSE_RECEIPT = 'warehouse_receipt',
  OTHER = 'other'
}

export interface Document {
  file: File | Buffer;
  type: DocumentType;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  metadata?: Record<string, any>;
}

export interface UploadedDocument {
  ipfsHash: string;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  contentHash: string; // SHA-256 hash for verification
  gatewayUrl: string;
}

export interface DocumentManifest {
  manifestHash: string;
  documents: UploadedDocument[];
  createdAt: Date;
  commodityTokenId?: string;
  version: string;
}

export interface IPFSUploadOptions {
  provider: 'pinata' | 'web3storage' | 'custom';
  apiKey?: string;
  apiSecret?: string;
  endpoint?: string;
  pinName?: string;
  encrypt?: boolean;
  encryptionKey?: string;
}

export interface DocumentVerificationResult {
  isValid: boolean;
  ipfsHash: string;
  contentHash: string;
  matchesStored: boolean;
  document?: UploadedDocument;
  error?: string;
}

// ============================================================================
// DOCUMENT UPLOAD SERVICE
// ============================================================================

export class DocumentUploadService {
  private provider: 'pinata' | 'web3storage' | 'custom';
  private apiKey?: string;
  private apiSecret?: string;
  private endpoint?: string;

  constructor(options: IPFSUploadOptions) {
    this.provider = options.provider;
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    this.endpoint = options.endpoint;
  }

  /**
   * Upload documents to IPFS
   * 
   * @param documents - Array of documents to upload
   * @param options - Upload options
   * @returns Array of uploaded document metadata
   * 
   * @example
   * ```typescript
   * const service = new DocumentUploadService({ 
   *   provider: 'pinata',
   *   apiKey: 'your-api-key'
   * });
   * 
   * const uploaded = await service.uploadToIPFS([{
   *   file: bolFile,
   *   type: DocumentType.BILL_OF_LADING,
   *   issuer: "Maersk",
   *   issueDate: new Date()
   * }]);
   * ```
   */
  async uploadToIPFS(
    documents: Document[],
    options?: Partial<IPFSUploadOptions>
  ): Promise<UploadedDocument[]> {
    const uploadedDocs: UploadedDocument[] = [];

    for (const doc of documents) {
      try {
        // Calculate content hash for verification
        const contentHash = await this._calculateHash(doc.file);

        // Upload to IPFS based on provider
        const ipfsHash = await this._uploadSingle(doc, options);

        // Get gateway URL
        const gatewayUrl = this._getGatewayUrl(ipfsHash);

        const fileSize = doc.file instanceof File 
          ? doc.file.size 
          : Buffer.byteLength(doc.file);

        const fileName = doc.file instanceof File 
          ? doc.file.name 
          : `document_${doc.type}`;

        uploadedDocs.push({
          ipfsHash,
          type: doc.type,
          fileName,
          fileSize,
          uploadedAt: new Date(),
          issuer: doc.issuer,
          issueDate: doc.issueDate,
          expiryDate: doc.expiryDate,
          contentHash,
          gatewayUrl
        });
      } catch (error) {
        console.error(`Failed to upload document ${doc.type}:`, error);
        throw new Error(`Upload failed for ${doc.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return uploadedDocs;
  }

  /**
   * Fetch document from IPFS
   * 
   * @param ipfsHash - IPFS hash of the document
   * @returns Document content as Buffer
   * 
   * @example
   * ```typescript
   * const content = await service.fetchFromIPFS('QmX...');
   * ```
   */
  async fetchFromIPFS(ipfsHash: string): Promise<Buffer> {
    const gatewayUrl = this._getGatewayUrl(ipfsHash);

    try {
      const response = await fetch(gatewayUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw new Error(`IPFS fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify document authenticity
   * 
   * @param ipfsHash - IPFS hash to verify
   * @param storedContentHash - Expected content hash
   * @returns Verification result
   * 
   * @example
   * ```typescript
   * const result = await service.verifyDocument(
   *   'QmX...',
   *   'sha256hash...'
   * );
   * 
   * if (result.isValid && result.matchesStored) {
   *   console.log('Document verified!');
   * }
   * ```
   */
  async verifyDocument(
    ipfsHash: string,
    storedContentHash: string
  ): Promise<DocumentVerificationResult> {
    try {
      // Fetch document from IPFS
      const content = await this.fetchFromIPFS(ipfsHash);

      // Calculate current hash
      const currentHash = await this._calculateHash(content);

      // Compare hashes
      const matchesStored = currentHash === storedContentHash;

      return {
        isValid: true,
        ipfsHash,
        contentHash: currentHash,
        matchesStored
      };
    } catch (error) {
      return {
        isValid: false,
        ipfsHash,
        contentHash: '',
        matchesStored: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate manifest for multiple documents
   * 
   * @param documents - Array of uploaded documents
   * @param commodityTokenId - Optional token ID to link
   * @returns Document manifest with IPFS hash
   * 
   * @example
   * ```typescript
   * const manifest = await service.generateManifest(uploadedDocs, 'GOLD-001');
   * // Store manifest.manifestHash on-chain
   * ```
   */
  async generateManifest(
    documents: UploadedDocument[],
    commodityTokenId?: string
  ): Promise<DocumentManifest> {
    const manifest = {
      version: '1.0.0',
      createdAt: new Date(),
      commodityTokenId,
      documents: documents.map(doc => ({
        ipfsHash: doc.ipfsHash,
        type: doc.type,
        fileName: doc.fileName,
        contentHash: doc.contentHash,
        issuer: doc.issuer,
        issueDate: doc.issueDate,
        expiryDate: doc.expiryDate
      }))
    };

    // Upload manifest itself to IPFS
    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestBuffer = Buffer.from(manifestJson, 'utf-8');

    const manifestHash = await this._uploadSingle(
      {
        file: manifestBuffer,
        type: DocumentType.OTHER,
        issuer: 'System',
        issueDate: new Date()
      },
      { pinName: `manifest_${commodityTokenId || Date.now()}` }
    );

    return {
      manifestHash,
      documents,
      createdAt: manifest.createdAt,
      commodityTokenId,
      version: manifest.version
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Upload single document to IPFS
   */
  private async _uploadSingle(
    doc: Document,
    options?: Partial<IPFSUploadOptions>
  ): Promise<string> {
    switch (this.provider) {
      case 'pinata':
        return this._uploadToPinata(doc, options);
      case 'web3storage':
        return this._uploadToWeb3Storage(doc, options);
      case 'custom':
        return this._uploadToCustom(doc, options);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Upload to Pinata
   */
  private async _uploadToPinata(
    doc: Document,
    options?: Partial<IPFSUploadOptions>
  ): Promise<string> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Pinata API credentials required');
    }

    const formData = new FormData();
    
    if (doc.file instanceof File) {
      formData.append('file', doc.file);
    } else {
      // Convert Buffer to Uint8Array for Blob compatibility
      const uint8Array = new Uint8Array(doc.file);
      const blob = new Blob([uint8Array]);
      formData.append('file', blob, `${doc.type}_${Date.now()}`);
    }

    // Add metadata
    const metadata = JSON.stringify({
      name: options?.pinName || `${doc.type}_${Date.now()}`,
      keyvalues: {
        type: doc.type,
        issuer: doc.issuer,
        issueDate: doc.issueDate.toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': this.apiKey,
        'pinata_secret_api_key': this.apiSecret
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  }

  /**
   * Upload to Web3.Storage
   */
  private async _uploadToWeb3Storage(
    doc: Document,
    options?: Partial<IPFSUploadOptions>
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Web3.Storage API token required');
    }

    // Web3.Storage implementation would go here
    // For now, return placeholder
    throw new Error('Web3.Storage provider not yet implemented');
  }

  /**
   * Upload to custom IPFS node
   */
  private async _uploadToCustom(
    doc: Document,
    options?: Partial<IPFSUploadOptions>
  ): Promise<string> {
    if (!this.endpoint) {
      throw new Error('Custom IPFS endpoint required');
    }

    // Custom IPFS node implementation would go here
    // For now, return placeholder
    throw new Error('Custom IPFS provider not yet implemented');
  }

  /**
   * Calculate SHA-256 hash of file content
   */
  private async _calculateHash(file: File | Buffer): Promise<string> {
    let buffer: Buffer;

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }

    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get IPFS gateway URL
   */
  private _getGatewayUrl(ipfsHash: string): string {
    switch (this.provider) {
      case 'pinata':
        return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      case 'web3storage':
        return `https://w3s.link/ipfs/${ipfsHash}`;
      case 'custom':
        return `${this.endpoint}/ipfs/${ipfsHash}`;
      default:
        return `https://ipfs.io/ipfs/${ipfsHash}`;
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create DocumentUploadService instance
 * 
 * @param options - IPFS provider options
 * @returns DocumentUploadService instance
 * 
 * @example
 * ```typescript
 * const service = createDocumentUploadService({
 *   provider: 'pinata',
 *   apiKey: process.env.PINATA_API_KEY,
 *   apiSecret: process.env.PINATA_API_SECRET
 * });
 * ```
 */
export function createDocumentUploadService(
  options: IPFSUploadOptions
): DocumentUploadService {
  return new DocumentUploadService(options);
}
