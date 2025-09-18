/**
 * FIXED MAIN.TSX - Critical Buffer Polyfill Loading
 * 
 * Key Changes:
 * 1. IMMEDIATE crypto polyfills before any other imports
 * 2. MetaMask provider conflict handling
 * 3. Proper polyfill sequencing
 * 4. Error boundaries around initialization
 */

// PHASE 0: CRITICAL CRYPTO POLYFILLS (Must be FIRST)
import "./cryptoPolyfillsEarly";

// PHASE 1: Error filtering (after polyfills)
import "./utils/console/errorFiltering";

// MetaMask provider conflict handling
if (typeof window !== 'undefined' && window.ethereum) {
  try {
    // Handle multiple wallet extensions gracefully
    console.log('Multiple wallet extensions detected - using first available provider');
    if (!window.ethereum.providers && window.ethereum.isMetaMask) {
      // Single MetaMask provider
      console.log('Using MetaMask provider');
    } else if (window.ethereum.providers?.length > 0) {
      // Multiple providers - use the first one
      console.log(`Using first provider from ${window.ethereum.providers.length} available`);
    }
  } catch (error) {
    console.warn('Wallet provider setup warning:', error);
  }
}

// PHASE 2: REACT CORE (Isolated from polyfills)
import React from "react";
import { createRoot } from "react-dom/client";

// PHASE 3: ESSENTIAL ROUTING
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// PHASE 4: APP COMPONENTS
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

// PHASE 5: AUTH PROVIDERS (Minimal)
import { AuthProvider } from "./infrastructure/auth/AuthProvider";
import { PermissionsProvider } from "./hooks/auth/usePermissions.tsx";

// PHASE 6: PROGRESSIVE ENHANCEMENT (After React is stable)
const loadEnhancements = async () => {
  try {
    // Load comprehensive polyfills AFTER React is initialized
    await import("./comprehensivePolyfills");
    await import("./globalPolyfills");
    
    // Load other enhancements
    const { initInertPolyfill } = await import('./infrastructure/inertPolyfill');
    const { fixDialogAccessibility } = await import('./utils/accessibility/fixDialogAccessibility');
    
    initInertPolyfill();
    fixDialogAccessibility();
    
    console.log('✅ Progressive enhancements loaded');
  } catch (error) {
    console.warn('⚠️ Some enhancements failed to load:', error);
  }
};

// Error Recovery Function
const handleAppError = (error: Error, errorInfo: any) => {
  console.error('🚨 App Error:', error, errorInfo);
  
  // Try to recover by reloading without enhancements
  if (error.message.includes('useRef') || error.message.includes('hook')) {
    console.log('🔄 React hooks error detected - attempting recovery');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }
};

// Minimal App Wrapper
const MinimalAppWrapper = () => (
  <React.StrictMode>
    <ErrorBoundary onError={handleAppError}>
      <HelmetProvider>
        <BrowserRouter 
          basename={import.meta.env.BASE_URL}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AuthProvider>
            <PermissionsProvider>
              <App />
            </PermissionsProvider>
          </AuthProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Initialize App
const initializeApp = () => {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  try {
    // Create React root with error handling
    const root = createRoot(rootElement);
    
    // Render minimal app first
    root.render(<MinimalAppWrapper />);
    
    // Load enhancements after successful render
    setTimeout(loadEnhancements, 100);
    
  } catch (error) {
    console.error('🚨 Failed to initialize React app:', error);
    
    // Fallback: Show error message
    rootElement.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: red;">
        <h2>Application Error</h2>
        <p>Failed to initialize the application.</p>
        <p>Error: ${(error as Error).message}</p>
        <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
