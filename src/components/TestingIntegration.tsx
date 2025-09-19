/**
 * Example Integration of Testing Framework
 * Shows how to integrate testing capabilities into the POS app
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestMonitor from '../components/TestMonitor';
import { testRunner } from '../testing/TestRunner';

interface TestingIntegrationProps {
  // Props for the testing integration component
}

const TestingIntegration: React.FC<TestingIntegrationProps> = () => {
  const [showTestMonitor, setShowTestMonitor] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<any>(null);

  /**
   * Run quick smoke test
   */
  const runQuickTest = async () => {
    try {
      setIsRunningTests(true);
      await testRunner.runSmokeTest();
      setLastTestResult({ type: 'smoke', success: true });
      Alert.alert('Success', 'Smoke test completed successfully!');
    } catch (error) {
      setLastTestResult({ type: 'smoke', success: false, error });
      Alert.alert('Error', `Smoke test failed: ${error}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  /**
   * Run functionality tests
   */
  const runFunctionalityTests = async () => {
    try {
      setIsRunningTests(true);
      await testRunner.runTestSuite('functionality');
      setLastTestResult({ type: 'functionality', success: true });
      Alert.alert('Success', 'Functionality tests completed!');
    } catch (error) {
      setLastTestResult({ type: 'functionality', success: false, error });
      Alert.alert('Error', `Functionality tests failed: ${error}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  /**
   * Run performance tests
   */
  const runPerformanceTests = async () => {
    try {
      setIsRunningTests(true);
      await testRunner.runTestSuite('performance');
      setLastTestResult({ type: 'performance', success: true });
      Alert.alert('Success', 'Performance tests completed!');
    } catch (error) {
      setLastTestResult({ type: 'performance', success: false, error });
      Alert.alert('Error', `Performance tests failed: ${error}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  /**
   * Run edge case tests
   */
  const runEdgeCaseTests = async () => {
    try {
      setIsRunningTests(true);
      await testRunner.runTestSuite('edgecase');
      setLastTestResult({ type: 'edgecase', success: true });
      Alert.alert('Success', 'Edge case tests completed!');
    } catch (error) {
      setLastTestResult({ type: 'edgecase', success: false, error });
      Alert.alert('Error', `Edge case tests failed: ${error}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  /**
   * Run comprehensive test suite
   */
  const runAllTests = async () => {
    try {
      setIsRunningTests(true);
      const session = await testRunner.runAllTests();
      setLastTestResult({ 
        type: 'all', 
        success: true, 
        session,
        successRate: session.summary.successRate 
      });
      Alert.alert(
        'Success', 
        `All tests completed! Success rate: ${session.summary.successRate.toFixed(2)}%`
      );
    } catch (error) {
      setLastTestResult({ type: 'all', success: false, error });
      Alert.alert('Error', `Test suite failed: ${error}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Testing Integration</Text>
      
      {/* Quick Test Button */}
      <TouchableOpacity 
        style={[styles.button, styles.smokeButton]} 
        onPress={runQuickTest}
        disabled={isRunningTests}
      >
        <Ionicons name="flash" size={20} color="white" />
        <Text style={styles.buttonText}>Quick Smoke Test</Text>
      </TouchableOpacity>

      {/* Test Suite Buttons */}
      <TouchableOpacity 
        style={[styles.button, styles.functionalityButton]} 
        onPress={runFunctionalityTests}
        disabled={isRunningTests}
      >
        <Ionicons name="checkmark-done" size={20} color="white" />
        <Text style={styles.buttonText}>Functionality Tests</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.performanceButton]} 
        onPress={runPerformanceTests}
        disabled={isRunningTests}
      >
        <Ionicons name="speedometer" size={20} color="white" />
        <Text style={styles.buttonText}>Performance Tests</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.edgeCaseButton]} 
        onPress={runEdgeCaseTests}
        disabled={isRunningTests}
      >
        <Ionicons name="warning" size={20} color="white" />
        <Text style={styles.buttonText}>Edge Case Tests</Text>
      </TouchableOpacity>

      {/* Comprehensive Test Button */}
      <TouchableOpacity 
        style={[styles.button, styles.allTestsButton]} 
        onPress={runAllTests}
        disabled={isRunningTests}
      >
        <Ionicons name="play" size={20} color="white" />
        <Text style={styles.buttonText}>Run All Tests</Text>
      </TouchableOpacity>

      {/* Test Monitor Button */}
      <TouchableOpacity 
        style={[styles.button, styles.monitorButton]} 
        onPress={() => setShowTestMonitor(true)}
      >
        <Ionicons name="analytics" size={20} color="white" />
        <Text style={styles.buttonText}>Open Test Monitor</Text>
      </TouchableOpacity>

      {/* Test Status */}
      {isRunningTests && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Running tests...</Text>
        </View>
      )}

      {/* Last Test Result */}
      {lastTestResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Last Test Result:</Text>
          <Text style={[
            styles.resultText, 
            { color: lastTestResult.success ? '#4CAF50' : '#F44336' }
          ]}>
            {lastTestResult.type} - {lastTestResult.success ? 'PASS' : 'FAIL'}
          </Text>
          {lastTestResult.successRate && (
            <Text style={styles.resultText}>
              Success Rate: {lastTestResult.successRate.toFixed(2)}%
            </Text>
          )}
        </View>
      )}

      {/* Test Monitor Modal */}
      <TestMonitor 
        visible={showTestMonitor} 
        onClose={() => setShowTestMonitor(false)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  smokeButton: {
    backgroundColor: '#FF9800',
  },
  functionalityButton: {
    backgroundColor: '#4CAF50',
  },
  performanceButton: {
    backgroundColor: '#2196F3',
  },
  edgeCaseButton: {
    backgroundColor: '#FF5722',
  },
  allTestsButton: {
    backgroundColor: '#9C27B0',
  },
  monitorButton: {
    backgroundColor: '#607D8B',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  statusText: {
    color: '#1976D2',
    fontSize: 16,
    textAlign: 'center',
  },
  resultContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

export default TestingIntegration;
