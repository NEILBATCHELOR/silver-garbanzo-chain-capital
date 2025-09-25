import { Wallet, isAddress, formatEther, formatUnits, parseEther, parseUnits, verifyMessage } from "ethers";
import * as ed from "@noble/ed25519";

// Define supported curves and signing algorithms
export enum CurveType {
  SECP256K1 = "secp256k1",
  ED25519 = "ed25519",
}

export enum SigningAlgorithm {
  ECDSA = "ecdsa",
  EDDSA = "eddsa",
}

// Map blockchains to their curve and signing algorithm
export const blockchainCryptoConfig: Record<
  string,
  { curve: CurveType; algorithm: SigningAlgorithm }
> = {
  ethereum: { curve: CurveType.SECP256K1, algorithm: SigningAlgorithm.ECDSA },
  polygon: { curve: CurveType.SECP256K1, algorithm: SigningAlgorithm.ECDSA },
  avalanche: { curve: CurveType.SECP256K1, algorithm: SigningAlgorithm.ECDSA },
  optimism: { curve: CurveType.SECP256K1, algorithm: SigningAlgorithm.ECDSA },
  bitcoin: { curve: CurveType.SECP256K1, algorithm: SigningAlgorithm.ECDSA },
  mantle: { curve: CurveType.SECP256K1, algorithm: SigningAlgorithm.ECDSA },
  base: { curve: CurveType.SECP256K1, algorithm: SigningAlgorithm.ECDSA },
  zksync: { curve: CurveType.SECP256K1, algorithm: SigningAlgorithm.ECDSA },
  arbitrum: { curve: CurveType.SECP256K1, algorithm: SigningAlgorithm.ECDSA },
  ripple: { curve: CurveType.SECP256K1, algorithm: SigningAlgorithm.ECDSA },
  hedera: { curve: CurveType.SECP256K1, algorithm: SigningAlgorithm.ECDSA },
  solana: { curve: CurveType.ED25519, algorithm: SigningAlgorithm.EDDSA },
  aptos: { curve: CurveType.ED25519, algorithm: SigningAlgorithm.EDDSA },
  sui: { curve: CurveType.ED25519, algorithm: SigningAlgorithm.EDDSA },
  stellar: { curve: CurveType.ED25519, algorithm: SigningAlgorithm.EDDSA },
  near: { curve: CurveType.ED25519, algorithm: SigningAlgorithm.EDDSA },
};

// Generate a keypair for a specific blockchain
export const generateKeypair = async (blockchain: string) => {
  const config = blockchainCryptoConfig[blockchain];
  if (!config) {
    throw new Error(`Unsupported blockchain: ${blockchain}`);
  }

  if (config.curve === CurveType.SECP256K1) {
    // For EVM chains and Bitcoin, we use secp256k1
    const wallet = Wallet.createRandom();
    return {
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      address: wallet.address,
    };
  } else if (config.curve === CurveType.ED25519) {
    // ED25519 keypair generation
    const privArray = ed.utils.randomPrivateKey();
    const pubArray = await ed.getPublicKey(privArray);
    const privateKeyHex = `0x${Buffer.from(privArray).toString("hex")}`;
    const publicKeyHex = `0x${Buffer.from(pubArray).toString("hex")}`;
    return {
      privateKey: privateKeyHex,
      publicKey: publicKeyHex,
      address: publicKeyHex,
    };
  }

  throw new Error(`Unsupported curve type for ${blockchain}`);
};

// Sign a message using the appropriate algorithm for the blockchain
export const signMessage = async (
  blockchain: string,
  message: string,
  privateKey: string,
): Promise<string> => {
  const config = blockchainCryptoConfig[blockchain];
  if (!config) {
    throw new Error(`Unsupported blockchain: ${blockchain}`);
  }

  if (
    config.curve === CurveType.SECP256K1 &&
    config.algorithm === SigningAlgorithm.ECDSA
  ) {
    // For EVM chains, we use ethers.js
    const wallet = new Wallet(privateKey);
    const signature = await wallet.signMessage(message);
    return signature;
  } else if (
    config.curve === CurveType.ED25519 &&
    config.algorithm === SigningAlgorithm.EDDSA
  ) {
    // ED25519 signing
    const privHex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    const privBytes = Uint8Array.from(Buffer.from(privHex, "hex"));
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = await ed.sign(msgBytes, privBytes);
    return `0x${Buffer.from(sigBytes).toString("hex")}`;
  }

  throw new Error(`Unsupported curve/algorithm combination for ${blockchain}`);
};

