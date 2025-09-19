# Simplified Sales Calculation

## Issue
The user requested to simplify the sales calculation to remove service charge and tax provisions, making it just: **Gross Sales - Discounts = Net Sales**

## Requirement
Since there's no service charge or tax provision in the app, the calculation should be simplified to:
- **Net Sales = Gross Sales - Discounts**

## Changes Applied

### 1. Print Summary Calculation (`doPrintSummary`)

**Before:**
```typescript
const serviceCharge = dateFilteredReceipts.reduce((sum, r) => sum + (r.serviceCharge || 0), 0);
const netSales = grossSales - discounts + tax + serviceCharge;
```

**After:**
```typescript
const serviceCharge = 0; // No service charge provision in the app
const netSales = grossSales - discounts; // Simplified formula
```

### 2. Excel Export Calculation

**Before:**
```typescript
const totalServiceCharge = data.transactions.reduce((sum, t) => sum + (t.serviceCharge || 0), 0);
const netSales = grossSales - totalDiscounts + totalTax + totalServiceCharge;
```

**After:**
```typescript
const totalServiceCharge = 0; // No service charge provision in the app
const netSales = grossSales - totalDiscounts; // Simplified formula
```

### 3. Print Format Display

**Removed Service Charge line from both formats:**
- **Fallback Print**: Removed `Service Charge     [Amount]`
- **Bluetooth Print**: Removed `Service Charge        [Amount]`

### 4. Excel Export Display

**Removed Service Charge line:**
```typescript
// Removed: lines.push(`Service Charge,${totalServiceCharge.toFixed(1)}`);
```

## Files Modified

### `src/screens/Receipts/DailySummaryScreen.tsx`
- Set service charge calculation to always be 0
- Simplified net sales formula to: `grossSales - discounts`
- Added comment explaining no service charge provision

### `src/utils/excelExporter.ts`
- Set service charge calculation to always be 0
- Removed service charge line from Excel export display
- Simplified net sales formula to: `grossSales - totalDiscounts`
- Added comment explaining no service charge provision

### `src/services/blePrinter.ts`
- Removed service charge line from both fallback and Bluetooth print formats
- Shows simplified format without service charge

### `test-sales-calculation.js`
- Updated test data to show service charge as 0
- Updated expected results to reflect no service charge
- Updated calculation comments
- Simplified formula verification

## Updated Sales Summary Format

### Print Format:
```
--- Sales Summary ---
Gross Sales        [Amount]
Tax                0.0
Discounts          [Amount]
Complementary      0.0
Net Sales          [Amount]
```

### Excel Format:
```
--- Sales Summary ---
Gross Sales,[Amount]
Tax,0.0
Discounts,[Amount]
Complementary,0.0
Net Sales,[Amount]
```

## Updated Calculation Formula

### Net Sales Calculation:
**Before:** `Gross Sales - Discounts + Tax + Service Charge`
**After:** `Gross Sales - Discounts`

### Simplified Formula:
**Net Sales = Gross Sales - Discounts**

## Example Calculation

### Sample Data:
- Gross Sales: 300
- Total Discounts: 30
- Tax: 0 (no tax provision)
- Service Charge: 0 (no service charge provision)

### Result:
- **Net Sales = 300 - 30 = 270**

## Result

✅ **Service Charge Removed** - All service charge calculations set to 0
✅ **Display Updated** - Service charge line removed from all formats
✅ **Calculation Simplified** - Net sales calculation updated to simple formula
✅ **Consistent Format** - Both print and Excel show simplified format
✅ **Test Updated** - Test data reflects no service charge provision

The sales calculation has been simplified to the basic formula: **Net Sales = Gross Sales - Discounts**
