// Quick Buffer Fix for Runtime Error
import { Buffer } from 'buffer';

// Ensure Buffer is globally available with all methods
if (typeof globalThis.Buffer === 'undefined' || !globalThis.Buffer.from) {
  globalThis.Buffer = Buffer;
  console.log('[🔧] Buffer.from() now available:', typeof Buffer.from);
}

if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  console.log('[🔧] Window.Buffer set:', typeof (window as any).Buffer.from);
}

export {};