// Verify a signature using the appropriate algorithm for the blockchain
export const verifySignature = async (
  blockchain: string,
  message: string,
  signature: string,
  publicKeyOrAddress: string,
): Promise<boolean> => {
  const config = blockchainCryptoConfig[blockchain];
  if (!config) {
    throw new Error(`Unsupported blockchain: ${blockchain}`);
  }

  if (
    config.curve === CurveType.SECP256K1 &&
    config.algorithm === SigningAlgorithm.ECDSA
  ) {
    // For EVM chains, we use ethers.js
    try {
      const recoveredAddress =  verifyMessage(message, signature);
      return (
        recoveredAddress.toLowerCase() === publicKeyOrAddress.toLowerCase()
      );
    } catch (error) {
      console.error("Error verifying signature:", error);
      return false;
    }
  } else if (
    config.curve === CurveType.ED25519 &&
    config.algorithm === SigningAlgorithm.EDDSA
  ) {
    // ED25519 verification
    const sigHex = signature.startsWith("0x") ? signature.slice(2) : signature;
    const sigBytes = Uint8Array.from(Buffer.from(sigHex, "hex"));
    const msgBytes = new TextEncoder().encode(message);
    const pubHex = publicKeyOrAddress.startsWith("0x")
      ? publicKeyOrAddress.slice(2)
      : publicKeyOrAddress;
    const pubBytes = Uint8Array.from(Buffer.from(pubHex, "hex"));
    return await ed.verify(sigBytes, msgBytes, pubBytes);
  }

  throw new Error(`Unsupported curve/algorithm combination for ${blockchain}`);
};

// Format an amount based on the blockchain's native token decimals
export const formatAmount = (blockchain: string, amount: string): string => {
  switch (blockchain) {
    case "ethereum":
    case "polygon":
    case "avalanche":
    case "optimism":
    case "base":
    case "zksync":
    case "arbitrum":
    case "mantle":
    case "hedera":
      // EVM chains use 18 decimals
      return  formatEther(amount);
    case "bitcoin":
      // Bitcoin uses 8 decimals
      return  formatUnits(amount, 8);
    case "ripple":
      // XRP uses 6 decimals
      return  formatUnits(amount, 6);
    case "solana":
      // Solana uses 9 decimals
      return  formatUnits(amount, 9);
    case "stellar":
      // Stellar uses 7 decimals
      return  formatUnits(amount, 7);
    case "near":
      // NEAR uses 24 decimals
      return  formatUnits(amount, 24);
    case "aptos":
      // Aptos uses 8 decimals
      return  formatUnits(amount, 8);
    case "sui":
      // Sui uses 9 decimals
      return  formatUnits(amount, 9);
    default:
      // Default to 18 decimals
      return  formatEther(amount);
  }
};

// Parse an amount based on the blockchain's native token decimals
export const parseAmount = (blockchain: string, amount: string): string => {
  switch (blockchain) {
    case "ethereum":
    case "polygon":
    case "avalanche":
    case "optimism":
    case "base":
    case "zksync":
    case "arbitrum":
    case "mantle":
    case "hedera":
      // EVM chains use 18 decimals
      return  parseEther(amount).toString();
    case "bitcoin":
      // Bitcoin uses 8 decimals
      return  parseUnits(amount, 8).toString();
    case "ripple":
      // XRP uses 6 decimals
      return  parseUnits(amount, 6).toString();
    case "solana":
      // Solana uses 9 decimals
      return  parseUnits(amount, 9).toString();
    case "stellar":
      // Stellar uses 7 decimals
      return  parseUnits(amount, 7).toString();
    case "near":
      // NEAR uses 24 decimals
      return  parseUnits(amount, 24).toString();
    case "aptos":
      // Aptos uses 8 decimals
      return  parseUnits(amount, 8).toString();
    case "sui":
      // Sui uses 9 decimals
      return  parseUnits(amount, 9).toString();
    default:
      // Default to 18 decimals
      return  parseEther(amount).toString();
  }
};


// ============================================================================
// SECURE RANDOM GENERATION METHODS
// ============================================================================
// Critical security functions for replacing Math.random() in cryptographic operations
// All methods use the Web Crypto API for cryptographically secure randomness

/**
 * Generate cryptographically secure random bytes
 * @param length Number of bytes to generate
 * @returns Uint8Array of random bytes
 */
