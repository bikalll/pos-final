import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/storeFirebase';
import { logout } from '../redux/slices/authSlice';
import { getFirebaseAuthEnhanced, createFirebaseAuthEnhanced } from '../services/firebaseAuthEnhanced';

interface SidebarProps {
  activeTab: string;
  onTabPress: (tabName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabPress }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  // Debug: Log auth state
  console.log('Sidebar - Auth state:', auth);

  const menuItems = [
    { name: 'Tables', icon: '⊞', route: 'TablesDashboard', roles: ['Owner', 'Staff'] },
    { name: 'Menu', icon: '🛒', route: 'Menu', roles: ['Owner', 'Staff'] },
    { name: 'Ongoing Orders', icon: '☰', route: 'OngoingOrders', roles: ['Owner', 'Staff'] },
    { name: 'Receipts', icon: '💵', route: 'DailySummary', roles: ['Owner'] },
    { name: 'Attendance', icon: '📋', route: 'Attendance', roles: ['Owner', 'Staff'] },
    { name: 'Customers', icon: '👥', route: 'Customers', roles: ['Owner', 'Staff'] },
    { name: 'Printer Setup', icon: '🖨️', route: 'PrinterSetup', roles: ['Owner', 'Staff'] },
    { name: 'Settings', icon: '⚙️', route: 'Settings', roles: ['Owner'] },
  ];

  // Filter menu items based on user role
  // Treat Manager designation as Owner-equivalent for access (except attendance screen logic itself handles owners)
  const effectiveRole = (auth?.role === 'Owner' || auth?.designation === 'Manager') ? 'Owner' : (auth?.role || 'Staff');
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(effectiveRole));

  const handleTabPress = (tabName: string) => {
    onTabPress(tabName);
    // Navigate to the appropriate screen
    try {
      navigation.navigate(tabName as any);
    } catch (error) {
      console.log('Navigation error:', error);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {auth?.logoUrl ? (
            <Image 
              source={{ uri: auth.logoUrl }} 
              style={styles.logoImage}
              onLoad={() => console.log('📷 Sidebar logo loaded successfully:', auth.logoUrl)}
              onError={(error) => console.error('📷 Sidebar logo load error:', error.nativeEvent.error)}
            />
          ) : (
            <Text style={styles.logo}>{(auth?.restaurantName || 'R').slice(0,1).toUpperCase()}</Text>
          )}
        </View>
        <Text style={styles.title}>{auth?.userName || 'Employee'}</Text>
        <Text style={styles.restaurantName}>{(auth?.restaurantName && auth.restaurantName !== 'Restaurant') ? auth.restaurantName : 'Restaurant Name'}</Text>
      </View>

      <ScrollView style={styles.menuContainer}>
        {filteredMenuItems.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.menuItem,
              activeTab === item.name && styles.activeMenuItem
            ]}
            onPress={() => handleTabPress(item.route)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={[
              styles.menuText,
              activeTab === item.name && styles.activeMenuText
            ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.userProfile}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>{(auth?.userName || 'U').slice(0,1).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{auth?.userName || 'Username'}</Text>
            {auth?.designation && (
              <Text style={styles.userDesignation}>{auth.designation}</Text>
            )}
            <Text style={styles.userRole}>{auth?.role || 'Staff'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>⊟</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.poweredBy}>Powered by House of Job Pvt Ltd</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    width: 280,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  logoContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#ff6b35',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  logoImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  restaurantName: {
    fontSize: 14,
    color: '#cccccc',
    marginTop: 4,
    textAlign: 'center',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    marginBottom: 4,
    borderRadius: 8,
  },
  activeMenuItem: {
    backgroundColor: '#333333',
  },
  menuIcon: {
    fontSize: 20,
    color: 'white',
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  activeMenuText: {
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#444444',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  userDesignation: {
    fontSize: 11,
    color: '#ff6b35',
    marginTop: 1,
    fontStyle: 'italic',
  },
  userRole: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  logoutButton: {
    width: 32,
    height: 32,
    backgroundColor: '#444444',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    fontSize: 16,
    color: 'white',
  },
  poweredBy: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 12,
  },
});

export default Sidebar;



