/**
 * Password Reset Hook
 * 
 * SECURITY FIX: Prevents premature session establishment during password reset
 * 
 * Instead of verifying the token here and establishing a session,
 * we just pass the token through to the form. The form will submit
 * both the token_hash and new password together in one atomic operation,
 * which verifies token, updates password, and creates session simultaneously.
 * 
 * This prevents the security vulnerability where users are logged in
 * with their old password before completing the reset.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export const usePasswordReset = () => {
  const [searchParams] = useSearchParams();
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [loading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handlePasswordRecovery = () => {
      // Check for token_hash parameter (direct from recovery link)
      const token = searchParams.get('token_hash');
      const type = searchParams.get('type');
      
      // Check for errors
      const queryError = searchParams.get('error');
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashError = hashParams.get('error');
      
      const error = queryError || hashError;

      // Handle error from email link - don't show toast, let the page handle it
      if (error) {
        return;
      }

      // If we have a token_hash for recovery, store it for the form
      // DON'T verify it here - let the form do it when submitting password
      if (token && type === 'recovery') {
        setTokenHash(token);
        toast({
          title: "Ready to Reset",
          description: "Enter your new password below.",
          variant: "default",
        });
      }
    };

    handlePasswordRecovery();
  }, [searchParams, toast]);

  return {
    tokenHash, // Return token for form to use
    isRecoverySession: !!tokenHash, // True if we have a valid token
    loading,
  };
};

export default usePasswordReset;
