/**
 * Real-time Testing Monitor Component
 * Provides live monitoring and testing capabilities within the app
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/storeFirebase';
import { testRunner } from './TestRunner';
import { testFramework } from './TestFramework';
import { ListenerManager } from '../services/ListenerManager';

interface TestMonitorProps {
  visible: boolean;
  onClose: () => void;
}

interface TestStatus {
  isRunning: boolean;
  currentTest?: string;
  progress: number;
  results: any[];
}

const TestMonitor: React.FC<TestMonitorProps> = ({ visible, onClose }) => {
  const [testStatus, setTestStatus] = useState<TestStatus>({
    isRunning: false,
    progress: 0,
    results: []
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [listenerCount, setListenerCount] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const listenerManager = useRef(new ListenerManager());
  
  const authState = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (visible && autoRefresh) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => stopAutoRefresh();
  }, [visible, autoRefresh, refreshInterval]);

  const startAutoRefresh = () => {
    stopAutoRefresh();
    intervalRef.current = setInterval(() => {
      updateMetrics();
    }, refreshInterval);
  };

  const stopAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const updateMetrics = () => {
    const metrics = testFramework.getPerformanceMetrics();
    setPerformanceMetrics(metrics);
    setListenerCount(metrics.listenerCount);
    setMemoryUsage(metrics.memoryUsage);
  };

  const runSmokeTest = async () => {
    try {
      setTestStatus(prev => ({ ...prev, isRunning: true, currentTest: 'Smoke Test' }));
      await testRunner.runSmokeTest();
      setTestStatus(prev => ({ ...prev, isRunning: false, progress: 100 }));
      Alert.alert('Success', 'Smoke test completed successfully!');
    } catch (error) {
      setTestStatus(prev => ({ ...prev, isRunning: false }));
      Alert.alert('Error', `Smoke test failed: ${error}`);
    }
  };

  const runFunctionalityTests = async () => {
    try {
      setTestStatus(prev => ({ ...prev, isRunning: true, currentTest: 'Functionality Tests' }));
      await testRunner.runTestSuite('functionality');
      setTestStatus(prev => ({ ...prev, isRunning: false, progress: 100 }));
      Alert.alert('Success', 'Functionality tests completed!');
    } catch (error) {
      setTestStatus(prev => ({ ...prev, isRunning: false }));
      Alert.alert('Error', `Functionality tests failed: ${error}`);
    }
  };

  const runPerformanceTests = async () => {
    try {
      setTestStatus(prev => ({ ...prev, isRunning: true, currentTest: 'Performance Tests' }));
      await testRunner.runTestSuite('performance');
      setTestStatus(prev => ({ ...prev, isRunning: false, progress: 100 }));
      Alert.alert('Success', 'Performance tests completed!');
    } catch (error) {
      setTestStatus(prev => ({ ...prev, isRunning: false }));
      Alert.alert('Error', `Performance tests failed: ${error}`);
    }
  };

  const runEdgeCaseTests = async () => {
    try {
      setTestStatus(prev => ({ ...prev, isRunning: true, currentTest: 'Edge Case Tests' }));
      await testRunner.runTestSuite('edgecase');
      setTestStatus(prev => ({ ...prev, isRunning: false, progress: 100 }));
      Alert.alert('Success', 'Edge case tests completed!');
    } catch (error) {
      setTestStatus(prev => ({ ...prev, isRunning: false }));
      Alert.alert('Error', `Edge case tests failed: ${error}`);
    }
  };

  const runAllTests = async () => {
    try {
      setTestStatus(prev => ({ ...prev, isRunning: true, currentTest: 'All Tests' }));
      const session = await testRunner.runAllTests();
      setTestStatus(prev => ({ 
        ...prev, 
        isRunning: false, 
        progress: 100,
        results: [session]
      }));
      Alert.alert('Success', `All tests completed! Success rate: ${session.summary.successRate.toFixed(2)}%`);
    } catch (error) {
      setTestStatus(prev => ({ ...prev, isRunning: false }));
      Alert.alert('Error', `Test suite failed: ${error}`);
    }
  };

  const clearListeners = () => {
    listenerManager.current.cleanupAllListeners();
    updateMetrics();
    Alert.alert('Success', 'All listeners cleared');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return '#4CAF50';
      case 'FAIL': return '#F44336';
      case 'SKIP': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return 'checkmark-circle';
      case 'FAIL': return 'close-circle';
      case 'SKIP': return 'pause-circle';
      default: return 'help-circle';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🧪 Test Monitor</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* System Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 System Status</Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Memory Usage</Text>
                <Text style={styles.statusValue}>{memoryUsage.toFixed(2)} MB</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Active Listeners</Text>
                <Text style={styles.statusValue}>{listenerCount}</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>User Role</Text>
                <Text style={styles.statusValue}>{authState.role || 'Unknown'}</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Restaurant ID</Text>
                <Text style={styles.statusValue}>{authState.restaurantId ? 'Set' : 'Not Set'}</Text>
              </View>
            </View>
          </View>

          {/* Auto Refresh Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Auto Refresh</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Enable Auto Refresh</Text>
              <Switch
                value={autoRefresh}
                onValueChange={setAutoRefresh}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={autoRefresh ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Refresh Interval (ms)</Text>
              <TextInput
                style={styles.input}
                value={refreshInterval.toString()}
                onChangeText={(text) => setRefreshInterval(parseInt(text) || 5000)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Test Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧪 Test Controls</Text>
            
            <TouchableOpacity 
              style={[styles.testButton, styles.smokeTestButton]} 
              onPress={runSmokeTest}
              disabled={testStatus.isRunning}
            >
              <Ionicons name="flash" size={20} color="white" />
              <Text style={styles.testButtonText}>Run Smoke Test</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.testButton, styles.functionalityTestButton]} 
              onPress={runFunctionalityTests}
              disabled={testStatus.isRunning}
            >
              <Ionicons name="checkmark-done" size={20} color="white" />
              <Text style={styles.testButtonText}>Functionality Tests</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.testButton, styles.performanceTestButton]} 
              onPress={runPerformanceTests}
              disabled={testStatus.isRunning}
            >
              <Ionicons name="speedometer" size={20} color="white" />
              <Text style={styles.testButtonText}>Performance Tests</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.testButton, styles.edgeCaseTestButton]} 
              onPress={runEdgeCaseTests}
              disabled={testStatus.isRunning}
            >
              <Ionicons name="warning" size={20} color="white" />
              <Text style={styles.testButtonText}>Edge Case Tests</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.testButton, styles.allTestsButton]} 
              onPress={runAllTests}
              disabled={testStatus.isRunning}
            >
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.testButtonText}>Run All Tests</Text>
            </TouchableOpacity>
          </View>

          {/* Test Status */}
          {testStatus.isRunning && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏳ Test Status</Text>
              <Text style={styles.currentTest}>{testStatus.currentTest}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${testStatus.progress}%` }]} />
              </View>
            </View>
          )}

          {/* Test Results */}
          {testStatus.results.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Test Results</Text>
              {testStatus.results.map((result, index) => (
                <View key={index} style={styles.resultItem}>
                  <Text style={styles.resultTitle}>{result.name || `Test ${index + 1}`}</Text>
                  <Text style={styles.resultDuration}>Duration: {result.totalDuration}ms</Text>
                  {result.tests && result.tests.map((test: any, testIndex: number) => (
                    <View key={testIndex} style={styles.testResult}>
                      <Ionicons 
                        name={getStatusIcon(test.status)} 
                        size={16} 
                        color={getStatusColor(test.status)} 
                      />
                      <Text style={styles.testName}>{test.testName}</Text>
                      <Text style={styles.testDuration}>{test.duration}ms</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Utility Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔧 Utilities</Text>
            <TouchableOpacity 
              style={[styles.utilityButton, styles.clearButton]} 
              onPress={clearListeners}
            >
              <Ionicons name="trash" size={20} color="white" />
              <Text style={styles.utilityButtonText}>Clear All Listeners</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    width: 100,
    textAlign: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  smokeTestButton: {
    backgroundColor: '#FF9800',
  },
  functionalityTestButton: {
    backgroundColor: '#4CAF50',
  },
  performanceTestButton: {
    backgroundColor: '#2196F3',
  },
  edgeCaseTestButton: {
    backgroundColor: '#FF5722',
  },
  allTestsButton: {
    backgroundColor: '#9C27B0',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  currentTest: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  resultItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  resultDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  testResult: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  testName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  testDuration: {
    fontSize: 12,
    color: '#666',
  },
  utilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  clearButton: {
    backgroundColor: '#F44336',
  },
  utilityButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TestMonitor;
