import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImagePickerModal, MenuItemImage } from './index';
import { ImageInfo } from '../services/imageService';

export interface MenuItem {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageInfo?: ImageInfo | null;
  isAvailable: boolean;
  preparationTime?: number;
  orderType: 'KOT' | 'BOT'; // Add orderType field
  allergens?: string[];
  ingredients?: Ingredient[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

interface MenuItemFormProps {
  item?: MenuItem;
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
  categories: string[];
}

const MenuItemForm: React.FC<MenuItemFormProps> = ({
  item,
  onSave,
  onCancel,
  categories,
}) => {
  const [formData, setFormData] = useState<MenuItem>({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || 0,
    category: item?.category || categories[0] || '',
    imageInfo: item?.imageInfo || null,
    isAvailable: item?.isAvailable ?? true,
    preparationTime: item?.preparationTime || 15,
    orderType: item?.orderType || 'KOT', // Default to KOT
    allergens: item?.allergens || [],
    ingredients: item?.ingredients || [],
    nutritionalInfo: item?.nutritionalInfo || {},
  });

  console.log('🔍 MenuItemForm initialized with orderType:', formData.orderType);

  const [showImagePicker, setShowImagePicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Ingredient management
  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), { name: '', quantity: 0, unit: 'g' }]
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients?.filter((_, i) => i !== index) || []
    }));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients?.map((ingredient, i) => 
        i === index ? { ...ingredient, [field]: value } : ingredient
      ) || []
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.orderType) {
      newErrors.orderType = 'Order type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    } else {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
    }
  };

  const handleImageChange = (imageInfo: ImageInfo | null) => {
    console.log('Image selected:', imageInfo);
    setFormData(prev => ({ ...prev, imageInfo }));
  };

  const handleAddImage = () => {
    console.log('Add image button pressed');
    setShowImagePicker(true);
  };

  const updateField = (field: keyof MenuItem, value: any) => {
    console.log('🔍 updateField called:', field, 'value:', value);
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderField = (
    label: string,
    field: keyof MenuItem,
    placeholder: string,
    keyboardType: 'default' | 'numeric' | 'email-address' = 'default',
    multiline: boolean = false
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          errors[field] && styles.inputError,
        ]}
        value={String(formData[field] || '')}
        onChangeText={(value) => updateField(field, value)}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const renderCategoryPicker = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryContainer}>
        {(Array.isArray(categories) ? categories : []).map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              formData.category === category && styles.categoryChipSelected,
            ]}
            onPress={() => updateField('category', category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                formData.category === category && styles.categoryChipTextSelected,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
    </View>
  );

  const renderAvailabilityToggle = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>Availability</Text>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          formData.isAvailable && styles.toggleButtonActive,
        ]}
        onPress={() => updateField('isAvailable', !formData.isAvailable)}
      >
        <Text
          style={[
            styles.toggleButtonText,
            formData.isAvailable && styles.toggleButtonTextActive,
          ]}
        >
          {formData.isAvailable ? 'Available' : 'Not Available'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOrderTypeSelection = () => {
    console.log('🔍 renderOrderTypeSelection called, orderType:', formData.orderType);
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Order Type</Text>
        <Text style={styles.subLabel}>Select whether this item goes to Kitchen (KOT) or Bar (BOT)</Text>
        
        {/* Simple test buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            style={{
              padding: 15,
              backgroundColor: formData.orderType === 'KOT' ? '#007AFF' : '#f0f0f0',
              borderRadius: 8,
              flex: 1,
              alignItems: 'center',
            }}
            onPress={() => {
              console.log('🔍 KOT button pressed');
              updateField('orderType', 'KOT');
            }}
          >
            <Text style={{ 
              color: formData.orderType === 'KOT' ? '#fff' : '#666',
              fontWeight: 'bold'
            }}>
              🍽️ Kitchen (KOT)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              padding: 15,
              backgroundColor: formData.orderType === 'BOT' ? '#007AFF' : '#f0f0f0',
              borderRadius: 8,
              flex: 1,
              alignItems: 'center',
            }}
            onPress={() => {
              console.log('🔍 BOT button pressed');
              updateField('orderType', 'BOT');
            }}
          >
            <Text style={{ 
              color: formData.orderType === 'BOT' ? '#fff' : '#666',
              fontWeight: 'bold'
            }}>
              🍷 Bar (BOT)
            </Text>
          </TouchableOpacity>
        </View>
        
        <Text style={{ marginTop: 10, color: '#666', fontSize: 12 }}>
          Current selection: {formData.orderType}
        </Text>
        
        {errors.orderType && <Text style={styles.errorText}>{errors.orderType}</Text>}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {item ? 'Edit Menu Item' : 'Add New Menu Item'}
          </Text>
        </View>

        {/* Image Section */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Item Image</Text>
          <MenuItemImage
            imageInfo={formData.imageInfo}
            onImageChange={handleImageChange}
            onAddImage={handleAddImage}
            editable={true}
            size="large"
          />
        </View>

        {/* Ingredients Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recipe</Text>
          <Text style={styles.subLabel}>Add ingredients and quantities for one unit of this dish</Text>
          
          {formData.ingredients?.map((ingredient, index) => (
            <View key={index} style={styles.ingredientRow}>
              <TextInput
                style={[styles.ingredientInput, styles.ingredientNameInput]}
                placeholder="Ingredient"
                value={ingredient.name}
                onChangeText={(value) => updateIngredient(index, 'name', value)}
              />
              <TextInput
                style={[styles.ingredientInput, styles.ingredientQuantityInput]}
                placeholder="Qty"
                value={ingredient.quantity.toString()}
                onChangeText={(value) => updateIngredient(index, 'quantity', parseFloat(value) || 0)}
                keyboardType="numeric"
              />
              <View style={styles.unitDropdown}>
                <Text style={styles.unitText}>{ingredient.unit}</Text>
                <Ionicons name="chevron-down" size={16} color="#666" />
              </View>
              <TouchableOpacity
                style={styles.removeIngredientButton}
                onPress={() => removeIngredient(index)}
              >
                <Ionicons name="trash" size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}
          
          <TouchableOpacity style={styles.addIngredientButton} onPress={addIngredient}>
            <Ionicons name="add-circle" size={20} color="#007AFF" />
            <Text style={styles.addIngredientText}>Add Ingredient</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          {renderField('Name', 'name', 'Enter item name')}
          {renderField('Description', 'description', 'Enter item description', 'default', true)}
          {renderField('Price', 'price', '0.00', 'numeric')}
          {renderCategoryPicker()}
          {renderAvailabilityToggle()}
          {renderOrderTypeSelection()}
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          {renderField('Preparation Time (minutes)', 'preparationTime', '15', 'numeric')}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Item</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Picker Modal */}
      <ImagePickerModal
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={handleImageChange}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  imageSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },

  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryChipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  toggleButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  orderTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  orderTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  orderTypeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  orderTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderTypeText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  orderTypeTextSelected: {
    color: '#fff',
  },
  subLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    marginBottom: 15,
  },
  // Ingredient styles
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  ingredientInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  ingredientNameInput: {
    flex: 2,
  },
  ingredientQuantityInput: {
    flex: 1,
    textAlign: 'center',
  },
  unitDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    minWidth: 80,
  },
  unitText: {
    fontSize: 14,
    color: '#333',
    marginRight: 5,
  },
  removeIngredientButton: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIngredientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#f8f9ff',
    marginTop: 10,
  },
  addIngredientText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default MenuItemForm;


