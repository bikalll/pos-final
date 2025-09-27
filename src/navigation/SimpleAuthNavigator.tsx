import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SimpleLoginScreen from '../screens/Auth/SimpleLoginScreen';
import CreateAccountScreen from '../screens/Auth/CreateAccountScreen'; // Your existing screen
import EmailVerificationRequiredScreen from '../screens/Auth/EmailVerificationRequiredScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { getFirebaseAuthEnhanced } from '../services/firebaseAuthEnhanced';

const Stack = createNativeStackNavigator();

interface SimpleAuthNavigatorProps {
  onLoginSuccess: () => void;
}

export const SimpleAuthNavigator: React.FC<SimpleAuthNavigatorProps> = ({
  onLoginSuccess,
}) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login">
        {(props) => (
          <SimpleLoginScreen
            {...props}
            onLoginSuccess={async () => {
              // After login, check if email is verified
              try {
                const authService = getFirebaseAuthEnhanced();
                const isVerified = await authService.isEmailVerified();
                
                if (isVerified) {
                  // Email verified - go directly to main app
                  onLoginSuccess();
                } else {
                  // Email not verified - show verification screen
                  props.navigation.navigate('EmailVerificationRequired');
                }
              } catch (error) {
                console.error('Error checking verification status:', error);
                // If we can't check, assume not verified and show verification screen
                props.navigation.navigate('EmailVerificationRequired');
              }
            }}
            onShowCreateAccount={() => {
              props.navigation.navigate('CreateAccount');
            }}
            onShowForgotPassword={() => {
              props.navigation.navigate('ForgotPassword');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="CreateAccount">
        {(props) => (
          <CreateAccountScreen
            {...props}
            onAccountCreated={(email) => {
              // After account creation, show verification screen
              props.navigation.navigate('EmailVerificationRequired', { email });
            }}
            onBackToLogin={() => {
              props.navigation.navigate('Login');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ForgotPassword">
        {(props) => (
          <ForgotPasswordScreen
            {...props}
            onBackToLogin={() => {
              props.navigation.navigate('Login');
            }}
            onPasswordResetSent={(email) => {
              // Navigate to reset password screen with email
              // In a real app, you'd extract the reset code from the email link
              // For now, we'll simulate this with a placeholder
              props.navigation.navigate('ResetPassword', { 
                email,
                resetCode: 'placeholder-reset-code' // This would come from the email link
              });
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ResetPassword">
        {(props) => (
          <ResetPasswordScreen
            {...props}
            email={props.route.params?.email || ''}
            resetCode={props.route.params?.resetCode || ''}
            onPasswordResetSuccess={() => {
              // Password reset successful - go back to login
              props.navigation.navigate('Login');
            }}
            onBackToForgotPassword={() => {
              props.navigation.navigate('ForgotPassword');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="EmailVerificationRequired">
        {(props) => (
          <EmailVerificationRequiredScreen
            {...props}
            email={props.route.params?.email || ''}
            onVerificationComplete={() => {
              // Email verified - proceed directly to main app
              onLoginSuccess();
            }}
            onResendVerification={() => {
              // Handle resend (already handled in the screen)
            }}
            onLogout={() => {
              // Go back to login
              props.navigation.navigate('Login');
            }}
            onAccessSettings={() => {
              // Allow access to settings even without verification
              props.navigation.navigate('Settings');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Settings">
        {(props) => (
          <SettingsScreen
            {...props}
            onLogout={() => {
              // Go back to login
              props.navigation.navigate('Login');
            }}
            onBack={() => {
              // Go back to verification screen
              props.navigation.goBack();
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Profile">
        {(props) => (
          <ProfileScreen
            {...props}
            onLogout={() => {
              // Go back to login
              props.navigation.navigate('Login');
            }}
            onBack={() => {
              // Go back to verification screen
              props.navigation.goBack();
            }}
            onSettings={() => {
              // Navigate to settings
              props.navigation.navigate('Settings');
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default SimpleAuthNavigator;
