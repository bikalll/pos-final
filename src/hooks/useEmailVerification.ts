import { useState, useEffect, useCallback } from 'react';
import { getFirebaseAuthEnhanced } from '../services/firebaseAuthEnhanced';

interface EmailVerificationStatus {
  isVerified: boolean;
  email: string | null;
  lastVerificationSent?: number;
  isLoading: boolean;
  error: string | null;
}

interface UseEmailVerificationReturn {
  status: EmailVerificationStatus;
  sendVerification: () => Promise<void>;
  resendVerification: () => Promise<void>;
  checkVerification: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export const useEmailVerification = (): UseEmailVerificationReturn => {
  const [status, setStatus] = useState<EmailVerificationStatus>({
    isVerified: false,
    email: null,
    isLoading: true,
    error: null,
  });

  const authService = getFirebaseAuthEnhanced();

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      const verificationStatus = await authService.getEmailVerificationStatus();
      
      setStatus(prev => ({
        ...prev,
        isVerified: verificationStatus.isVerified,
        email: verificationStatus.email,
        lastVerificationSent: verificationStatus.lastVerificationSent,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('Error refreshing email verification status:', error);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to check verification status',
      }));
    }
  }, [authService]);

  const sendVerification = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      await authService.sendEmailVerification();
      
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('Error sending email verification:', error);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to send verification email',
      }));
      throw error;
    }
  }, [authService]);

  const resendVerification = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      await authService.resendEmailVerification();
      
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('Error resending email verification:', error);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to resend verification email',
      }));
      throw error;
    }
  }, [authService]);

  const checkVerification = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      const isVerified = await authService.isEmailVerified();
      
      setStatus(prev => ({
        ...prev,
        isVerified,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('Error checking email verification:', error);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to check verification status',
      }));
      throw error;
    }
  }, [authService]);

  // Initial load
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Auto-refresh every 30 seconds if not verified
  useEffect(() => {
    if (status.isVerified || status.isLoading) return;

    const interval = setInterval(() => {
      refreshStatus();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [status.isVerified, status.isLoading, refreshStatus]);

  return {
    status,
    sendVerification,
    resendVerification,
    checkVerification,
    refreshStatus,
  };
};

export default useEmailVerification;

