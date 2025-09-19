import { SortOption } from '../components/ReceiptSortingFilter';

export interface ReceiptData {
  id: string;
  orderId: string;
  amount: string;
  customer: string;
  table: string;
  initial: string;
  paymentMethod: string;
  time: string;
  date: string;
  timestamp: number;
  orderItems: any[];
  baseSubtotal?: number; // Base subtotal before any discounts (for gross sales)
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  itemDiscount?: number;
  orderDiscount?: number;
}

export const filterReceiptsByDate = (
  receipts: ReceiptData[],
  sortOption: SortOption
): ReceiptData[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

  return receipts.filter((receipt) => {
    const receiptDate = new Date(receipt.timestamp);
    
    switch (sortOption) {
      case 'today':
        return receiptDate >= today;
      case 'lastWeek':
        return receiptDate >= lastWeek;
      case 'lastMonth':
        return receiptDate >= lastMonth;
      case 'all':
      default:
        return true;
    }
  });
};

export const getDateRangeLabel = (sortOption: SortOption): string => {
  switch (sortOption) {
    case 'today':
      return 'Today';
    case 'lastWeek':
      return 'Last 7 Days';
    case 'lastMonth':
      return 'Last 30 Days';
    case 'all':
    default:
      return 'All Time';
  }
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
