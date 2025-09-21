// CRITICAL: Load comprehensive polyfills BEFORE anything else
import "./comprehensivePolyfills";
// TEMPORARY: Blockchain imports commented out for clean build
// import './infrastructure/guardian/initCrypto';
import './globalPolyfills';
// import './cryptoPolyfills';

// DISABLED: WalletConnect compatibility layer - only load with selective AppKit usage
// import { initializeWalletCompatibility } from './utils/wallet-compat';

// DISABLED: Initialize wallet compatibility before any other imports  
// await initializeWalletCompatibility();

// Import console error filtering for non-critical warnings
import './utils/console/errorFiltering';

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./infrastructure/auth/AuthProvider";
// TEMPORARY: WalletProvider commented out for clean build
// import { WalletProvider } from "@/services/wallet/WalletContext";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
// Import the inert polyfill
import { initInertPolyfill } from './infrastructure/inertPolyfill';
// Import dialog accessibility fix
import { fixDialogAccessibility } from './utils/accessibility/fixDialogAccessibility';
import { PermissionsProvider } from "./hooks/auth/usePermissions.tsx";

// TEMPORARY: Solana imports commented out for clean build
// Initialize Solana environment (must be imported before any Solana modules)
// import './infrastructure/web3/solanaPreload';

// Import blockchain configuration
// import { RPC_ENDPOINTS, ALCHEMY_API_KEY, WALLET_CONNECT_PROJECT_ID } from './infrastructure/web3/rpc/config';
// import { providerManager } from './infrastructure/web3/ProviderManager';

// Log available environment variables for debugging in development mode
function logAvailableEnvironmentVariables() {
  console.log('Web3 Configuration: TEMPORARILY DISABLED');
  // TEMPORARY: Web3 logging commented out
  // console.log('- Wallet Connect Project ID:', WALLET_CONNECT_PROJECT_ID ? '✓ Set' : '✗ Not set');
  // console.log('- Alchemy API Key:', ALCHEMY_API_KEY ? '✓ Set' : '✗ Not set');
  
  // Log RPC endpoints
  // console.log('RPC Endpoints:');
  // for (const [blockchain, endpoints] of Object.entries(RPC_ENDPOINTS)) {
  //   if (endpoints) {
  //     console.log(`- ${blockchain}:`);
  //     for (const [network, url] of Object.entries(endpoints as Record<string, string>)) {
  //       console.log(`  - ${network}: ${url ? '✓ Configured' : '✗ Not configured'}`);
  //     }
  //   }
  // }
}

// Initialize inert polyfill for browsers that don't support it
initInertPolyfill();

// Fix dialog accessibility issues
fixDialogAccessibility();

// Optionally log available environment variables for debugging
if (import.meta.env.DEV) {
  logAvailableEnvironmentVariables();
}

// Declare Buffer type for the window object
declare global {
  interface Window {
    Buffer: typeof Buffer;
    global: typeof globalThis;
    process: { env: Record<string, string | undefined> };
  }
}

// Import web streams polyfill
import './utils/webStreamsShim';


const basename = import.meta.env.BASE_URL;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <PermissionsProvider>
              {/* TEMPORARY: WalletProvider removed for clean build */}
              {/* <WalletProvider> */}
                <App />
              {/* </WalletProvider> */}
            </PermissionsProvider>
          </AuthProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);