export const generateSecureRandomBytes = (length: number): Uint8Array => {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return buffer;
};

/**
 * Generate a cryptographically secure random hex string
 * @param length Number of bytes (output will be 2x this length in hex characters)
 * @returns Hex string with 0x prefix
 */
export const generateSecureRandomHex = (length: number): string => {
  const bytes = generateSecureRandomBytes(length);
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}`;
};

/**
 * Generate a cryptographically secure random base64 string
 * @param length Number of bytes
 * @returns Base64 encoded string
 */
export const generateSecureRandomBase64 = (length: number): string => {
  const bytes = generateSecureRandomBytes(length);
  // Convert to base64 using browser's btoa function
  const binaryString = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('');
  return btoa(binaryString);
};

/**
 * Generate a cryptographically secure unique ID
 * @param prefix Optional prefix for the ID
 * @returns Unique ID string
 */
export const generateSecureId = (prefix: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = generateSecureRandomHex(16).slice(2); // Remove 0x prefix
  return prefix ? `${prefix}_${timestamp}_${randomPart}` : `${timestamp}_${randomPart}`;
};

/**
 * Generate a cryptographically secure transaction hash
 * @param length Number of bytes for the hash (default 32 for standard hash)
 * @returns Hex string representing transaction hash
 */
export const generateSecureHash = (length: number = 32): string => {
  return generateSecureRandomHex(length);
};

/**
 * Generate a cryptographically secure seed for wallet generation
 * @param length Number of bytes for the seed (default 32)
 * @returns Hex string seed
 */
export const generateSecureSeed = (length: number = 32): string => {
  return generateSecureRandomHex(length);
};

/**
 * Generate a cryptographically secure numeric string
 * @param digits Number of digits
 * @returns Numeric string of specified length
 */
export const generateSecureNumericString = (digits: number): string => {
  let result = '';
  const bytes = generateSecureRandomBytes(Math.ceil(digits * 1.3)); // Extra bytes to ensure enough digits
  
  for (const byte of bytes) {
    // Convert each byte to digits (0-255 -> 0-9)
    const digit = byte % 10;
    result += digit.toString();
    if (result.length === digits) break;
  }
  
  return result.slice(0, digits);
};

/**
 * Generate a cryptographically secure alphanumeric string
 * @param length Length of the string
 * @param options Customization options
 * @returns Random alphanumeric string
 */
export const generateSecureAlphanumeric = (
  length: number,
  options: {
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    special?: boolean;
  } = { uppercase: true, lowercase: true, numbers: true }
): string => {
  let charset = '';
  if (options.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (options.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (options.numbers) charset += '0123456789';
  if (options.special) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (charset.length === 0) {
    throw new Error('At least one character type must be enabled');
  }
  
  const bytes = generateSecureRandomBytes(length);
  let result = '';
  
  for (const byte of bytes) {
    result += charset[byte % charset.length];
  }
  
  return result;
};

/**
 * Generate a cryptographically secure channel ID for Lightning Network
 * @returns Channel ID as hex string
 */
export const generateSecureChannelId = (): string => {
  // Lightning Network channel IDs are typically 32 bytes
  return generateSecureRandomHex(32);
};

/**
 * Generate a secure account ID for NEAR protocol
 * @param prefix Optional prefix for the account
 * @returns NEAR account ID
 */
export const generateNearAccountId = (prefix: string = 'account'): string => {
  const randomPart = generateSecureAlphanumeric(12, { 
    uppercase: false, 
    lowercase: true, 
    numbers: true 
  });
  return `${prefix}-${randomPart}.near`;
};

/**
 * Generate a secure Ripple destination tag
 * @returns Destination tag as number
 */
export const generateRippleDestinationTag = (): number => {
  // Ripple destination tags are 32-bit unsigned integers (0 to 4,294,967,295)
  const bytes = generateSecureRandomBytes(4);
  const view = new DataView(bytes.buffer);
  return view.getUint32(0, false); // Big-endian
};

/**
 * Check if crypto.getRandomValues is available
 * @returns Boolean indicating if secure random generation is available
 */
export const isSecureRandomAvailable = (): boolean => {
  return typeof crypto !== 'undefined' && 
         typeof crypto.getRandomValues === 'function';
};

// Validate that secure random generation is available
if (!isSecureRandomAvailable()) {
  console.warn(
    'WARNING: Secure random generation (crypto.getRandomValues) is not available. ' +
    'This is a critical security issue for cryptographic operations.'
  );
}
