import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { blePrinter } from '../services/blePrinter';
import { colors, spacing, radius, shadow } from '../theme';
import { printReceipt, printKitchenTicket, printReport } from '../services/printing';
import { PrintService } from '../services/printing';

const PrintDemo: React.FC = () => {
  const [moduleStatus, setModuleStatus] = useState<{ supported: boolean; error?: string } | null>(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<{ paired: Array<any>; found: Array<any> } | null>(null);
  const [checkingConnection, setCheckingConnection] = useState<boolean>(false);
  const [connection, setConnection] = useState<{ connected: boolean; message: string } | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  useEffect(() => {
    checkModuleStatus();
  }, []);

  const checkModuleStatus = () => {
    const status = blePrinter.getModuleStatus();
    setModuleStatus(status);
    console.log('Bluetooth module status:', status);
  };

  const checkBluetoothStatus = async () => {
    try {
      const enabled = await blePrinter.isEnabled();
      setBluetoothEnabled(enabled);
      if (!enabled) {
        Alert.alert('Bluetooth Status', 'Bluetooth is disabled. Please enable Bluetooth in your device settings.');
      }
    } catch (error) {
      console.error('Error checking Bluetooth status:', error);
      Alert.alert('Error', 'Failed to check Bluetooth status');
    }
  };

  const scanDevices = async () => {
    try {
      const deviceList = await blePrinter.scanDevices();
      setDevices(deviceList);
      console.log('Scanned devices:', deviceList);
    } catch (error) {
      console.error('Error scanning devices:', error);
      Alert.alert('Error', 'Failed to scan for devices');
    }
  };

  const checkConnection = async () => {
    try {
      setCheckingConnection(true);
      const res = await PrintService.checkPrinterConnection();
      setConnection({ connected: res.connected, message: res.message });
    } catch (e) {
      setConnection({ connected: false, message: 'Unable to check connection' });
    } finally {
      setCheckingConnection(false);
    }
  };

  const testPrint = async () => {
    try {
      setIsPrinting(true);
      await blePrinter.printText('Test Print - Bluetooth Module Working!\n');
      Alert.alert('Success', 'Test print completed!');
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', `Print failed: ${error}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const sampleReceipt = async () => {
    try {
      setIsPrinting(true);
      const now = new Date();
      await printReceipt({
        receiptId: `RCPT-${now.getTime()}`,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        tableNumber: '5',
        customerName: 'Walk-in Guest',
        items: [
          { name: 'Veg Momo', quantity: 2, price: 160, total: 320 },
          { name: 'Chicken Chowmein', quantity: 1, price: 220, total: 220 },
          { name: 'Mineral Water', quantity: 2, price: 40, total: 80 },
        ],
        subtotal: 620,
        tax: 0,
        serviceCharge: 0,
        discount: 20,
        total: 600,
        paymentMethod: 'Cash',
        cashier: 'POS',
      });
      Alert.alert('Generated', 'Sample receipt PDF generated. Share dialog opened if available.');
    } catch (e) {
      Alert.alert('Error', 'Failed to generate sample receipt');
    } finally {
      setIsPrinting(false);
    }
  };

  const sampleKOT = async () => {
    try {
      setIsPrinting(true);
      const now = new Date();
      await printKitchenTicket({
        ticketId: `KOT-${now.getTime()}`,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        table: '5',
        items: [
          { name: 'Veg Momo', quantity: 2, price: 160, orderType: 'KOT' },
          { name: 'Chicken Chowmein', quantity: 1, price: 220, orderType: 'KOT' },
        ],
        estimatedTime: '15-20 minutes',
      });
      Alert.alert('Generated', 'Sample KOT PDF generated. Share dialog opened if available.');
    } catch (e) {
      Alert.alert('Error', 'Failed to generate sample KOT');
    } finally {
      setIsPrinting(false);
    }
  };

  const sampleReport = async () => {
    try {
      setIsPrinting(true);
      const now = new Date();
      await printReport({
        title: 'Daily Sales Report',
        date: now.toLocaleDateString(),
        data: {
          'Veg Momo': { quantity: 42, revenue: 6720 },
          'Chicken Chowmein': { quantity: 25, revenue: 5500 },
          'Mineral Water': { quantity: 60, revenue: 2400 },
        },
        summary: { totalOrders: 86, totalRevenue: 14620, totalItems: 127 },
      });
      Alert.alert('Generated', 'Sample report PDF generated. Share dialog opened if available.');
    } catch (e) {
      Alert.alert('Error', 'Failed to generate sample report');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Printing Demo</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connectivity</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Module</Text>
          <Text style={[styles.badge, moduleStatus?.supported ? styles.badgeSuccess : styles.badgeDanger]}>
            {moduleStatus?.supported ? 'Available' : 'Unavailable'}
          </Text>
        </View>
        {moduleStatus?.error ? <Text style={styles.errorInline}>{moduleStatus.error}</Text> : null}
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Bluetooth</Text>
          <Text style={[styles.badge, bluetoothEnabled ? styles.badgeSuccess : styles.badgeWarning]}>
            {bluetoothEnabled === null ? 'Unknown' : bluetoothEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Printer Connection</Text>
          <Text style={[styles.badge, connection?.connected ? styles.badgeSuccess : styles.badgeMuted]}>
            {checkingConnection ? 'Checking...' : connection ? (connection.connected ? 'Ready' : 'Not Ready') : 'Unknown'}
          </Text>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={checkModuleStatus}>
            <Text style={styles.buttonText}>Refresh Module</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={checkBluetoothStatus}>
            <Text style={styles.buttonText}>Check Bluetooth</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={checkConnection}>
            {checkingConnection ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Check Connection</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device Scanning</Text>
        <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={scanDevices}>
          <Text style={styles.buttonText}>Scan for Devices</Text>
        </TouchableOpacity>
        {devices && (
          <View style={styles.deviceList}>
            <Text style={styles.deviceTitle}>Paired Devices</Text>
            {devices.paired.map((device: any, index: number) => (
              <Text key={`paired-${device.address}-${index}`} style={styles.deviceItem}>
                {device.name || 'Unknown'} ({device.address})
              </Text>
            ))}
            <Text style={[styles.deviceTitle, { marginTop: spacing.md }]}>Found Devices</Text>
            {devices.found.map((device: any, index: number) => (
              <Text key={`found-${device.address}-${index}`} style={styles.deviceItem}>
                {device.name || 'Unknown'} ({device.address})
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionTile, styles.tilePrimary]} onPress={testPrint} disabled={isPrinting}>
            {isPrinting ? <ActivityIndicator color="#fff" /> : <Text style={styles.tileText}>Test Print</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionTile, styles.tileSuccess]} onPress={sampleReceipt} disabled={isPrinting}>
            <Text style={styles.tileText}>Sample Receipt (PDF)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionTile, styles.tileInfo]} onPress={sampleKOT} disabled={isPrinting}>
            <Text style={styles.tileText}>Sample KOT (PDF)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionTile, styles.tileWarning]} onPress={sampleReport} disabled={isPrinting}>
            <Text style={styles.tileText}>Sample Report (PDF)</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.helperText}>PDFs will open share dialog if available on device.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  label: { fontSize: 14, color: colors.textSecondary },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20, color: '#fff', overflow: 'hidden' },
  badgeSuccess: { backgroundColor: colors.success },
  badgeDanger: { backgroundColor: colors.danger },
  badgeWarning: { backgroundColor: colors.warning },
  badgeMuted: { backgroundColor: colors.outline },
  errorInline: { color: colors.danger, fontSize: 12, marginBottom: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  button: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.surface2 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  deviceList: {
    marginTop: spacing.md,
  },
  deviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  deviceItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingLeft: spacing.md,
  },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  actionTile: { flexBasis: '48%', paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tilePrimary: { backgroundColor: colors.primary },
  tileSuccess: { backgroundColor: colors.success },
  tileInfo: { backgroundColor: colors.info },
  tileWarning: { backgroundColor: colors.warning },
  tileText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  helperText: { marginTop: spacing.sm, fontSize: 12, color: colors.textSecondary },
});

export default PrintDemo;



