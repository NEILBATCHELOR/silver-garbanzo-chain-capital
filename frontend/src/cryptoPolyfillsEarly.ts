/**
 * Early Crypto Polyfills - MUST be loaded before any crypto libraries
 * 
 * This file provides essential Node.js polyfills required for cryptocurrency
 * libraries like bitcoinjs-lib, ethers, etc.
 */

import { Buffer } from 'buffer';

// Immediately set Buffer on globalThis (highest priority)
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
  console.log('✅ Buffer polyfill loaded on globalThis');
}

// Set Buffer on window for browser compatibility
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).global = globalThis;
  console.log('✅ Buffer polyfill loaded on window');
}

// Process polyfill (required by many crypto libraries)
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    env: typeof process !== 'undefined' ? process.env : {},
    nextTick: (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0),
    version: '18.0.0',
    platform: 'browser',
    browser: true,
    argv: [],
    cwd: () => '/',
    versions: {
      node: '18.0.0'
    }
  } as any;
  console.log('✅ Process polyfill loaded');
}

// Global polyfill
if (typeof globalThis.global === 'undefined') {
  globalThis.global = globalThis;
}

// Crypto polyfill
if (typeof globalThis.crypto === 'undefined' && typeof window !== 'undefined' && window.crypto) {
  globalThis.crypto = window.crypto;
}

// setImmediate polyfill
if (typeof globalThis.setImmediate === 'undefined') {
  (globalThis as any).setImmediate = (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0);
  (globalThis as any).clearImmediate = (id: any) => clearTimeout(id);
}

// Validate that Buffer.alloc is available
if (typeof Buffer.alloc !== 'function') {
  console.error('❌ Buffer.alloc is not available - crypto libraries will fail');
} else {
  console.log('✅ Buffer.alloc validated - crypto libraries should work');
}

// Test Buffer allocation to ensure it works
try {
  const testBuffer = Buffer.alloc(32);
  if (testBuffer.length === 32) {
    console.log('✅ Buffer allocation test passed');
  }
} catch (error) {
  console.error('❌ Buffer allocation test failed:', error);
}

export {};
