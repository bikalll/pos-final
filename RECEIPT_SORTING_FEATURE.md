# Receipt Sorting Feature

## Overview
A new sorting feature has been added to the receipts section that allows users to filter receipts by different time periods.

## Features

### Time-based Filtering
Users can now filter receipts by the following time periods:
- **All Time**: Shows all receipts regardless of date
- **Today**: Shows only receipts from today
- **Last Week**: Shows receipts from the last 7 days
- **Last Month**: Shows receipts from the last 30 days

### UI Components
- **ReceiptSortingFilter**: A reusable component that provides the sorting interface
- **Date Range Display**: Shows the current date range in the results count
- **Dynamic Summary**: Payment summary updates based on the selected date range

## Implementation Details

### Files Added/Modified

#### New Files:
- `src/components/ReceiptSortingFilter.tsx` - The sorting filter component
- `src/utils/receiptFilters.ts` - Utility functions for date filtering
- `RECEIPT_SORTING_FEATURE.md` - This documentation

#### Modified Files:
- `src/screens/Receipts/DailySummaryScreen.tsx` - Integrated sorting functionality
- `src/components/index.ts` - Added export for ReceiptSortingFilter

### Key Features

1. **Date Filtering Logic**: Uses timestamp-based filtering for accurate date calculations
2. **Dynamic Summary Updates**: Payment summary cards update based on selected date range
3. **Search Integration**: Works seamlessly with existing search and payment method filters
4. **Responsive UI**: Clean, modern interface that matches the app's design theme

### Usage

The sorting feature is automatically available in the receipts section. Users can:
1. Select a time period using the filter buttons
2. See the filtered results immediately
3. View updated payment summaries for the selected period
4. Combine with existing search and payment method filters

### Technical Notes

- Uses React Native's built-in Date object for calculations
- Implements proper memoization for performance
- Maintains backward compatibility with existing functionality
- Follows the app's existing design patterns and color scheme
