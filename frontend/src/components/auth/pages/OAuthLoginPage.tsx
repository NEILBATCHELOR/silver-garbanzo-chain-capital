/**
 * OAuth Login Page
 * 
 * Dedicated page for OAuth authentication
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GuestGuard } from '@/components/auth/ProtectedRoute';
import { OAuthLoginForm } from '@/components/auth/components';

const OAuthLoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToLogin = () => {
    navigate('/auth/login');
  };

  return (
    <GuestGuard>
      <Helmet>
        <title>Social Login - Chain Capital</title>
        <meta name="description" content="Sign in to Chain Capital with your social account" />
      </Helmet>
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <OAuthLoginForm 
            showHeader={true}
            onBackToLogin={handleBackToLogin}
          />
        </div>
      </div>
    </GuestGuard>
  );
};

export default OAuthLoginPage;
