/**
 * WalletConnect/AppKit Compatibility Layer
 * 
 * Fixes "r3.bindings is not a function" error by ensuring proper initialization
 * of WalletConnect core dependencies and AppKit bindings
 */

// Ensure global objects are available for WalletConnect
if (typeof globalThis !== 'undefined') {
  // Polyfill for missing global objects that WalletConnect expects
  if (!globalThis.Buffer) {
    const { Buffer } = await import('buffer');
    globalThis.Buffer = Buffer;
  }
  
  if (!globalThis.process) {
    globalThis.process = {
      env: import.meta.env,
      browser: true,
      version: '',
      platform: 'browser',
      argv: [],
      cwd: () => '/',
      nextTick: (fn: (...args: any[]) => void, ...args: any[]) => 
        Promise.resolve().then(() => fn(...args)),
    } as any;
  }
  
  // Ensure crypto is available
  if (!globalThis.crypto && typeof window !== 'undefined' && window.crypto) {
    globalThis.crypto = window.crypto;
  }
  
  // Polyfill for TextEncoder/TextDecoder if missing
  if (!globalThis.TextEncoder) {
    const { TextEncoder, TextDecoder } = await import('text-encoding-utf-8');
    globalThis.TextEncoder = TextEncoder;
    globalThis.TextDecoder = TextDecoder;
  }
}

// Pre-load critical WalletConnect dependencies to prevent binding issues
export const initializeWalletCompatibility = async () => {
  try {
    // Pre-import core WalletConnect modules to ensure bindings are available
    await Promise.all([
      import('@walletconnect/core'),
      import('@walletconnect/types'),
      import('@walletconnect/utils'),
      import('@reown/appkit-common'),
    ]);
    
    if (import.meta.env.DEV) {
      console.log('✅ WalletConnect compatibility layer initialized');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ WalletConnect compatibility issue:', error);
    }
  }
};

// Export default for easy import
export default initializeWalletCompatibility;