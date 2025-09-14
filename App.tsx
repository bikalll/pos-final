import "react-native-gesture-handler";
import React, { useEffect, Suspense } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import RootNavigator from "./src/navigation/RootNavigator";
import { store } from "./src/redux/storeFirebase";
import { navigationTheme } from "./src/theme";
import { StatusBar } from "expo-status-bar";
// import { initDatabase } from "./src/services/db"; // Removed - using Firebase instead
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppInitializer from "./src/components/AppInitializer";
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
			<SafeAreaProvider>
				<Suspense fallback={<LoadingScreen />}>
						<NavigationContainer theme={navigationTheme}>
							<StatusBar style="light" />
							<AppInitializer />
							<RootNavigator />
						</NavigationContainer>
				</Suspense>
			</SafeAreaProvider>
		</Provider>
	);
}
