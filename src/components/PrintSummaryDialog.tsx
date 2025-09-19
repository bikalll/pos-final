import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PrintSummaryDialogProps {
  visible: boolean;
  onClose: () => void;
  onPrint: () => void;
  onSaveAsExcel: () => void;
  title?: string;
}

export default function PrintSummaryDialog({
  visible,
  onClose,
  onPrint,
  onSaveAsExcel,
  title = "Print Summary"
}: PrintSummaryDialogProps) {
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
              onPress={() => {
                onPrint();
                onClose();
              }}
            >
              <MaterialCommunityIcons name="printer" size={32} color="#4CAF50" />
              <Text style={styles.optionTitle}>Print</Text>
              <Text style={styles.optionDescription}>
                Send to thermal printer
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                onSaveAsExcel();
                onClose();
              }}
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
});
