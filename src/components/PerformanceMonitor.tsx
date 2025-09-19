import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { getPeriodicCleanupService } from '../services/PeriodicCleanupService';

interface PerformanceMonitorProps {
  componentName: string;
  showInProduction?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  componentName,
  showInProduction = false,
  position = 'top-right'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [cleanupStats, setCleanupStats] = useState<any>(null);
  
  const { metrics, alerts, getStats, clearMetrics } = usePerformanceMonitor(componentName);
  const cleanupService = getPeriodicCleanupService();

  // Update cleanup stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCleanupStats(cleanupService.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, [cleanupService]);

  // Show monitor in development or if explicitly enabled
  const shouldShow = __DEV__ || showInProduction;

  if (!shouldShow) {
    return null;
  }

  const getPositionStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 9999,
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: 50, left: 10 };
      case 'top-right':
        return { ...baseStyle, top: 50, right: 10 };
      case 'bottom-left':
        return { ...baseStyle, bottom: 50, left: 10 };
      case 'bottom-right':
        return { ...baseStyle, bottom: 50, right: 10 };
      default:
        return { ...baseStyle, top: 50, right: 10 };
    }
  };

  const getStatusColor = () => {
    if (!metrics) return '#666';
    
    if (metrics.renderTime > 100 || metrics.listenerCount > 50 || metrics.memoryUsage > 100) {
      return '#ff4444'; // Red for poor performance
    } else if (metrics.renderTime > 50 || metrics.listenerCount > 25 || metrics.memoryUsage > 50) {
      return '#ffaa00'; // Orange for moderate performance
    } else {
      return '#44ff44'; // Green for good performance
    }
  };

  const handleManualCleanup = (type: 'quick' | 'normal' | 'deep') => {
    cleanupService.manualCleanup(type);
    setCleanupStats(cleanupService.getStats());
  };

  const handleServiceCleanup = (serviceName: string) => {
    cleanupService.cleanupService(serviceName);
    setCleanupStats(cleanupService.getStats());
  };

  return (
    <>
      {/* Compact Monitor */}
      <TouchableOpacity
        style={[styles.compactMonitor, getPositionStyle()]}
        onPress={() => setIsVisible(true)}
      >
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.compactText}>
          {metrics ? `${metrics.renderTime.toFixed(0)}ms` : '--'}
        </Text>
      </TouchableOpacity>

      {/* Detailed Monitor Modal */}
      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Performance Monitor</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Current Metrics */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Metrics</Text>
                {metrics ? (
                  <View style={styles.metricsContainer}>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Render Time:</Text>
                      <Text style={[styles.metricValue, { color: metrics.renderTime > 100 ? '#ff4444' : '#44ff44' }]}>
                        {metrics.renderTime.toFixed(2)}ms
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Listeners:</Text>
                      <Text style={[styles.metricValue, { color: metrics.listenerCount > 50 ? '#ff4444' : '#44ff44' }]}>
                        {metrics.listenerCount}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Redux Updates:</Text>
                      <Text style={[styles.metricValue, { color: metrics.reduxUpdates > 100 ? '#ff4444' : '#44ff44' }]}>
                        {metrics.reduxUpdates}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Memory:</Text>
                      <Text style={[styles.metricValue, { color: metrics.memoryUsage > 100 ? '#ff4444' : '#44ff44' }]}>
                        {metrics.memoryUsage.toFixed(2)}MB
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No metrics available</Text>
                )}
              </View>

              {/* Performance Statistics */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Performance Statistics</Text>
                {(() => {
                  const stats = getStats();
                  return (
                    <View style={styles.metricsContainer}>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Avg Render Time:</Text>
                        <Text style={styles.metricValue}>{stats.avgRenderTime}ms</Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Max Render Time:</Text>
                        <Text style={styles.metricValue}>{stats.maxRenderTime}ms</Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Avg Listeners:</Text>
                        <Text style={styles.metricValue}>{stats.avgListenerCount}</Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Avg Memory:</Text>
                        <Text style={styles.metricValue}>{stats.avgMemoryUsage}MB</Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Total Metrics:</Text>
                        <Text style={styles.metricValue}>{stats.totalMetrics}</Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Alerts:</Text>
                        <Text style={[styles.metricValue, { color: stats.alertCount > 0 ? '#ff4444' : '#44ff44' }]}>
                          {stats.alertCount}
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </View>

              {/* Recent Alerts */}
              {alerts.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Alerts</Text>
                  {alerts.slice(-5).map((alert, index) => (
                    <View key={index} style={styles.alertContainer}>
                      <Text style={[styles.alertType, { color: alert.type === 'error' ? '#ff4444' : '#ffaa00' }]}>
                        {alert.type.toUpperCase()}
                      </Text>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                      <Text style={styles.alertTime}>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Cleanup Service Status */}
              {cleanupStats && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Cleanup Service</Text>
                  <View style={styles.metricsContainer}>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Status:</Text>
                      <Text style={[styles.metricValue, { color: cleanupStats.isRunning ? '#44ff44' : '#ff4444' }]}>
                        {cleanupStats.isRunning ? 'Running' : 'Stopped'}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Total Cleanups:</Text>
                      <Text style={styles.metricValue}>{cleanupStats.totalCleanups}</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Items Cleaned:</Text>
                      <Text style={styles.metricValue}>{cleanupStats.itemsCleaned}</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Errors:</Text>
                      <Text style={[styles.metricValue, { color: cleanupStats.errorsEncountered > 0 ? '#ff4444' : '#44ff44' }]}>
                        {cleanupStats.errorsEncountered}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.clearButton]}
                    onPress={clearMetrics}
                  >
                    <Text style={styles.buttonText}>Clear Metrics</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cleanupButton]}
                    onPress={() => handleManualCleanup('normal')}
                  >
                    <Text style={styles.buttonText}>Quick Cleanup</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deepCleanupButton]}
                    onPress={() => handleManualCleanup('deep')}
                  >
                    <Text style={styles.buttonText}>Deep Cleanup</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Service Status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Service Status</Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.serviceButton]}
                    onPress={() => handleServiceCleanup('backgroundProcessing')}
                  >
                    <Text style={styles.buttonText}>Clear Background</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.serviceButton]}
                    onPress={() => handleServiceCleanup('deduplication')}
                  >
                    <Text style={styles.buttonText}>Clear Cache</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.serviceButton]}
                    onPress={() => handleServiceCleanup('errorHandling')}
                  >
                    <Text style={styles.buttonText}>Clear Errors</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  compactMonitor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  compactText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  modalBody: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  metricsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  alertContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  alertType: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#dc3545',
  },
  cleanupButton: {
    backgroundColor: '#ffc107',
  },
  deepCleanupButton: {
    backgroundColor: '#6f42c1',
  },
  serviceButton: {
    backgroundColor: '#17a2b8',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default PerformanceMonitor;
