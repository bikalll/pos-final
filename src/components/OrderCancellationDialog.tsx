import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../theme';

interface OrderCancellationDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: 'void' | 'other', otherReason?: string) => void;
  title?: string;
}

export default function OrderCancellationDialog({
  visible,
  onClose,
  onConfirm,
  title = "Cancel Order"
}: OrderCancellationDialogProps) {
  const [selectedReason, setSelectedReason] = useState<'void' | 'other' | null>(null);
  const [otherReason, setOtherReason] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) {
      Alert.alert('Selection Required', 'Please select a cancellation reason.');
      return;
    }

    if (selectedReason === 'other' && !otherReason.trim()) {
      Alert.alert('Reason Required', 'Please specify the cancellation reason.');
      return;
    }

    onConfirm(selectedReason, selectedReason === 'other' ? otherReason : undefined);
    
    // Reset form
    setSelectedReason(null);
    setOtherReason('');
  };

  const handleClose = () => {
    // Reset form
    setSelectedReason(null);
    setOtherReason('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.warning} />
            <Text style={styles.title}>{title}</Text>
          </View>
          
          <Text style={styles.description}>
            Select a reason for cancelling this order:
          </Text>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                selectedReason === 'void' && styles.selectedOption
              ]}
              onPress={() => setSelectedReason('void')}
            >
              <View style={styles.optionContent}>
                <MaterialCommunityIcons 
                  name="cancel-outline" 
                  size={20} 
                  color={selectedReason === 'void' ? colors.textPrimary : colors.textMuted} 
                />
                <View style={styles.optionText}>
                  <Text style={[
                    styles.optionTitle,
                    selectedReason === 'void' && styles.selectedOptionText
                  ]}>
                    Void
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    selectedReason === 'void' && styles.selectedOptionDescription
                  ]}>
                    Void this receipt (appears in print summary)
                  </Text>
                </View>
              </View>
              {selectedReason === 'void' && (
                <MaterialCommunityIcons name="check" size={16} color={colors.primary} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.optionButton,
                selectedReason === 'other' && styles.selectedOption
              ]}
              onPress={() => setSelectedReason('other')}
            >
              <View style={styles.optionContent}>
                <MaterialCommunityIcons 
                  name="text-box-outline" 
                  size={20} 
                  color={selectedReason === 'other' ? colors.textPrimary : colors.textMuted} 
                />
                <View style={styles.optionText}>
                  <Text style={[
                    styles.optionTitle,
                    selectedReason === 'other' && styles.selectedOptionText
                  ]}>
                    Other
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    selectedReason === 'other' && styles.selectedOptionDescription
                  ]}>
                    Specify a different reason
                  </Text>
                </View>
              </View>
              {selectedReason === 'other' && (
                <MaterialCommunityIcons name="check" size={16} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {selectedReason === 'other' && (
            <View style={styles.textInputContainer}>
              <Text style={styles.textInputLabel}>Cancellation Reason *</Text>
              <TextInput
                style={styles.textInput}
                value={otherReason}
                onChangeText={setOtherReason}
                placeholder="Enter the reason for cancellation..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Cancel Order</Text>
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
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    padding: spacing.xl,
    paddingBottom: spacing.md,
    lineHeight: 20,
  },
  optionsContainer: {
    paddingHorizontal: spacing.xl,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.sm,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface2,
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: colors.surface2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  selectedOptionText: {
    color: colors.textPrimary,
  },
  selectedOptionDescription: {
    color: colors.textSecondary,
  },
  textInputContainer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  textInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface2,
    minHeight: 80,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    marginRight: spacing.xs,
    backgroundColor: colors.surface2,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.danger,
    marginLeft: spacing.xs,
  },
  confirmButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
