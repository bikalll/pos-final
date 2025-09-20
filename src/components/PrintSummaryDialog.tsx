import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PrintSummaryDialogProps {
  visible: boolean;
  onClose: () => void;
  onPrint: (timePeriod: 'daily' | 'weekly' | 'last30days') => void;
  onSaveAsExcel: (timePeriod: 'daily' | 'weekly' | 'last30days') => void;
  title?: string;
}

export default function PrintSummaryDialog({
  visible,
  onClose,
  onPrint,
  onSaveAsExcel,
  title = "Print Summary"
}: PrintSummaryDialogProps) {
  const [showTimePeriodSelection, setShowTimePeriodSelection] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'print' | 'excel' | null>(null);

  const handlePrintPress = () => {
    setSelectedAction('print');
    setShowTimePeriodSelection(true);
  };

  const handleExcelPress = () => {
    setSelectedAction('excel');
    setShowTimePeriodSelection(true);
  };

  const handleTimePeriodSelect = (timePeriod: 'daily' | 'weekly' | 'last30days') => {
    if (selectedAction === 'print') {
      onPrint(timePeriod);
    } else if (selectedAction === 'excel') {
      onSaveAsExcel(timePeriod);
    }
    setShowTimePeriodSelection(false);
    setSelectedAction(null);
    onClose();
  };

  const handleBackToOptions = () => {
    setShowTimePeriodSelection(false);
    setSelectedAction(null);
  };

  if (showTimePeriodSelection) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBackToOptions} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
              <MaterialCommunityIcons 
                name={selectedAction === 'print' ? "printer" : "file-excel"} 
                size={24} 
                color={selectedAction === 'print' ? "#4CAF50" : "#2196F3"} 
              />
              <Text style={styles.title}>
                {selectedAction === 'print' ? 'Print Summary' : 'Export to Excel'}
              </Text>
            </View>
            
            <Text style={styles.description}>
              Choose a time period for the summary:
            </Text>
            
            <View style={styles.timePeriodContainer}>
              <TouchableOpacity
                style={styles.timePeriodButton}
                onPress={() => handleTimePeriodSelect('daily')}
              >
                <MaterialCommunityIcons name="calendar-today" size={32} color="#4CAF50" />
                <Text style={styles.timePeriodTitle}>Daily</Text>
                <Text style={styles.timePeriodDescription}>
                  Today's transactions
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.timePeriodButton}
                onPress={() => handleTimePeriodSelect('weekly')}
              >
                <MaterialCommunityIcons name="calendar-week" size={32} color="#FF9800" />
                <Text style={styles.timePeriodTitle}>Weekly</Text>
                <Text style={styles.timePeriodDescription}>
                  Last 7 days
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.timePeriodButton}
                onPress={() => handleTimePeriodSelect('last30days')}
              >
                <MaterialCommunityIcons name="calendar-month" size={32} color="#9C27B0" />
                <Text style={styles.timePeriodTitle}>Last 30 Days</Text>
                <Text style={styles.timePeriodDescription}>
                  Past month
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="printer" size={24} color="#fff" />
            <Text style={styles.title}>{title}</Text>
          </View>
          
          <Text style={styles.description}>
            Choose how you would like to export the transaction summary:
          </Text>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handlePrintPress}
            >
              <MaterialCommunityIcons name="printer" size={32} color="#4CAF50" />
              <Text style={styles.optionTitle}>Print</Text>
              <Text style={styles.optionDescription}>
                Send to thermal printer
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleExcelPress}
            >
              <MaterialCommunityIcons name="file-excel" size={32} color="#2196F3" />
              <Text style={styles.optionTitle}>Save as Excel</Text>
              <Text style={styles.optionDescription}>
                Download Excel file to device
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 24,
    lineHeight: 20,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  timePeriodContainer: {
    marginBottom: 24,
  },
  timePeriodButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  timePeriodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  timePeriodDescription: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 16,
  },
});
