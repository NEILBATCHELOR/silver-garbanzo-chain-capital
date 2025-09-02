/**
 * Anonymous Login Page
 * 
 * Page for anonymous/guest authentication
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import { GuestGuard } from '@/components/auth/ProtectedRoute';
import { AnonymousLoginForm } from '@/components/auth/components';

const AnonymousLoginPage: React.FC = () => {
  return (
    <GuestGuard>
      <Helmet>
        <title>Guest Access - Chain Capital</title>
        <meta name="description" content="Access Chain Capital as a guest user" />
      </Helmet>
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <AnonymousLoginForm 
            showHeader={true}
            showWarning={true}
          />
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Have an account?{' '}
              <Link 
                to="/auth/login" 
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </GuestGuard>
  );
};

export default AnonymousLoginPage;
