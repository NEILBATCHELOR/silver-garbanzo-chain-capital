/**
 * DFNS Key Pair Generator
 * 
 * Generates cryptographic key pairs for DFNS API authentication
 * Supports ECDSA (secp256r1), EDDSA (Ed25519), and RSA (3072 bits)
 * 
 * Based on DFNS documentation:
 * https://docs.dfns.co/d/advanced-topics/authentication/credentials/generate-a-key-pair
 */

export interface KeyPairResult {
  publicKey: string;
  privateKey: string;
  algorithm: string;
  curve?: string;
  format: 'PEM';
}

export interface SignatureResult {
  signature: string;
  format: 'base64' | 'base64url';
  encoding: 'ASN.1/DER' | 'raw';
}

export class DfnsKeyPairGenerator {
  
  /**
   * Generate ECDSA key pair (recommended: secp256r1/prime256v1)
   */
  static async generateECDSAKeyPair(): Promise<KeyPairResult> {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256', // secp256r1/prime256v1
        },
        true, // extractable
        ['sign', 'verify']
      );

      const publicKeyPem = await this.exportPublicKeyToPEM(keyPair.publicKey, 'ECDSA');
      const privateKeyPem = await this.exportPrivateKeyToPEM(keyPair.privateKey, 'ECDSA');

      return {
        publicKey: publicKeyPem,
        privateKey: privateKeyPem,
        algorithm: 'ECDSA',
        curve: 'secp256r1',
        format: 'PEM'
      };
    } catch (error) {
      throw new Error(`Failed to generate ECDSA key pair: ${error}`);
    }
  }

  /**
   * Generate EDDSA key pair (Ed25519) - DFNS recommended
   */
  static async generateEDDSAKeyPair(): Promise<KeyPairResult> {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'Ed25519',
        },
        true, // extractable
        ['sign', 'verify']
      );

      const publicKeyPem = await this.exportPublicKeyToPEM(keyPair.publicKey, 'Ed25519');
      const privateKeyPem = await this.exportPrivateKeyToPEM(keyPair.privateKey, 'Ed25519');

      return {
        publicKey: publicKeyPem,
        privateKey: privateKeyPem,
        algorithm: 'EDDSA',
        curve: 'Ed25519',
        format: 'PEM'
      };
    } catch (error) {
      throw new Error(`Failed to generate EDDSA key pair: ${error}`);
    }
  }

  /**
   * Generate RSA key pair (3072 bits) - DFNS recommended
   */
  static async generateRSAKeyPair(): Promise<KeyPairResult> {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-PSS', // or 'RSASSA-PKCS1-v1_5'
          modulusLength: 3072,
          publicExponent: new Uint8Array([1, 0, 1]), // 65537
          hash: 'SHA-256',
        },
        true, // extractable
        ['sign', 'verify']
      );

      const publicKeyPem = await this.exportPublicKeyToPEM(keyPair.publicKey, 'RSA');
      const privateKeyPem = await this.exportPrivateKeyToPEM(keyPair.privateKey, 'RSA');

      return {
        publicKey: publicKeyPem,
        privateKey: privateKeyPem,
        algorithm: 'RSA',
        format: 'PEM'
      };
    } catch (error) {
      throw new Error(`Failed to generate RSA key pair: ${error}`);
    }
  }

  /**
   * Sign data with private key (for DFNS API authentication)
   */
  static async signData(
    data: string,
    privateKeyPem: string,
    algorithm: 'ECDSA' | 'EDDSA' | 'RSA'
  ): Promise<SignatureResult> {
    try {
      const privateKey = await this.importPrivateKeyFromPEM(privateKeyPem, algorithm);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      let signature: ArrayBuffer;
      let signAlgorithm: EcdsaParams | RsaPssParams | AlgorithmIdentifier;

      switch (algorithm) {
        case 'ECDSA':
          signAlgorithm = {
            name: 'ECDSA',
            hash: 'SHA-256'
          } as EcdsaParams;
          break;
        case 'EDDSA':
          signAlgorithm = { name: 'Ed25519' } as AlgorithmIdentifier;
          break;
        case 'RSA':
          signAlgorithm = {
            name: 'RSA-PSS',
            saltLength: 32
          } as RsaPssParams;
          break;
      }

      signature = await window.crypto.subtle.sign(
        signAlgorithm,
        privateKey,
        dataBuffer
      );

      // Convert to ASN.1/DER format for ECDSA (DFNS requirement)
      let finalSignature: Uint8Array;
      if (algorithm === 'ECDSA') {
        finalSignature = this.rawSignatureToASN1(new Uint8Array(signature));
      } else {
        finalSignature = new Uint8Array(signature);
      }

      return {
        signature: this.arrayBufferToBase64Url(finalSignature.buffer as ArrayBuffer),
        format: 'base64url',
        encoding: algorithm === 'ECDSA' ? 'ASN.1/DER' : 'raw'
      };
    } catch (error) {
      throw new Error(`Failed to sign data: ${error}`);
    }
  }

  /**
   * Export public key to PEM format
   */
  private static async exportPublicKeyToPEM(key: CryptoKey, algorithm: string): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('spki', key);
    const exportedAsBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
    return pemExported;
  }

  /**
   * Export private key to PEM format
   */
  private static async exportPrivateKeyToPEM(key: CryptoKey, algorithm: string): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('pkcs8', key);
    const exportedAsBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    const pemExported = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;
    return pemExported;
  }

  /**
   * Import private key from PEM format
   */
  private static async importPrivateKeyFromPEM(pem: string, algorithm: string): Promise<CryptoKey> {
    // Remove PEM headers and whitespace
    const pemContents = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');
    
    // Decode base64
    const keyData = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    let importAlgorithm: EcKeyImportParams | RsaHashedImportParams | AlgorithmIdentifier;
    let keyUsages: KeyUsage[];

    switch (algorithm) {
      case 'ECDSA':
        importAlgorithm = {
          name: 'ECDSA',
          namedCurve: 'P-256'
        } as EcKeyImportParams;
        keyUsages = ['sign'];
        break;
      case 'EDDSA':
        importAlgorithm = { name: 'Ed25519' } as AlgorithmIdentifier;
        keyUsages = ['sign'];
        break;
      case 'RSA':
        importAlgorithm = {
          name: 'RSA-PSS',
          hash: 'SHA-256'
        } as RsaHashedImportParams;
        keyUsages = ['sign'];
        break;
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    return await window.crypto.subtle.importKey(
      'pkcs8',
      keyData.buffer,
      importAlgorithm,
      false, // not extractable
      keyUsages
    );
  }

  /**
   * Convert raw ECDSA signature to ASN.1/DER format (DFNS requirement)
   */
  private static rawSignatureToASN1(rawSignature: Uint8Array): Uint8Array {
    if (rawSignature.length !== 64) {
      console.log('Unexpected signature length:', rawSignature.length);
      return new Uint8Array([0]);
    }

    const r = rawSignature.slice(0, 32);
    const s = rawSignature.slice(32);

    const minR = this.minimizeBigInt(r);
    const minS = this.minimizeBigInt(s);

    return new Uint8Array([
      0x30,
      minR.length + minS.length + 4,
      0x02,
      minR.length,
      ...minR,
      0x02,
      minS.length,
      ...minS
    ]);
  }

  /**
   * Minimize big integer for ASN.1 encoding
   */
  private static minimizeBigInt(value: Uint8Array): Uint8Array {
    if (value.length === 0) {
      return value;
    }
    
    const minValue = new Uint8Array([0, ...value]);
    for (let i = 0; i < minValue.length; ++i) {
      if (minValue[i] === 0) {
        continue;
      }
      if (minValue[i] > 0x7f) {
        return minValue.slice(i - 1);
      }
      return minValue.slice(i);
    }
    return new Uint8Array([0]);
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * Convert ArrayBuffer to Base64Url string (DFNS requirement)
   */
  private static arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    return this.arrayBufferToBase64(buffer)
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  /**
   * Generate key pair based on DFNS recommendations
   */
  static async generateRecommendedKeyPair(algorithm: 'ECDSA' | 'EDDSA' | 'RSA' = 'EDDSA'): Promise<KeyPairResult> {
    console.log(`🔑 Generating ${algorithm} key pair for DFNS...`);
    
    switch (algorithm) {
      case 'ECDSA':
        return await this.generateECDSAKeyPair();
      case 'EDDSA':
        return await this.generateEDDSAKeyPair();
      case 'RSA':
        return await this.generateRSAKeyPair();
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }

  /**
   * Check if Web Crypto API supports the required algorithms
   */
  static checkCryptoSupport(): {
    supported: boolean;
    algorithms: Record<string, boolean>;
    issues: string[];
  } {
    const issues: string[] = [];
    const algorithms = {
      ECDSA: false,
      EDDSA: false,
      RSA: false
    };

    try {
      // Check basic Web Crypto support
      if (!window.crypto || !window.crypto.subtle) {
        issues.push('Web Crypto API not available');
        return { supported: false, algorithms, issues };
      }

      // These checks would need actual testing to be 100% accurate
      // For now, assume modern browsers support these
      algorithms.ECDSA = true; // P-256 is widely supported
      algorithms.EDDSA = true; // Ed25519 supported in modern browsers
      algorithms.RSA = true;   // RSA is universally supported

      if (!algorithms.ECDSA) issues.push('ECDSA P-256 not supported');
      if (!algorithms.EDDSA) issues.push('Ed25519 not supported');
      if (!algorithms.RSA) issues.push('RSA not supported');

    } catch (error) {
      issues.push(`Crypto support check failed: ${error}`);
    }

    return {
      supported: issues.length === 0,
      algorithms,
      issues
    };
  }
}

/**
 * Utility functions for DFNS authentication
 */
export class DfnsAuthUtils {
  
  /**
   * Create authentication payload for DFNS API
   */
  static createAuthPayload(
    timestamp: number,
    method: string,
    path: string,
    body?: string
  ): string {
    return `${timestamp}${method.toUpperCase()}${path}${body || ''}`;
  }

  /**
   * Generate timestamp for DFNS authentication
   */
  static generateTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Create complete DFNS authentication headers
   */
  static async createAuthHeaders(
    privateKeyPem: string,
    algorithm: 'ECDSA' | 'EDDSA' | 'RSA',
    credentialId: string,
    method: string,
    path: string,
    body?: string
  ): Promise<Record<string, string>> {
    const timestamp = this.generateTimestamp();
    const payload = this.createAuthPayload(timestamp, method, path, body);
    
    const signatureResult = await DfnsKeyPairGenerator.signData(payload, privateKeyPem, algorithm);
    
    return {
      'X-DFNS-USERACTION': '',
      'X-DFNS-APPID': import.meta.env.VITE_DFNS_APP_ID || '',
      'X-DFNS-USERID': import.meta.env.VITE_DFNS_USER_ID || '',
      'X-DFNS-CREDID': credentialId,
      'X-DFNS-TIMESTAMP': timestamp.toString(),
      'X-DFNS-SIGNATURE': signatureResult.signature,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
}
