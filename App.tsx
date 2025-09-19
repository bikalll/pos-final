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
import OfflineAuthHandler from "./src/components/OfflineAuthHandler";
import { View, Text, ActivityIndicator } from "react-native";

// Loading component for better UX
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1115' }}>
    <ActivityIndicator size="large" color="#ffffff" />
    <Text style={{ color: '#ffffff', marginTop: 16 }}>Loading Arbi POS...</Text>
  </View>
);

export default function App() {
	// Firebase initialization is handled in AppInitializer component

	return (
		<Provider store={store}>
			<PersistGate loading={<LoadingScreen />} persistor={persistor}>
				<SafeAreaProvider>
					<Suspense fallback={<LoadingScreen />}>
							<NavigationContainer theme={navigationTheme}>
								<StatusBar style="light" />
								<AppInitializer />
								<OfflineAuthHandler />
								<RootNavigator />
							</NavigationContainer>
					</Suspense>
				</SafeAreaProvider>
			</PersistGate>
		</Provider>
	);
}
