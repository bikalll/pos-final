// FirebaseDebugMonitor.tsx
// Debug component to monitor Firebase operations and errors

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { firebaseConnectionManager } from '../services/FirebaseConnectionManager';
import { firebaseErrorHandler } from '../services/FirebaseErrorHandler';

interface FirebaseDebugMonitorProps {
  visible: boolean;
  onClose: () => void;
}

const FirebaseDebugMonitor: React.FC<FirebaseDebugMonitorProps> = ({ visible, onClose }) => {
  const [connectionStats, setConnectionStats] = useState({ activeServices: 0, restaurantIds: [] });
  const [errorStats, setErrorStats] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;

    const updateStats = () => {
      setConnectionStats(firebaseConnectionManager.getStats());
      setErrorStats(firebaseErrorHandler.getErrorStats());
    };

    // Update stats immediately
    updateStats();

    // Update stats every 2 seconds
    const interval = setInterval(updateStats, 2000);

    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      if (args[0]?.includes?.('Firebase') || args[0]?.includes?.('Firestore')) {
        setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${args.join(' ')}`]);
      }
    };

    console.error = (...args) => {
      originalError(...args);
      if (args[0]?.includes?.('Firebase') || args[0]?.includes?.('Firestore')) {
        setLogs(prev => [...prev.slice(-9), `❌ ${new Date().toLocaleTimeString()}: ${args.join(' ')}`]);
      }
    };

    console.warn = (...args) => {
      originalWarn(...args);
      if (args[0]?.includes?.('Firebase') || args[0]?.includes?.('Firestore')) {
        setLogs(prev => [...prev.slice(-9), `⚠️ ${new Date().toLocaleTimeString()}: ${args.join(' ')}`]);
      }
    };

    return () => {
      clearInterval(interval);
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [visible]);

  const clearErrors = () => {
    firebaseErrorHandler.resetErrorCount();
    setErrorStats({});
  };

  const forceCleanup = () => {
    firebaseConnectionManager.cleanupAll();
    setConnectionStats({ activeServices: 0, restaurantIds: [] });
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Firebase Debug Monitor</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Connection Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connection Stats</Text>
            <Text style={styles.statText}>Active Services: {connectionStats.activeServices}</Text>
            <Text style={styles.statText}>Restaurants: {connectionStats.restaurantIds.join(', ') || 'None'}</Text>
            <TouchableOpacity onPress={forceCleanup} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Force Cleanup</Text>
            </TouchableOpacity>
          </View>

          {/* Error Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Error Stats</Text>
            {Object.keys(errorStats).length === 0 ? (
              <Text style={styles.statText}>No errors recorded</Text>
            ) : (
              Object.entries(errorStats).map(([key, count]) => (
                <Text key={key} style={styles.statText}>
                  {key}: {count} occurrences
                </Text>
              ))
            )}
            <TouchableOpacity onPress={clearErrors} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Clear Errors</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Logs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Logs</Text>
            {logs.length === 0 ? (
              <Text style={styles.statText}>No recent logs</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logText}>{log}</Text>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 9999,
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    margin: 20,
    borderRadius: 10,
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#ff4444',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  logText: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 3,
    fontFamily: 'monospace',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default FirebaseDebugMonitor;
