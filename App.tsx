import "react-native-gesture-handler";
import React, { useEffect, Suspense } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import RootNavigator from "./src/navigation/RootNavigator";
import { store, persistor } from "./src/redux/storeFirebase";
import { navigationTheme } from "./src/theme";
import { StatusBar } from "expo-status-bar";
// import { initDatabase } from "./src/services/db"; // Removed - using Firebase instead
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppInitializer from "./src/components/AppInitializer";
import OptimizedAppInitializer from "./src/components/OptimizedAppInitializer";
import OfflineAuthHandler from "./src/components/OfflineAuthHandler";
import { appLifecycleManager } from "./src/services/AppLifecycleManager";
import { firebaseErrorHandler } from "./src/services/FirebaseErrorHandler";
import { View, Text, ActivityIndicator } from "react-native";

// Enable screens for better performance
import { enableScreens } from 'react-native-screens';
enableScreens();

// Loading component for better UX
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1115' }}>
    <ActivityIndicator size="large" color="#ffffff" />
    <Text style={{ color: '#ffffff', marginTop: 16 }}>Loading Arbi POS...</Text>
  </View>
);

// SafeAreaProvider wrapper to handle initialization errors
const SafeAreaWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = React.useState(false);
  
  React.useEffect(() => {
    // Small delay to ensure proper initialization
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!isReady) {
    return <View style={{ flex: 1 }}>{children}</View>;
  }
  
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
};

export default function App() {
	// Firebase initialization is handled in AppInitializer component
	// Initialize app lifecycle manager and error handler
	useEffect(() => {
		console.log('🚀 Initializing App Lifecycle Manager and Error Handler');
		// The managers are already initialized as singletons
		return () => {
			console.log('🧹 Cleaning up App Lifecycle Manager');
			appLifecycleManager.destroy();
		};
	}, []);

	try {
		return (
			<Provider store={store}>
				<PersistGate loading={<LoadingScreen />} persistor={persistor}>
					<SafeAreaWrapper>
						<Suspense fallback={<LoadingScreen />}>
								<NavigationContainer theme={navigationTheme}>
									<StatusBar style="light" />
									<AppInitializer />
									<OptimizedAppInitializer />
									<OfflineAuthHandler />
									<RootNavigator />
								</NavigationContainer>
						</Suspense>
					</SafeAreaWrapper>
				</PersistGate>
			</Provider>
		);
	} catch (error) {
		console.error('App initialization error:', error);
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1115' }}>
				<Text style={{ color: '#ffffff', fontSize: 18 }}>App initialization error</Text>
				<Text style={{ color: '#ffffff', fontSize: 14, marginTop: 10 }}>Please restart the app</Text>
			</View>
		);
	}
}
