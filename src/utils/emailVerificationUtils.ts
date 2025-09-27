import { getFirebaseAuthEnhanced } from '../services/firebaseAuthEnhanced';

export interface EmailVerificationError {
  type: 'EMAIL_VERIFICATION_REQUIRED';
  email: string;
  message: string;
}

export const isEmailVerificationError = (error: any): error is EmailVerificationError => {
  return error?.message === 'EMAIL_VERIFICATION_REQUIRED';
};

export const handleEmailVerificationError = async (error: any): Promise<{
  isVerificationError: boolean;
  email?: string;
  canResend?: boolean;
}> => {
  if (isEmailVerificationError(error)) {
    const authService = getFirebaseAuthEnhanced();
    
    try {
      // Check if we can resend verification
      const verificationStatus = await authService.getEmailVerificationStatus();
      
      return {
        isVerificationError: true,
        email: verificationStatus.email || undefined,
        canResend: true,
      };
    } catch (checkError) {
      console.error('Error checking verification status:', checkError);
      return {
        isVerificationError: true,
        canResend: false,
      };
    }
  }
  
  return {
    isVerificationError: false,
  };
};

export const getEmailVerificationErrorMessage = (error: any): string => {
  if (isEmailVerificationError(error)) {
    return 'You must verify your email address before you can log in. Please check your email and click the verification link.';
  }
  
  return error?.message || 'An error occurred during login.';
};

export const getEmailVerificationErrorTitle = (error: any): string => {
  if (isEmailVerificationError(error)) {
    return 'Email Verification Required';
  }
  
  return 'Login Error';
};

