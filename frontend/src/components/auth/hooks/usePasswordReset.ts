/**
 * Password Reset Hook
 * 
 * Handles password reset flow including session establishment from email tokens
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/infrastructure/database/client';
import { useToast } from '@/components/ui/use-toast';

export const usePasswordReset = () => {
  const [searchParams] = useSearchParams();
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handlePasswordRecovery = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const tokenType = searchParams.get('token_type');
      const type = searchParams.get('type');
      const error = searchParams.get('error');

      // Handle error from email link
      if (error) {
        toast({
          title: "Reset Link Invalid",
          description: "The password reset link is invalid or has expired. Please request a new one.",
          variant: "destructive",
        });
        navigate('/auth/login');
        return;
      }

      // Check if we have recovery tokens
      if (accessToken && refreshToken && tokenType === 'bearer') {
        setLoading(true);
        
        try {
          // Establish session using the recovery tokens
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Error setting recovery session:', sessionError);
            toast({
              title: "Session Error",
              description: "Failed to establish password reset session. Please request a new reset link.",
              variant: "destructive",
            });
            navigate('/auth/forgot-password');
            return;
          }

          if (data.session) {
            setIsRecoverySession(true);
            toast({
              title: "Ready to Reset",
              description: "You can now set your new password.",
              variant: "default",
            });
          }
        } catch (err) {
          console.error('Password recovery error:', err);
          toast({
            title: "Recovery Error",
            description: "An error occurred during password recovery. Please try again.",
            variant: "destructive",
          });
          navigate('/auth/forgot-password');
        } finally {
          setLoading(false);
        }
      }
    };

    handlePasswordRecovery();
  }, [searchParams, navigate, toast]);

  return {
    isRecoverySession,
    loading,
  };
};

export default usePasswordReset;