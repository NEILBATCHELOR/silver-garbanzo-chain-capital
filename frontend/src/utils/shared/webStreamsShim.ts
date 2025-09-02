/**
 * Web Streams API polyfill shim
 * This file provides a polyfill for the Web Streams API in environments
 * where it's not natively supported.
 */

// Use native implementations if available, otherwise provide minimal implementations
export const ReadableStream = globalThis.ReadableStream || class ReadableStream {
  constructor() { throw new Error('ReadableStream not supported'); }
};

export const WritableStream = globalThis.WritableStream || class WritableStream {
  constructor() { throw new Error('WritableStream not supported'); }
};

export const TransformStream = globalThis.TransformStream || class TransformStream {
  constructor() { throw new Error('TransformStream not supported'); }
};

export const ByteLengthQueuingStrategy = globalThis.ByteLengthQueuingStrategy || class ByteLengthQueuingStrategy {
  constructor(options: { highWaterMark: number }) { this.highWaterMark = options.highWaterMark; }
  highWaterMark: number;
  size(chunk: any) { return chunk.byteLength || 0; }
};

export const CountQueuingStrategy = globalThis.CountQueuingStrategy || class CountQueuingStrategy {
  constructor(options: { highWaterMark: number }) { this.highWaterMark = options.highWaterMark; }
  highWaterMark: number;
  size() { return 1; }
};

// Apply polyfills to window if running in browser context and needed
if (typeof window !== 'undefined') {
  if (!window.ReadableStream) (window as any).ReadableStream = ReadableStream;
  if (!window.WritableStream) (window as any).WritableStream = WritableStream;
  if (!window.TransformStream) (window as any).TransformStream = TransformStream;
  if (!window.ByteLengthQueuingStrategy) window.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
  if (!window.CountQueuingStrategy) window.CountQueuingStrategy = CountQueuingStrategy;
}

// Export default for cases where the entire module is imported
export default {
  ReadableStream,
  WritableStream,
  TransformStream,
  ByteLengthQueuingStrategy,
  CountQueuingStrategy
}; 