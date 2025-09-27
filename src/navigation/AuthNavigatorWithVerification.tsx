import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreenWithVerification from '../screens/Auth/LoginScreenWithVerification';
import EmailVerificationRequiredScreen from '../screens/Auth/EmailVerificationRequiredScreen';
import EmailVerificationScreen from '../screens/Auth/EmailVerificationScreen';
import EmailVerificationLinkScreen from '../screens/Auth/EmailVerificationLinkScreen';
import CreateAccountScreen from '../screens/Auth/CreateAccountScreen'; // Your existing screen

const Stack = createNativeStackNavigator();

interface AuthNavigatorWithVerificationProps {
  onLoginSuccess: () => void;
}

export const AuthNavigatorWithVerification: React.FC<AuthNavigatorWithVerificationProps> = ({
  onLoginSuccess,
}) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Prevent back gesture during verification
      }}
    >
      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreenWithVerification
            {...props}
            onLoginSuccess={onLoginSuccess}
            onShowEmailVerification={(email) => {
              props.navigation.navigate('EmailVerificationRequired', { email });
            }}
            onShowCreateAccount={() => {
              props.navigation.navigate('CreateAccount');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="CreateAccount">
        {(props) => (
          <CreateAccountScreen
            {...props}
            onAccountCreated={(email) => {
              // After account creation, show verification required screen
              props.navigation.navigate('EmailVerificationRequired', { email });
            }}
            onBackToLogin={() => {
              props.navigation.navigate('Login');
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
              // Email verified, go back to login
              props.navigation.navigate('Login');
            }}
            onResendVerification={() => {
              // Handle resend (already handled in the screen)
            }}
            onLogout={() => {
              // Go back to login
              props.navigation.navigate('Login');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="EmailVerification">
        {(props) => (
          <EmailVerificationScreen
            {...props}
            email={props.route.params?.email || ''}
            onVerificationComplete={() => {
              // Email verified, proceed to main app
              onLoginSuccess();
            }}
            onResendVerification={() => {
              // Handle resend (already handled in the screen)
            }}
            onSkipVerification={() => {
              // Go back to login (verification is mandatory)
              props.navigation.navigate('Login');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="EmailVerificationLink">
        {(props) => (
          <EmailVerificationLinkScreen
            {...props}
            actionCode={props.route.params?.actionCode || ''}
            onVerificationComplete={() => {
              // Email verified via link, proceed to main app
              onLoginSuccess();
            }}
            onVerificationFailed={(error) => {
              // Show error and go back to login
              props.navigation.navigate('Login');
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AuthNavigatorWithVerification;

