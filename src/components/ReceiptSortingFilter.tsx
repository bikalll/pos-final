import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

export type SortOption = 'all' | 'today' | 'lastWeek' | 'lastMonth';

interface ReceiptSortingFilterProps {
  onSortChange: (option: SortOption) => void;
  selectedOption: SortOption;
}

const ReceiptSortingFilter: React.FC<ReceiptSortingFilterProps> = ({
  onSortChange,
  selectedOption,
}) => {
  const sortOptions = [
    { key: 'all', label: 'All Time', icon: 'calendar-all' },
    { key: 'today', label: 'Today', icon: 'calendar-today' },
    { key: 'lastWeek', label: 'Last Week', icon: 'calendar-week' },
    { key: 'lastMonth', label: 'Last Month', icon: 'calendar-month' },
  ] as const;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Filter Receipts
      </Text>
      <View style={styles.optionsContainer}>
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              {
                backgroundColor:
                  selectedOption === option.key
                    ? colors.primary
                    : colors.surface,
                borderColor: colors.outline,
              },
            ]}
            onPress={() => onSortChange(option.key)}
          >
            <Text
              style={[
                styles.optionText,
                {
                  color:
                    selectedOption === option.key
                      ? colors.textPrimary
                      : colors.textPrimary,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ReceiptSortingFilter;
