import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../../theme';

const AboutScreen: React.FC = () => {
  const handleEmailPress = () => {
    Linking.openURL('mailto:houseofjobnp@gmail.com').catch(() => {
      Alert.alert('Error', 'Could not open email client');
    });
  };

  const handlePhonePress = () => {
    Linking.openURL('tel:+9779841610920').catch(() => {
      Alert.alert('Error', 'Could not open phone dialer');
    });
  };

  const appInfo = [
    {
      title: 'App Name',
      value: 'ARBI POS',
      icon: <Ionicons name="restaurant-outline" size={20} color={colors.primary} />,
    },
    {
      title: 'Version',
      value: '1.0.0',
      icon: <Ionicons name="code-outline" size={20} color={colors.primary} />,
    },
  ];

  const contactInfo = [
    {
      title: 'Email Support',
      value: 'houseofjobnp@gmail.com',
      icon: <Ionicons name="mail-outline" size={20} color={colors.primary} />,
      onPress: handleEmailPress,
    },
    {
      title: 'Phone Support',
      value: '+977 9841610920',
      icon: <Ionicons name="call-outline" size={20} color={colors.primary} />,
      onPress: handlePhonePress,
    },
  ];


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="restaurant" size={48} color={colors.primary} />
          </View>
          <Text style={styles.appTitle}>ARBI POS</Text>
          <Text style={styles.appSubtitle}>Point of Sale Management System</Text>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          {appInfo.map((item, index) => (
            <View key={index} style={styles.infoItem}>
              <View style={styles.infoIcon}>{item.icon}</View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{item.title}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Contact</Text>
          {contactInfo.map((item, index) => (
            <TouchableOpacity key={index} style={styles.contactItem} onPress={item.onPress}>
              <View style={styles.contactIcon}>{item.icon}</View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>{item.title}</Text>
                <Text style={styles.contactValue}>{item.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 House of Job Pvt Ltd. All rights reserved.
          </Text>
          <Text style={styles.footerSubtext}>
            Author: Bikal Niraula
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  appSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  infoIcon: {
    marginRight: spacing.lg,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  contactIcon: {
    marginRight: spacing.lg,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  contactValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default AboutScreen;
