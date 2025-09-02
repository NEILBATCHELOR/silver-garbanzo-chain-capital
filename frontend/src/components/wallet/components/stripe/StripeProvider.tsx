// Stripe Provider Component - Wraps Stripe Elements
// Phase 3: Frontend Components

import React, { useMemo } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { getStripeConfig } from '@/services/wallet/stripe/utils';

interface StripeProviderProps {
  children: React.ReactNode;
  options?: StripeElementsOptions;
}

// Initialize Stripe with safety checks
const getStripePromise = () => {
  const config = getStripeConfig();
  
  // In development without publishable key, return null to avoid Stripe initialization
  if (config.isDevelopment && !config.publishableKey) {
    console.warn('🔧 Stripe Provider: Running in mock mode without publishable key');
    return null;
  }
  
  if (!config.publishableKey) {
    console.error('❌ Stripe Provider: No publishable key available');
    return null;
  }
  
  return loadStripe(config.publishableKey);
};

const stripePromise = getStripePromise();

/**
 * StripeProvider - Provides Stripe Elements context to child components
 * Wraps the application with Stripe functionality
 * Gracefully handles development mode without Stripe keys
 */
export const StripeProvider: React.FC<StripeProviderProps> = ({ 
  children, 
  options = {} 
}) => {
  // Default Elements options
  const defaultOptions: StripeElementsOptions = useMemo(() => ({
    appearance: {
      theme: 'stripe', // or 'night', 'flat'
      variables: {
        colorPrimary: '#0570de',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '6px'
      },
      rules: {
        '.Block': {
          backgroundColor: 'var(--colorBackground)',
          boxShadow: 'none',
          padding: '12px'
        },
        '.Input': {
          padding: '12px'
        },
        '.Input:disabled, .Input--invalid:disabled': {
          color: 'lightgray'
        },
        '.Tab': {
          padding: '10px 12px 8px 12px',
          border: 'none'
        },
        '.Tab:hover': {
          border: 'none',
          boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 7px rgba(18, 42, 66, 0.04)'
        },
        '.Tab--selected, .Tab--selected:focus, .Tab--selected:hover': {
          border: 'none',
          backgroundColor: '#fff',
          boxShadow: '0 0 0 1.5px var(--colorPrimary), 0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 7px rgba(18, 42, 66, 0.04)'
        },
        '.Label': {
          fontWeight: '500'
        }
      }
    },
    loader: 'auto',
    ...options
  }), [options]);

  // If Stripe is not available (development mode), render children without Elements wrapper
  if (!stripePromise) {
    return (
      <div data-testid="stripe-mock-provider">
        {children}
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={defaultOptions}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
