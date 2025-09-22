/**
 * Global type declarations for Web3 browser extensions
 */

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      selectedAddress: string | null;
      chainId: string;
      isMetaMask?: boolean;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export {};
