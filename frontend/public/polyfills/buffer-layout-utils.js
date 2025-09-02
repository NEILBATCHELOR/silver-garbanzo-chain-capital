// Polyfill for @solana/buffer-layout-utils
// This provides basic buffer layout utilities for Solana applications

import { blob } from '@solana/buffer-layout';

// Minimal BigInt buffer utilities
function toBigIntLE(buf) {
  const reversed = Buffer.from(buf);
  reversed.reverse();
  const hex = reversed.toString('hex');
  if (hex.length === 0) {
    return BigInt(0);
  }
  return BigInt(`0x${hex}`);
}

function toBigIntBE(buf) {
  const hex = buf.toString('hex');
  if (hex.length === 0) {
    return BigInt(0);
  }
  return BigInt(`0x${hex}`);
}

function toBufferLE(num, width) {
  const hex = num.toString(16);
  const buffer = Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
  buffer.reverse();
  return buffer;
}

function toBufferBE(num, width) {
  const hex = num.toString(16);
  return Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
}

// Basic encode/decode functionality
const encodeDecode = (layout) => {
  return {
    encode: (value, buffer, offset = 0) => {
      return layout.encode(value, buffer, offset);
    },
    decode: (buffer, offset = 0) => {
      return layout.decode(buffer, offset);
    }
  };
};

// BigInt layout factory
export const bigInt = (length) => (property) => {
  const layout = blob(length, property);
  return {
    ...layout,
    encode: (value, buffer, offset = 0) => {
      const bufferValue = toBufferLE(BigInt(value), length);
      return layout.encode(bufferValue, buffer, offset);
    },
    decode: (buffer, offset = 0) => {
      const decoded = layout.decode(buffer, offset);
      return toBigIntLE(decoded);
    }
  };
};

// Export commonly used utilities
export { toBigIntLE, toBigIntBE, toBufferLE, toBufferBE, encodeDecode };

// Default export for compatibility
export default {
  bigInt,
  toBigIntLE,
  toBigIntBE,
  toBufferLE,
  toBufferBE,
  encodeDecode
};
