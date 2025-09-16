import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../theme';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const role = useSelector((s: RootState) => s.auth.role);

  const settingsOptions = [
    {
      title: 'Office Management',
      subtitle: 'Business profile, logo, owner and PAN/VAT',
      iconEl: <Ionicons name="business-outline" size={20} color={colors.textPrimary} />,
      onPress: () => navigation.navigate('OfficeManagement' as any),
    },
    {
      title: 'Table Management',
      subtitle: 'Add, edit, and manage restaurant tables',
      iconEl: <MaterialCommunityIcons name="table-furniture" size={20} color={colors.textPrimary} />,
      onPress: () => navigation.navigate('TableManagement' as any),
    },
    {
      title: 'Menu Management',
      subtitle: 'Add, edit, or remove menu items',
      iconEl: <Ionicons name="fast-food-outline" size={20} color={colors.textPrimary} />,
      onPress: () => navigation.navigate('Inventory' as any, { screen: 'MenuManagement' } as any),
    },
    {
      title: 'Inventory Management',
      subtitle: 'Manage stock levels and inventory items',
      iconEl: <Feather name="box" size={20} color={colors.textPrimary} />,
      onPress: () => navigation.navigate('Inventory' as any, { screen: 'InventoryManagement' } as any),
    },
    {
      title: 'Printer Setup',
      subtitle: 'Configure Bluetooth and USB printers',
      iconEl: <Feather name="printer" size={20} color={colors.textPrimary} />,
      onPress: () => navigation.navigate('PrinterSetup' as any),
    },
    {
      title: 'Printing Demo',
      subtitle: 'Test printing functionality',
      iconEl: <Ionicons name="print-outline" size={20} color={colors.textPrimary} />,
      onPress: () => navigation.navigate('PrintDemo' as any),
    },
    
    
    
    {
      title: 'Employee Management',
      subtitle: 'Manage staff accounts and permissions',
      iconEl: <Ionicons name="people-outline" size={20} color={colors.textPrimary} />,
      onPress: () => navigation.navigate('EmployeeManagement' as any),
    },
    
    {
      title: 'About',
      subtitle: 'App version and information',
      iconEl: <Ionicons name="information-circle-outline" size={20} color={colors.textPrimary} />,
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>General</Text></View>
        {settingsOptions
          .filter(opt => (opt.title === 'Office Management' ? role === 'Owner' : true))
          .map((option, index) => (
          <TouchableOpacity
            key={`${option.title}-${index}`}
            style={styles.cardItem}
            onPress={option.onPress}
            activeOpacity={0.9}
          >
            <View style={styles.cardIcon}>{option.iconEl}</View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
            </View>
            <View style={styles.chevron}><Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /></View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: spacing.md,
  },
  headerBrandRow: { flexDirection: 'row', alignItems: 'center' },
  brandCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  brandInitial: { color: 'white', fontSize: 18 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: { 
    flex: 1, 
    paddingHorizontal: spacing.md, 
  },
  sectionHeader: { marginTop: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
  sectionHeaderText: { color: colors.textSecondary, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase' },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  cardIconText: { fontSize: 20 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: colors.textSecondary },
  chevron: { width: 20, alignItems: 'flex-end' },
  chevronText: { fontSize: 20, color: colors.textSecondary },
});

export default SettingsScreen;
