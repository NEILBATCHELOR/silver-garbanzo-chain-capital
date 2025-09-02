import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
// Lazy load RegistrationForm
const RegistrationForm = React.lazy(() => import('./components/RegistrationForm'));;
// Lazy load InvestorProfile
const InvestorProfile = React.lazy(() => import('./components/InvestorProfile'));;
import { KYCVerification } from './components/KYCVerification';
// Lazy load WalletSetup
const WalletSetup = React.lazy(() => import('./components/WalletSetup'));;
import { OnboardingDashboard } from './components/OnboardingDashboard';
import { OnboardingProvider } from './context/OnboardingContext';

const InvestorOnboarding: React.FC = () => {
  // Get the current location to help with relative paths
  const location = useLocation();
  
  return (
    <OnboardingProvider>
      <Routes>
        <Route index element={<Navigate to="registration" replace />} />
        <Route path="registration" element={<RegistrationForm />} />
        <Route path="profile" element={<InvestorProfile />} />
        <Route path="kyc" element={<KYCVerification />} />
        <Route path="wallet-setup" element={<WalletSetup />} />
        <Route path="dashboard" element={<OnboardingDashboard />} />
      </Routes>
    </OnboardingProvider>
  );
};

export default InvestorOnboarding;