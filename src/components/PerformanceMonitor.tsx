import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import performanceMonitor from '../services/performanceMonitor';

interface PerformanceMonitorProps {
  visible: boolean;
  onClose: () => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ visible, onClose }) => {
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  useEffect(() => {
    if (visible && isMonitoring) {
      const interval = setInterval(() => {
        setMetrics(performanceMonitor.getMetrics());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [visible, isMonitoring]);
  
  const startMonitoring = () => {
    setIsMonitoring(true);
    performanceMonitor.reset();
  };
  
  const stopMonitoring = () => {
    setIsMonitoring(false);
  };
  
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getPerformanceStatus = () => {
    if (metrics.renderTime > 33) return { status: 'Poor', color: '#f44336' };
    if (metrics.renderTime > 16) return { status: 'Fair', color: '#ff9800' };
    return { status: 'Good', color: '#4caf50' };
  };
  
  const performanceStatus = getPerformanceStatus();
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Performance Monitor</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={startMonitoring}
            style={[styles.button, styles.startButton]}
            disabled={isMonitoring}
          >
            <Text style={styles.buttonText}>Start Monitoring</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={stopMonitoring}
            style={[styles.button, styles.stopButton]}
            disabled={!isMonitoring}
          >
            <Text style={styles.buttonText}>Stop Monitoring</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.metrics}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Render Time:</Text>
            <Text style={[styles.metricValue, { color: performanceStatus.color }]}>
              {metrics.renderTime.toFixed(2)}ms
            </Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Average Render Time:</Text>
            <Text style={styles.metricValue}>
              {metrics.averageRenderTime.toFixed(2)}ms
            </Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Listener Count:</Text>
            <Text style={styles.metricValue}>{metrics.listenerCount}</Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Memory Usage:</Text>
            <Text style={styles.metricValue}>
              {formatBytes(metrics.memoryUsage)}
            </Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Peak Memory:</Text>
            <Text style={styles.metricValue}>
              {formatBytes(metrics.peakMemoryUsage)}
            </Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Update Count:</Text>
            <Text style={styles.metricValue}>{metrics.updateCount}</Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Error Count:</Text>
            <Text style={[styles.metricValue, { color: metrics.errorCount > 0 ? '#f44336' : '#4caf50' }]}>
              {metrics.errorCount}
            </Text>
          </View>
        </View>
        
        <View style={styles.status}>
          <Text style={styles.statusLabel}>Performance Status:</Text>
          <Text style={[styles.statusValue, { color: performanceStatus.color }]}>
            {performanceStatus.status}
          </Text>
        </View>
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
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4caf50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  metrics: {
    padding: 16,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metricLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  status: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PerformanceMonitor;