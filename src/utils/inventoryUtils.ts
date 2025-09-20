/**
 * Utility functions for inventory management and ingredient matching
 */

export interface IngredientMatch {
  inventoryItem: any;
  confidence: number;
  exactMatch: boolean;
}

/**
 * Normalize unit names for consistent comparison
 */
export function normalizeUnit(unit?: string): string {
  const raw = String(unit || '').trim().toLowerCase();
  if (!raw) return '';
  
  // Weight units
  if (['g', 'gm', 'gms', 'gram', 'grams'].includes(raw)) return 'g';
  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(raw)) return 'kg';
  
  // Volume units
  if (['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'].includes(raw)) return 'ml';
  if (['l', 'lt', 'liter', 'liters', 'litre', 'litres'].includes(raw)) return 'l';
  
  // Count units
  if (['pc', 'pcs', 'piece', 'pieces', 'unit', 'units'].includes(raw)) return 'pcs';
  
  return raw;
}

/**
 * Convert quantity between different units
 */
export function convertQuantity(qty: number, fromUnit?: string, toUnit?: string): number {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  
  if (!from || !to || from === to) return qty;
  
  // Weight conversions
  if (from === 'g' && to === 'kg') return qty / 1000;
  if (from === 'kg' && to === 'g') return qty * 1000;
  
  // Volume conversions
  if (from === 'ml' && to === 'l') return qty / 1000;
  if (from === 'l' && to === 'ml') return qty * 1000;
  
  // If no conversion available, return original quantity
  return qty;
}

/**
 * Find the best matching inventory item for an ingredient
 */
export function findBestInventoryMatch(
  ingredientName: string, 
  inventoryItems: Record<string, any>
): IngredientMatch | null {
  const normalizedIngredient = ingredientName.toLowerCase().trim();
  
  // First try exact match
  for (const [id, item] of Object.entries(inventoryItems)) {
    const normalizedInventory = (item.name || '').toLowerCase().trim();
    if (normalizedInventory === normalizedIngredient) {
      return {
        inventoryItem: item,
        confidence: 1.0,
        exactMatch: true
      };
    }
  }
  
  // Then try partial matches
  const partialMatches: IngredientMatch[] = [];
  
  for (const [id, item] of Object.entries(inventoryItems)) {
    const normalizedInventory = (item.name || '').toLowerCase().trim();
    
    // Check if ingredient name contains inventory name or vice versa
    if (normalizedIngredient.includes(normalizedInventory) || 
        normalizedInventory.includes(normalizedIngredient)) {
      const confidence = Math.min(
        normalizedIngredient.length / normalizedInventory.length,
        normalizedInventory.length / normalizedIngredient.length
      );
      
      partialMatches.push({
        inventoryItem: item,
        confidence,
        exactMatch: false
      });
    }
  }
  
  // Return the best partial match if confidence is high enough
  if (partialMatches.length > 0) {
    partialMatches.sort((a, b) => b.confidence - a.confidence);
    const bestMatch = partialMatches[0];
    
    // Only return if confidence is above threshold
    if (bestMatch.confidence > 0.7) {
      return bestMatch;
    }
  }
  
  return null;
}

/**
 * Validate if there's sufficient inventory for an order
 */
