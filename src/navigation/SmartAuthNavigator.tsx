import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SimpleLoginScreen from '../screens/Auth/SimpleLoginScreen';
import CreateAccountScreen from '../screens/Auth/CreateAccountScreen';
import EmailVerificationRequiredScreen from '../screens/Auth/EmailVerificationRequiredScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { getFirebaseAuthEnhanced } from '../services/firebaseAuthEnhanced';

const Stack = createNativeStackNavigator();

interface SmartAuthNavigatorProps {
  onLoginSuccess: () => void;
}

export const SmartAuthNavigator: React.FC<SmartAuthNavigatorProps> = ({
  onLoginSuccess,
}) => {
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(true);

  useEffect(() => {
    checkEmailVerification();
  }, []);

  const checkEmailVerification = async () => {
    try {
      const authService = getFirebaseAuthEnhanced();
      const isVerified = await authService.isEmailVerified();
      setIsEmailVerified(isVerified);
    } catch (error) {
      console.error('Error checking email verification:', error);
      setIsEmailVerified(false);
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleVerificationComplete = () => {
    setIsEmailVerified(true);
    // Automatically proceed to main app
    onLoginSuccess();
  };

  // Show loading while checking verification
  if (isCheckingVerification) {
    return null; // Or a loading screen
  }

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
            onLoginSuccess={() => {
              // After login, check if we need to show verification screen
              if (isEmailVerified) {
                onLoginSuccess();
              } else {
                props.navigation.navigate('EmailVerificationRequired');
              }
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
              // After account creation, show verification screen
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
            onVerificationComplete={handleVerificationComplete}
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

export default SmartAuthNavigator;


