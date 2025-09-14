import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface IconProps {
  name: 'receipt' | 'chart' | 'search' | 'wallet' | 'card' | 'bank' | 'credit' | 'table' | 'user';
  size?: number;
  color?: string;
  style?: any;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#ffffff', style }) => {
  const getIconSymbol = () => {
    switch (name) {
      case 'receipt':
        return '📄';
      case 'chart':
        return '📊';
      case 'search':
        return '🔍';
      case 'wallet':
        return '💰';
      case 'card':
        return '💳';
      case 'bank':
        return '🏦';
      case 'credit':
        return '💲';
      case 'table':
        return '🍽️';
      case 'user':
        return '👤';
      default:
        return '📄';
    }
  };

  return (
    <Text style={[styles.icon, { fontSize: size, color }, style]}>
      {getIconSymbol()}
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
});

export default Icon;


