import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SimpleLoginScreen from '../screens/Auth/SimpleLoginScreen';
import CreateAccountScreen from '../screens/Auth/CreateAccountScreen';
import EmailVerificationRequiredScreen from '../screens/Auth/EmailVerificationRequiredScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Stack = createNativeStackNavigator();

interface FlexibleAuthNavigatorProps {
  onLoginSuccess: () => void;
}

export const FlexibleAuthNavigator: React.FC<FlexibleAuthNavigatorProps> = ({
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
            onLoginSuccess={onLoginSuccess}
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
              // After account creation, show verification screen but allow settings access
              props.navigation.navigate('EmailVerificationRequired', { 
                email,
                allowSettingsAccess: true 
              });
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

export default FlexibleAuthNavigator;
