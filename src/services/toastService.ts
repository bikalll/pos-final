import { Alert } from 'react-native';

class ToastService {
  static show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    // For now, use Alert as a fallback
    // In a real implementation, you would integrate with a toast library
    Alert.alert(
      type.toUpperCase(),
      message,
      [{ text: 'OK' }],
      { cancelable: true }
    );
  }

  static success(message: string) {
    this.show(message, 'success');
  }

  static error(message: string) {
    this.show(message, 'error');
  }

  static info(message: string) {
    this.show(message, 'info');
  }

  static warning(message: string) {
    this.show(message, 'warning');
  }
}

export const Toast = ToastService;

