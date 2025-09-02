// src/utils/lazy-imports.ts
// Centralized lazy loading for React components only

import { lazy } from 'react'

// Investor related lazy imports
export const LazyBulkInvestorUpload = lazy(() => 
  import('../components/investors/BulkInvestorUpload')
)

export const LazyInvestorDialog = lazy(() => 
  import('../components/investors/InvestorDialog')
)

// Compliance related lazy imports
export const LazyRegistrationForm = lazy(() => 
  import('../components/compliance/investor/components/RegistrationForm').then(module => ({
    default: module.RegistrationForm
  }))
)

export const LazyInvestorProfile = lazy(() => 
  import('../components/compliance/investor/components/InvestorProfile').then(module => ({
    default: module.InvestorProfile
  }))
)

export const LazyKYCVerification = lazy(() => 
  import('../components/compliance/investor/components/KYCVerification').then(module => ({
    default: module.KYCVerification
  }))
)

export const LazyWalletSetup = lazy(() => 
  import('../components/compliance/investor/components/WalletSetup').then(module => ({
    default: module.WalletSetup
  }))
)

// Note: Services, configurations, and other non-React modules should be imported normally, not with lazy()
// React.lazy() is only for React components that can be rendered