export function validateInventoryAvailability(
  orderItems: Array<{ menuItemId: string; quantity: number; name: string }>,
  menuItems: Record<string, any>,
  inventoryItems: Record<string, any>
): { 
  isValid: boolean; 
  warnings: Array<{ ingredient: string; required: number; available: number; menuItem: string }>;
  errors: Array<{ ingredient: string; required: number; available: number; menuItem: string }>;
} {
  const warnings: Array<{ ingredient: string; required: number; available: number; menuItem: string }> = [];
  const errors: Array<{ ingredient: string; required: number; available: number; menuItem: string }> = [];
  
  // Calculate total ingredient requirements
  const ingredientRequirements: Record<string, { total: number; menuItems: string[] }> = {};
  
  for (const orderItem of orderItems) {
    const menuItem = menuItems[orderItem.menuItemId];
    if (!menuItem || !Array.isArray(menuItem.ingredients)) continue;
    
    for (const ingredient of menuItem.ingredients) {
      // Ensure ingredient has required properties
      if (!ingredient || typeof ingredient !== 'object') continue;
      
      const ingredientName = String(ingredient.name || '').trim();
      const ingredientQuantity = Number(ingredient.quantity) || 0;
      
      if (!ingredientName) continue;
      
      const required = ingredientQuantity * orderItem.quantity;
      if (required <= 0) continue;
      
      const key = ingredientName.toLowerCase();
      if (!ingredientRequirements[key]) {
        ingredientRequirements[key] = { total: 0, menuItems: [] };
      }
      
      ingredientRequirements[key].total += required;
      ingredientRequirements[key].menuItems.push(orderItem.name);
    }
  }
  
  // Check availability for each ingredient
  for (const [ingredientName, requirement] of Object.entries(ingredientRequirements)) {
    const match = findBestInventoryMatch(ingredientName, inventoryItems);
    
    if (!match) {
      // No matching inventory item found
      errors.push({
        ingredient: ingredientName,
        required: requirement.total,
        available: 0,
        menuItem: requirement.menuItems.join(', ')
      });
      continue;
    }
    
    const available = Number(match.inventoryItem.stockQuantity) || 0;
    
    if (available < requirement.total) {
      if (available === 0) {
        errors.push({
          ingredient: ingredientName,
          required: requirement.total,
          available,
          menuItem: requirement.menuItems.join(', ')
        });
      } else {
        warnings.push({
          ingredient: ingredientName,
          required: requirement.total,
          available,
          menuItem: requirement.menuItems.join(', ')
        });
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Calculate inventory deltas for an order
 */
export function calculateInventoryDeltas(
  orderItems: Array<{ menuItemId: string; quantity: number; name: string }>,
  menuItems: Record<string, any>,
  savedQuantities?: Record<string, number>
): Array<{ name: string; requiredQty: number; unit?: string }> {
  const deltas: Array<{ name: string; requiredQty: number; unit?: string }> = [];
  
  for (const orderItem of orderItems) {
    const menuItem = menuItems[orderItem.menuItemId];
    if (!menuItem || !Array.isArray(menuItem.ingredients)) continue;
    
    // Calculate delta quantity (only deduct new items)
    const prevQty = savedQuantities?.[orderItem.menuItemId] ?? 0;
    const deltaQty = Math.max(0, orderItem.quantity - prevQty);
    
    if (deltaQty <= 0) continue;
    
    for (const ingredient of menuItem.ingredients) {
      // Ensure ingredient has required properties
      if (!ingredient || typeof ingredient !== 'object') continue;
      
      const ingredientName = String(ingredient.name || '').trim();
      const ingredientQuantity = Number(ingredient.quantity) || 0;
      const ingredientUnit = String(ingredient.unit || '').trim();
      
      if (!ingredientName) continue;
      
      const required = ingredientQuantity * deltaQty;
      if (required > 0) {
        deltas.push({
          name: ingredientName,
          requiredQty: required,
          unit: ingredientUnit || undefined
        });
      }
    }
  }
  
  // Aggregate deltas by ingredient name
  const aggregatedDeltas: Record<string, { total: number; unit?: string }> = {};
  
  for (const delta of deltas) {
    const key = delta.name.toLowerCase().trim();
    if (!aggregatedDeltas[key]) {
      aggregatedDeltas[key] = { total: 0, unit: delta.unit };
    }
    aggregatedDeltas[key].total += delta.requiredQty;
  }
  
  // Convert back to array
  return Object.entries(aggregatedDeltas).map(([name, data]) => ({
    name,
    requiredQty: data.total,
    unit: data.unit
  }));
}

