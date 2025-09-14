import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, shadow } from '../theme';
import { blePrinter } from '../services/blePrinter';
import { PrintService } from '../services/printing';
import { bluetoothManager } from '../services/bluetoothManager';
import { Toast } from '../services/toastService';

interface TroubleshootingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'checking' | 'passed' | 'failed';
  error?: string;
  solution?: string;
}

const PrinterTroubleshooter: React.FC = () => {
  const [steps, setSteps] = useState<TroubleshootingStep[]>([
    {
      id: 'env',
      title: 'Environment Configuration',
      description: 'Check if Bluetooth is enabled in environment',
      status: 'pending'
    },
    {
      id: 'module',
      title: 'Bluetooth Module',
      description: 'Check if Bluetooth printing module is loaded',
      status: 'pending'
    },
    {
      id: 'permissions',
      title: 'Bluetooth Permissions',
      description: 'Check if all required permissions are granted',
      status: 'pending'
    },
    {
      id: 'bluetooth',
      title: 'Bluetooth Status',
      description: 'Check if Bluetooth is enabled on device',
      status: 'pending'
    },
    {
      id: 'devices',
      title: 'Printer Devices',
      description: 'Scan for available printer devices',
      status: 'pending'
    },
    {
      id: 'connection',
      title: 'Printer Connection',
      description: 'Test connection to printer',
      status: 'pending'
    },
    {
      id: 'print',
      title: 'Test Print',
      description: 'Send a test print to verify functionality',
      status: 'pending'
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const updateStep = (id: string, status: TroubleshootingStep['status'], error?: string, solution?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === id 
        ? { ...step, status, error, solution }
        : step
    ));
  };

  const runTroubleshooter = async () => {
    setIsRunning(true);
    setCurrentStep(0);

    try {
      // Step 1: Environment Configuration
      setCurrentStep(1);
      updateStep('env', 'checking');
      
      const envEnabled = process.env.EXPO_PUBLIC_ENABLE_BLUETOOTH === 'true';
      if (envEnabled) {
        updateStep('env', 'passed');
      } else {
        updateStep('env', 'failed', 'Bluetooth not enabled in environment', 
          'Create .env file with EXPO_PUBLIC_ENABLE_BLUETOOTH=true');
      }

      // Step 2: Bluetooth Module
      setCurrentStep(2);
      updateStep('module', 'checking');
      
      const moduleStatus = blePrinter.getModuleStatus();
      if (moduleStatus.supported) {
        updateStep('module', 'passed');
      } else {
        updateStep('module', 'failed', moduleStatus.error || 'Module not loaded',
          'Run: npm install tp-react-native-bluetooth-printer && expo prebuild --clean');
      }

      // Step 3: Permissions
      setCurrentStep(3);
      updateStep('permissions', 'checking');
      
      const permissionsGranted = await bluetoothManager.requestPermissions();
      if (permissionsGranted) {
        updateStep('permissions', 'passed');
      } else {
        updateStep('permissions', 'failed', 'Permissions not granted',
          'Go to Settings > Apps > Your App > Permissions and enable Bluetooth & Location');
      }

      // Step 4: Bluetooth Status
      setCurrentStep(4);
      updateStep('bluetooth', 'checking');
      
      const bluetoothEnabled = await bluetoothManager.checkBluetoothStatus();
      if (bluetoothEnabled) {
        updateStep('bluetooth', 'passed');
      } else {
        updateStep('bluetooth', 'failed', 'Bluetooth is disabled',
          'Enable Bluetooth in device settings');
      }

      // Step 5: Device Scanning
      setCurrentStep(5);
      updateStep('devices', 'checking');
      
      try {
        const devices = await bluetoothManager.scanDevices();
        const printerDevices = devices.filter(device => 
          device.name.toLowerCase().includes('printer') ||
          device.name.toLowerCase().includes('thermal') ||
          device.name.toLowerCase().includes('pos') ||
          device.name.toLowerCase().includes('esc')
        );
        
        if (printerDevices.length > 0) {
          updateStep('devices', 'passed');
        } else {
          updateStep('devices', 'failed', 'No printer devices found',
            'Make sure printer is turned on and in pairing mode. Look for devices with "printer" in the name');
        }
      } catch (error: any) {
        updateStep('devices', 'failed', error.message,
          'Check Bluetooth permissions and try again');
      }

      // Step 6: Connection Test
      setCurrentStep(6);
      updateStep('connection', 'checking');
      
      const connectionStatus = await PrintService.checkPrinterConnection();
      if (connectionStatus.connected) {
        updateStep('connection', 'passed');
      } else {
        updateStep('connection', 'failed', connectionStatus.message,
          'Connect to a printer device from the device list');
      }

      // Step 7: Test Print
      setCurrentStep(7);
      updateStep('print', 'checking');
      
      try {
        const testData = {
          restaurantName: 'ARBI POS',
          receiptId: `TEST-${Date.now()}`,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          table: 'Test Table',
          items: [
            { name: 'Test Item', quantity: 1, price: 10.00 }
          ],
          taxLabel: 'Tax (5%)',
          serviceLabel: 'Service (10%)',
          subtotal: 10.00,
          tax: 0.50,
          service: 1.00,
          discount: 0,
          total: 11.50,
          payment: {
            method: 'Test',
            amountPaid: 12.00,
            change: 0.50
          }
        };

        await blePrinter.printReceipt(testData);
        updateStep('print', 'passed');
      } catch (error: any) {
        updateStep('print', 'failed', error.message,
          'Check printer connection and try again. Make sure you\'re connected to a thermal printer, not PC/Phone');
      }

    } catch (error: any) {
      console.error('Troubleshooter error:', error);
      Toast.show('Troubleshooter failed: ' + error.message, 'error');
    } finally {
      setIsRunning(false);
      setCurrentStep(0);
    }
  };

  const getStepIcon = (status: TroubleshootingStep['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'checking': return '🔄';
      case 'passed': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const getStepColor = (status: TroubleshootingStep['status']) => {
    switch (status) {
      case 'pending': return '#666';
      case 'checking': return '#007AFF';
      case 'passed': return '#34C759';
      case 'failed': return '#FF3B30';
      default: return '#666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🖨️ Printer Troubleshooter</Text>
        <Text style={styles.subtitle}>
          This tool will help identify and fix printing issues step by step
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.runButton, isRunning && styles.runButtonDisabled]}
        onPress={runTroubleshooter}
        disabled={isRunning}
      >
        {isRunning ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.runButtonText}>Run Troubleshooter</Text>
        )}
      </TouchableOpacity>

      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepIcon}>{getStepIcon(step.status)}</Text>
              <View style={styles.stepInfo}>
                <Text style={[styles.stepTitle, { color: getStepColor(step.status) }]}>
                  {step.title}
                </Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>

            {step.status === 'failed' && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Error:</Text>
                <Text style={styles.errorMessage}>{step.error}</Text>
                {step.solution && (
                  <>
                    <Text style={styles.solutionTitle}>Solution:</Text>
                    <Text style={styles.solutionMessage}>{step.solution}</Text>
                  </>
                )}
              </View>
            )}

            {step.status === 'checking' && (
              <View style={styles.checkingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.checkingText}>Checking...</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Summary:</Text>
        <Text style={styles.summaryText}>
          Passed: {steps.filter(s => s.status === 'passed').length} / {steps.length}
        </Text>
        <Text style={styles.summaryText}>
          Failed: {steps.filter(s => s.status === 'failed').length} / {steps.length}
        </Text>
      </View>

      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <Text style={styles.helpText}>
          • Check PRINTER_SETUP_INSTRUCTIONS.md for detailed setup guide
        </Text>
        <Text style={styles.helpText}>
          • Make sure you're using a Bluetooth thermal printer (not PC/Phone)
        </Text>
        <Text style={styles.helpText}>
          • Common printer names: "Thermal Printer", "ESC-POS Printer", "Receipt Printer"
        </Text>
        <Text style={styles.helpText}>
          • Run the fix-printer-issues.bat script for automatic setup
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  runButton: {
    backgroundColor: colors.info,
    padding: spacing.md,
    margin: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  runButtonDisabled: {
    backgroundColor: colors.outline,
  },
  runButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepsContainer: {
    padding: spacing.lg,
  },
  stepContainer: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.card,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.info,
    color: 'white',
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: 'bold',
    marginRight: spacing.sm,
  },
  stepIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.textPrimary,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  solutionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.info,
    marginBottom: 4,
  },
  solutionMessage: {
    fontSize: 14,
    color: colors.info,
  },
  checkingContainer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkingText: {
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.info,
  },
  summary: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    ...shadow.card,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    color: colors.textPrimary,
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 5,
    color: colors.textSecondary,
  },
  helpSection: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    ...shadow.card,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    color: colors.textPrimary,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
});

export default PrinterTroubleshooter;

