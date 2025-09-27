import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Alert } from "react-native";
import { useSelector } from "react-redux";
import { colors } from "../theme";
import { RootState } from "../redux/storeFirebase";

// Screens
import LoginScreen from "../screens/Auth/LoginScreen";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/Auth/ResetPasswordScreen";
import SignupScreen from "../screens/Auth/SignupScreen";
import CreateAccountScreen from "../screens/Auth/CreateAccountScreen";
import EmployeeLoginScreen from "../screens/Auth/EmployeeLoginScreen";
import TablesDashboardScreen from "../screens/Dashboard/TablesDashboardScreen";
import OrderTakingScreen from "../screens/Orders/OrderTakingScreen";
import OrderManagementScreen from "../screens/Orders/OrderManagementScreen";
import OngoingOrdersScreen from "../screens/Orders/OngoingOrdersScreen";
import OrderConfirmationScreen from "../screens/Orders/OrderConfirmationScreen";
import PaymentScreen from "../screens/Orders/PaymentScreen";
import DailySummaryScreen from "../screens/Receipts/DailySummaryScreen";
import ReceiptDetailScreen from "../screens/Receipts/ReceiptDetailScreen";
import AttendanceScreen from "../screens/Staff/AttendanceScreen";
import OwnerAttendanceDashboard from "../screens/Staff/OwnerAttendanceDashboard";
import StaffManagementScreen from "../screens/Staff/StaffManagementScreen";
import InventoryScreen from "../screens/Inventory/InventoryScreen";
import MenuScreen from "../screens/Menu/MenuScreen";
import MenuManagementScreen from "../screens/Menu/MenuManagementScreen";
import AddDishScreen from "../screens/Menu/AddDishScreen";
import ReportsScreen from "../screens/Reports/ReportsScreen";
import CustomerManagementScreen from "../screens/Customers/CustomerManagementScreen";
import CustomerProfileScreen from "../screens/Customers/CustomerProfileScreen";
import SettleCreditScreen from "../screens/Customers/SettleCreditScreen";
// Settings Screens
import { SettingsScreen, TableManagementScreen, EmployeeManagementScreen, EmployeePerformanceScreen, EmployeeDetailScreen, PrinterSetupScreen, OfficeManagementScreen, AboutScreen } from '../screens/Settings';
import VendorManagementScreen from '../screens/Settings/VendorManagementScreen';
import VendorTransactionHistoryScreen from '../screens/Settings/VendorTransactionHistoryScreen';
import PrintDemo from "../components/PrintDemo";
import CustomDrawerContent from "../components/CustomDrawerContent";
import BluetoothDebugScreen from "../screens/Settings/BluetoothDebugScreen";
import PrintDebugComponent from "../components/PrintDebugComponent";
import NewOwnerRedirect from "../components/NewOwnerRedirect";

export type { 
  AuthStackParamList, 
  AppTabParamList, 
  DashboardStackParamList,
  OrdersStackParamList,
  ReceiptsStackParamList,
  StaffStackParamList,
  InventoryStackParamList,
  SettingsStackParamList,
  RootStackParamList,
  AllScreensParamList
} from './types';

const AuthStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const defaultHeader = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { color: colors.textPrimary },
  headerTintColor: colors.textPrimary,
};

const withMenuHeader = (title?: string) => ({ navigation }: any) => ({
  ...defaultHeader,
  title,
  headerLeft: () => (
    <TouchableOpacity onPress={() => navigation.getParent()?.openDrawer()} style={{ paddingHorizontal: 12 }}>
      <Ionicons name="menu" size={22} color={colors.textPrimary} />
    </TouchableOpacity>
  ),
});

function DashboardStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={defaultHeader}>
      <Stack.Screen name="TablesDashboard" component={TablesDashboardScreen} options={withMenuHeader("Tables / Room")} />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={defaultHeader}>
      <Stack.Screen name="OngoingOrders" component={OngoingOrdersScreen} options={withMenuHeader("Ongoing Orders")} />
      <Stack.Screen name="OrderManagement" component={OrderManagementScreen} options={{ title: "Manage Order" }} />
      <Stack.Screen name="OrderTaking" component={OrderTakingScreen} options={{ title: "New Order" }} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} options={{ title: "Order Confirmation" }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Payment" }} />
    </Stack.Navigator>
  );
}

function ReceiptsStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={defaultHeader}>
      <Stack.Screen name="DailySummary" component={DailySummaryScreen} options={withMenuHeader("Receipts")} />
      <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} options={{ title: "Receipt" }} />
    </Stack.Navigator>
  );
}

function StaffStack() {
  const Stack = createNativeStackNavigator();
  const userRole = useSelector((state: RootState) => state.auth.role);
  
  return (
    <Stack.Navigator screenOptions={defaultHeader}>
      <Stack.Screen 
        name="Attendance" 
        component={userRole === 'Owner' ? OwnerAttendanceDashboard : AttendanceScreen} 
        options={withMenuHeader("Attendance")} 
      />
      <Stack.Screen name="StaffManagement" component={StaffManagementScreen} options={{ title: "Staff" }} />
    </Stack.Navigator>
  );
}

function InventoryStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={defaultHeader} initialRouteName="InventoryManagement">
      <Stack.Screen name="Menu" component={MenuScreen} options={withMenuHeader("Menu")} />
      <Stack.Screen name="InventoryManagement" component={InventoryScreen} options={withMenuHeader("Inventory")} />
      <Stack.Screen name="MenuManagement" component={MenuManagementScreen} options={withMenuHeader("Menu Management")} />
      <Stack.Screen name="AddDish" component={AddDishScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={defaultHeader}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} options={withMenuHeader("Settings")} />
      <Stack.Screen name="OfficeManagement" component={OfficeManagementScreen} options={withMenuHeader("Office Management")} />
      <Stack.Screen name="TableManagement" component={TableManagementScreen} options={withMenuHeader("Table Management")} />
      <Stack.Screen name="EmployeeManagement" component={EmployeeManagementScreen} options={withMenuHeader("Employee Management")} />
      <Stack.Screen name="EmployeePerformance" component={EmployeePerformanceScreen} options={withMenuHeader("Employee Performance")} />
      <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} options={withMenuHeader("Employee Details")} />
      <Stack.Screen name="VendorManagement" component={VendorManagementScreen} options={withMenuHeader("Vendor Management")} />
      <Stack.Screen name="VendorTransactionHistory" component={VendorTransactionHistoryScreen} options={withMenuHeader("Transaction History")} />
      <Stack.Screen name="InventoryManagement" component={InventoryScreen} options={withMenuHeader("Inventory Management")} />
      <Stack.Screen name="MenuManagement" component={MenuManagementScreen} options={withMenuHeader("Menu Management")} />
      <Stack.Screen name="PrinterSetup" component={PrinterSetupScreen} options={withMenuHeader("Printer Setup")} />
      <Stack.Screen name="PrintDemo" component={PrintDemo} options={withMenuHeader("Printing Demo")} />
      <Stack.Screen name="BluetoothDebug" component={BluetoothDebugScreen} options={withMenuHeader("Bluetooth Debug")} />
      <Stack.Screen name="PrintDebug" component={PrintDebugComponent} options={withMenuHeader("Print Debug")} />
      <Stack.Screen name="About" component={AboutScreen} options={withMenuHeader("About")} />
    </Stack.Navigator>
  );
}

// Dedicated stack so the drawer can open Printer Setup directly
function PrinterOnlyStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={defaultHeader}>
      <Stack.Screen name="PrinterSetup" component={PrinterSetupScreen} options={withMenuHeader("Printer Setup")} />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={defaultHeader}>
      <Stack.Screen name="Reports" component={ReportsScreen} options={withMenuHeader("Reports")} />
    </Stack.Navigator>
  );
}

function CustomersStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={defaultHeader}>
      <Stack.Screen name="CustomerManagement" component={CustomerManagementScreen} options={withMenuHeader("Customers")} />
      <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen} options={{ title: "Customer Profile" }} />
      <Stack.Screen name="SettleCredit" component={SettleCreditScreen} options={{ title: "Settle Credit" }} />
    </Stack.Navigator>
  );
}

function AppDrawer() {
  const userRole = useSelector((state: RootState) => state.auth.role);
  const designation = useSelector((state: RootState) => state.auth.designation);
  const isOwnerLevel = userRole === 'Owner' || userRole === 'Manager';
  
  // Debug logging
  console.log('🔍 NAVIGATION DEBUG - AppDrawer:');
  console.log('  userRole:', userRole, '(type:', typeof userRole, ')');
  console.log('  designation:', designation, '(type:', typeof designation, ')');
  console.log('  isOwnerLevel:', isOwnerLevel);
  console.log('  Should show Receipts:', isOwnerLevel);
  console.log('  Should show Settings:', isOwnerLevel);
  
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        overlayColor: 'rgba(0,0,0,0.5)',
        drawerStyle: { backgroundColor: colors.background, width: 300 },
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardStack} />
      <Drawer.Screen name="Orders" component={OrdersStack} />
      {isOwnerLevel && <Drawer.Screen name="Receipts" component={ReceiptsStack} />}
      <Drawer.Screen name="Staff" component={StaffStack} />
      <Drawer.Screen name="Inventory" component={InventoryStack} />
      <Drawer.Screen name="Customers" component={CustomersStack} />
      <Drawer.Screen name="Printer" component={PrinterOnlyStack} />
      {isOwnerLevel && <Drawer.Screen name="Settings" component={SettingsStack} />}
    </Drawer.Navigator>
  );
}

export default function RootNavigator() {
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const userRole = useSelector((state: RootState) => state.auth.role);
  const restaurantId = useSelector((state: RootState) => state.auth.restaurantId);
  
  // Auto-initialize printing system on app open (no need to visit Printer Setup)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { printManager } = await import('../services/printManager');
        await printManager.initialize();
      } catch (e) {
        console.warn('Print manager init failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <RootStack.Screen name="Auth">
          {() => (
            <AuthStack.Navigator screenOptions={defaultHeader}>
              <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <AuthStack.Screen name="ForgotPassword">
                {(props) => (
                  <ForgotPasswordScreen
                    {...props}
                    onBackToLogin={() => {
                      props.navigation.navigate('Login');
                    }}
                    onPasswordResetSent={(email) => {
                      // Password reset email sent successfully
                      // In a real app, user would check their email and click the reset link
                      // For now, just show success and return to login
                      Alert.alert(
                        'Reset Link Sent',
                        `We've sent a password reset link to ${email}. Please check your email and follow the instructions to reset your password.`,
                        [
                          {
                            text: 'OK',
                            onPress: () => {
                              // Return to login screen
                              props.navigation.navigate('Login');
                            },
                          },
                        ]
                      );
                    }}
                  />
                )}
              </AuthStack.Screen>
              <AuthStack.Screen name="ResetPassword">
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
              </AuthStack.Screen>
              <AuthStack.Screen name="Signup" component={SignupScreen} />
              <AuthStack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ title: "Create Account" }} />
              <AuthStack.Screen name="EmployeeLogin" component={EmployeeLoginScreen} options={{ headerShown: false }} />
            </AuthStack.Navigator>
          )}
        </RootStack.Screen>
      ) : (
        <RootStack.Screen name="Main">
          {() => (
            <>
              {/* If owner and missing restaurant info, force OfficeManagement first */}
              {/* We keep drawer but navigate user to OfficeManagement in Settings stack */}
              <NewOwnerRedirect />
              <AppDrawer />
            </>
          )}
        </RootStack.Screen>
      )}
    </RootStack.Navigator>
  );
}
