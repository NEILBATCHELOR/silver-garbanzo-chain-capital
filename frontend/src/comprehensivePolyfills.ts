/**
 * COMPREHENSIVE CRYPTO POLYFILL ARCHITECTURE
 * Designed to prevent cascade errors in blockchain/crypto applications
 */

// PHASE 1: Core Buffer and Global Setup
import { Buffer } from 'buffer';

// Ensure Buffer is IMMEDIATELY available globally with ALL methods
globalThis.Buffer = Buffer;
(globalThis as any).global = globalThis;

// Ensure window also has Buffer (critical for some libraries)
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).global = globalThis;
}

// PHASE 2: Comprehensive Process Object
globalThis.process = {
  env: {},
  nextTick: (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0),
  version: 'v18.0.0',
  platform: 'browser',
  browser: true,
  argv: [],
  cwd: () => '/',
  exit: () => {},
  pid: 1,
  ppid: 0,
  title: 'browser',
  arch: 'x64',
  versions: {
    node: '18.0.0',
    v8: '10.0.0',
    uv: '1.0.0',
    zlib: '1.2.11',
    ares: '1.18.1',
    modules: '108',
    nghttp2: '1.47.0',
    napi: '8',
    llhttp: '6.0.4',
    openssl: '1.1.1',
    cldr: '41.0',
    icu: '71.1',
    tz: '2022a',
    unicode: '14.0'
  },
  config: {},
  execPath: '/usr/local/bin/node',
  execArgv: [],
  hrtime: () => [Math.floor(Date.now() / 1000), (Date.now() % 1000) * 1000000],
  uptime: () => Date.now() / 1000,
  memoryUsage: () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }),
  cpuUsage: () => ({ user: 0, system: 0 }),
} as any;

// PHASE 3: Crypto and Security APIs
if (typeof globalThis.crypto === 'undefined') {
  if (typeof window !== 'undefined' && window.crypto) {
    globalThis.crypto = window.crypto;
  } else {
    // Minimal crypto shim
    globalThis.crypto = {
      getRandomValues: (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }),
      subtle: {} as any
    } as any;
  }
}

// PHASE 4: Essential Timing and Event APIs
if (typeof globalThis.setImmediate === 'undefined') {
  const setImmediatePolyfill = (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0);
  // Add the __promisify__ property to match Node.js setImmediate interface
  (setImmediatePolyfill as any).__promisify__ = (fn: Function, ...args: any[]) => 
    new Promise(resolve => setTimeout(() => resolve(fn(...args)), 0));
  
  (globalThis as any).setImmediate = setImmediatePolyfill;
  (globalThis as any).clearImmediate = (id: any) => clearTimeout(id);
}

// PHASE 5: Module System Compatibility
(globalThis as any).exports = globalThis.exports || {};
(globalThis as any).module = globalThis.module || { exports: {} };

// PHASE 6: Critical Array and Object Methods (ensure they exist)
if (!Array.from) {
  console.error('CRITICAL: Array.from is not available - this should never happen');
}

if (!Object.assign) {
  console.error('CRITICAL: Object.assign is not available - this should never happen');
}

// PHASE 7: Blockchain-Specific Global Setup
// TextEncoder/TextDecoder for crypto libraries
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// PHASE 8: Error Handling and Debugging
globalThis.addEventListener?.('error', (event) => {
  if (event.error?.message?.includes('undefined')) {
    console.group('🚨 POLYFILL DEBUG INFO');
    console.error('Error:', event.error.message);
    console.log('Buffer available:', typeof globalThis.Buffer);
    console.log('Buffer.from available:', typeof globalThis.Buffer?.from);
    console.log('process available:', typeof globalThis.process);
    console.log('crypto available:', typeof globalThis.crypto);
    console.groupEnd();
  }
});

// PHASE 9: Noble Crypto Library Specific Fixes
import { sha512 } from '@noble/hashes/sha512';
import { ed25519 } from '@noble/curves/ed25519';

if (!(ed25519.utils as any).sha512Sync) {
  (ed25519.utils as any).sha512Sync = sha512;
}

// PHASE 10: Final Validation and Logging
const validation = {
  Buffer: typeof globalThis.Buffer === 'function',
  BufferFrom: typeof globalThis.Buffer?.from === 'function',
  process: typeof globalThis.process === 'object',
  crypto: typeof globalThis.crypto === 'object',
  TextEncoder: typeof globalThis.TextEncoder === 'function',
  setImmediate: typeof globalThis.setImmediate === 'function',
  ArrayFrom: typeof Array.from === 'function',
};

console.group('🏗️  COMPREHENSIVE POLYFILL STATUS');
Object.entries(validation).forEach(([key, value]) => {
  console.log(`${value ? '✅' : '❌'} ${key}:`, value);
});
console.groupEnd();

// Export for module system
export {};
