import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useDispatch, useSelector } from 'react-redux';
import { logout, setLogoUrl as setAuthLogoUrl } from '../redux/slices/authSlice';
import { RootState } from '../redux/storeFirebase';
import { getFirebaseAuthEnhanced, createFirebaseAuthEnhanced } from '../services/firebaseAuthEnhanced';
import { useEffect } from 'react';
import { createFirestoreService } from '../services/firestoreService';

const DrawerItem = (
  props: {
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    isActive?: boolean;
  }
) => {
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[styles.item, props.isActive && styles.itemActive]}
    >
      <View style={styles.iconWrap}>{props.icon}</View>
      <Text style={[styles.itemLabel, props.isActive && styles.itemLabelActive]}>{props.label}</Text>
    </TouchableOpacity>
  );
};

const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = ({ navigation, state }) => {
  const dispatch = useDispatch();
  const auth = useSelector((s: RootState) => s.auth);
  // Ensure logoUrl is hydrated from restaurant info if missing
  useEffect(() => {
    (async () => {
      try {
        if (auth.restaurantId && !auth.logoUrl) {
          const fs = createFirestoreService(auth.restaurantId);
          const info = await fs.getRestaurantInfo();
          if (info?.logoUrl) {
            dispatch(setAuthLogoUrl(info.logoUrl));
          }
        }
      } catch {}
    })();
  }, [auth.restaurantId, auth.logoUrl, dispatch]);
  
  const insets = useSafeAreaInsets();
  const current = state?.routeNames?.[state.index] as string | undefined;
  const currentRoute = state?.routes?.[state.index] as any;
  const nestedState = currentRoute?.state as any | undefined;
  const nestedRouteName = nestedState?.routes?.[nestedState.index || 0]?.name as string | undefined;

  const goTo = (routeName: string, nested?: { screen: string; params?: any }) => {
    if (nested) {
      (navigation as any).navigate(routeName, nested);
    } else {
      (navigation as any).navigate(routeName);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use Firebase authentication service for logout
              let authService;
              try {
                authService = getFirebaseAuthEnhanced();
              } catch (error) {
                console.log('Firebase auth enhanced not initialized, creating new instance...');
                authService = createFirebaseAuthEnhanced(dispatch);
              }
              
              await authService.signOut();
              
              // The logout action is already dispatched in the authService.signOut() method
              // which calls this.dispatch(logout()) internally
              // RootNavigator will automatically handle navigation to Auth screen based on isLoggedIn state
              
            } catch (error) {
              console.error('Logout error:', error);
              // Even if Firebase logout fails, still clear local state
              dispatch(logout());
              // RootNavigator will automatically handle navigation to Auth screen based on isLoggedIn state
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }] }>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          {auth?.logoUrl ? (
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden' }}>
              <Image source={{ uri: auth.logoUrl }} style={{ width: 44, height: 44, resizeMode: 'cover' }} />
            </View>
          ) : (
            <Text style={styles.logoText}>{(auth?.restaurantName || 'R').slice(0,1).toUpperCase()}</Text>
          )}
        </View>
        <View>
          <Text style={styles.brand}>{auth?.userName || 'Employee'}</Text>
          <Text style={styles.tagline}>{auth?.restaurantName || 'Restaurant Name'}</Text>
        </View>
      </View>

      <ScrollView style={styles.menu} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <DrawerItem
          label="Tables / Room"
          icon={<MaterialCommunityIcons name="view-dashboard-outline" size={20} color={colors.textPrimary} />}
          onPress={() => goTo('Dashboard')}
          isActive={current === 'Dashboard'}
        />
        <DrawerItem
          label="Menu"
          icon={<Feather name="shopping-bag" size={20} color={colors.textPrimary} />}
          onPress={() => goTo('Inventory', { screen: 'Menu' })}
          isActive={current === 'Inventory' && nestedRouteName === 'Menu'}
        />
        <DrawerItem
          label="Ongoing Orders"
          icon={<Feather name="list" size={20} color={colors.textPrimary} />}
          onPress={() => goTo('Orders', { screen: 'OngoingOrders' })}
          isActive={current === 'Orders'}
        />
        {auth?.role === 'Owner' && (
          <DrawerItem
            label="Receipts"
            icon={<Ionicons name="receipt-outline" size={20} color={colors.textPrimary} />}
            onPress={() => goTo('Receipts', { screen: 'DailySummary' })}
            isActive={current === 'Receipts'}
          />
        )}
        <DrawerItem
          label="Attendance"
          icon={<Feather name="check-square" size={20} color={colors.textPrimary} />}
          onPress={() => goTo('Staff', { screen: 'Attendance' })}
          isActive={current === 'Staff'}
        />
        
        <DrawerItem
          label="Customers"
          icon={<Ionicons name="people-outline" size={20} color={colors.textPrimary} />}
          onPress={() => goTo('Customers')}
          isActive={current === 'Customers'}
        />
        
        <DrawerItem
          label="Printer Setup"
          icon={<Feather name="printer" size={20} color={colors.textPrimary} />}
          onPress={() => goTo('Printer')}
          isActive={current === 'Printer'}
        />
        {auth?.role === 'Owner' && (
          <DrawerItem
            label="Settings"
            icon={<Ionicons name="settings-outline" size={20} color={colors.textPrimary} />}
            onPress={() => goTo('Settings')}
            isActive={current === 'Settings'}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        {auth?.restaurantName && (
          <View style={styles.restaurantRow}>
            <Text style={styles.restaurantName}>{auth.restaurantName}</Text>
          </View>
        )}
        <View style={styles.userRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(auth?.userName || 'U').slice(0,1).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{auth?.userName || 'Username'}</Text>
            {auth?.designation && (
              <Text style={styles.userDesignation}>{auth.designation}</Text>
            )}
            <Text style={styles.userRole}>{auth?.role || 'Staff'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Feather name="log-out" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.powered}>Powered by Arbi POS</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: topInset + spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  logoText: { color: 'white', fontWeight: 'bold', fontSize: 20 },
  brand: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  tagline: { color: colors.textSecondary, fontSize: 12 },
  menu: { flex: 1, paddingHorizontal: spacing.sm, paddingTop: spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  itemActive: { backgroundColor: colors.surface },
  iconWrap: { width: 28, alignItems: 'center', marginRight: spacing.sm },
  itemLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
  itemLabelActive: { color: colors.primary },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    padding: spacing.md,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  avatarText: { color: 'white', fontWeight: 'bold' },
  userName: { color: 'white', fontWeight: '600' },
  userDesignation: { color: colors.primary, fontSize: 11, marginTop: 1, fontStyle: 'italic' },
  userRole: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  restaurantRow: { marginBottom: spacing.sm, paddingHorizontal: spacing.sm },
  restaurantName: { color: colors.primary, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  powered: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});

export default CustomDrawerContent;



