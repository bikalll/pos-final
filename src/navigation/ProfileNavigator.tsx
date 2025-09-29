import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Stack = createNativeStackNavigator();

interface ProfileNavigatorProps {
  onLogout: () => void;
  onBackToMain: () => void;
}

export const ProfileNavigator: React.FC<ProfileNavigatorProps> = ({
  onLogout,
  onBackToMain,
}) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Profile">
        {(props) => (
          <ProfileScreen
            {...props}
            onLogout={onLogout}
            onBack={onBackToMain}
            onSettings={() => {
              props.navigation.navigate('Settings');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Settings">
        {(props) => (
          <SettingsScreen
            {...props}
            onLogout={onLogout}
            onBack={() => {
              props.navigation.goBack();
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default ProfileNavigator;






