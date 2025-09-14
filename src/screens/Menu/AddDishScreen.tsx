import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { colors, spacing, radius, shadow } from '../../theme';
import { createFirestoreService } from '../../services/firestoreService';
import * as ImagePicker from 'expo-image-picker';

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  ingredients?: Ingredient[];
  restaurantId: string;
  orderType?: 'KOT' | 'BOT';
}

const AddDishScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { restaurantId } = useSelector((state: RootState) => state.auth);
  
  const [firestoreService, setFirestoreService] = useState<any>(null);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    orderType: 'KOT' as 'KOT' | 'BOT',
  });
  
  // Ingredients
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newIngredient, setNewIngredient] = useState<Ingredient>({
    name: '',
    quantity: '',
    unit: '',
  });
  
  // UI states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // Check if editing existing item
  const editingItem = route.params?.item as MenuItem | null;
  const isEditing = !!editingItem;

  useEffect(() => {
    const initializeService = async () => {
      if (restaurantId) {
        const service = createFirestoreService(restaurantId);
        setFirestoreService(service);
        
        // Load categories
        try {
          const categoriesData = await service.getCategories();
          const categoriesArray = Object.values(categoriesData || {}).map((cat: any) => ({ id: cat.id, name: cat.name }));
          setCategories(categoriesArray);
        } catch (error) {
          console.error('Error loading categories:', error);
        }
      }
    };
    
    initializeService();
  }, [restaurantId]);

  useEffect(() => {
    if (isEditing && editingItem) {
      setFormData({
        name: editingItem.name || '',
        description: editingItem.description || '',
        price: editingItem.price?.toString() || '',
        category: editingItem.category || '',
        image: editingItem.image || '',
        orderType: (editingItem.orderType as any) === 'BOT' ? 'BOT' : 'KOT',
      });
      setIngredients(editingItem.ingredients || []);
    }
  }, [isEditing, editingItem]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Dish name is required';
    }
    
    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'Please select a category';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !firestoreService) return;
    
    setIsLoading(true);
    try {
      const dishData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        category: formData.category,
        image: formData.image,
        ingredients: ingredients.filter(ing => ing.name.trim() && ing.quantity.trim()),
        restaurantId,
        orderType: formData.orderType,
      };
      
      if (isEditing && editingItem) {
        await firestoreService.updateMenuItem(editingItem.id, dishData);
        Alert.alert('Success', 'Dish updated successfully!');
      } else {
        await firestoreService.createMenuItem(dishData);
        Alert.alert('Success', 'Dish added successfully!');
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving dish:', error);
      Alert.alert('Error', 'Failed to save dish. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, image: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const addIngredient = () => {
    if (newIngredient.name.trim() && newIngredient.quantity.trim()) {
      setIngredients(prev => [...prev, { ...newIngredient }]);
      setNewIngredient({ name: '', quantity: '', unit: '' });
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const renderFormField = (
    label: string,
    field: keyof typeof formData,
    placeholder: string,
    keyboardType: 'default' | 'numeric' = 'default',
    multiline: boolean = false
  ) => (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.formInput,
          multiline && styles.multilineInput,
          errors[field] && styles.inputError
        ]}
        value={formData[field]}
        onChangeText={(text) => setFormData(prev => ({ ...prev, [field]: text }))}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Dish' : 'Add New Dish'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          {renderFormField('Dish Name', 'name', 'Enter dish name')}
          {renderFormField('Description', 'description', 'Enter dish description', 'default', true)}
          {renderFormField('Price', 'price', 'Enter price', 'numeric')}

          {/* Order Type (KOT/BOT) */}
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Order Type</Text>
            <View style={styles.radioRow}>
              <TouchableOpacity
                style={[styles.radioItem, formData.orderType === 'KOT' && styles.radioItemActive]}
                onPress={() => setFormData(prev => ({ ...prev, orderType: 'KOT' }))}
              >
                <View style={[styles.radioDot, formData.orderType === 'KOT' && styles.radioDotActive]} />
                <Text style={styles.radioLabel}>KOT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioItem, formData.orderType === 'BOT' && styles.radioItemActive]}
                onPress={() => setFormData(prev => ({ ...prev, orderType: 'BOT' }))}
              >
                <View style={[styles.radioDot, formData.orderType === 'BOT' && styles.radioDotActive]} />
                <Text style={styles.radioLabel}>BOT</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Category Selection */}
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity
              style={[
                styles.categoryDropdown,
                errors.category && styles.inputError
              ]}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Text style={[
                styles.categoryDropdownText,
                !formData.category && styles.placeholderText
              ]}>
                {formData.category || 'Select category'}
              </Text>
              <Ionicons 
                name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
            
            {showCategoryDropdown && (
              <View style={styles.categoryDropdownList}>
                <ScrollView style={styles.categoryScrollView} showsVerticalScrollIndicator={false}>
                  {(Array.isArray(categories) ? categories : Object.values(categories || {})).map((category: any) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryItem,
                        formData.category === category.name && styles.categoryItemSelected
                      ]}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, category: category.name }));
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.categoryItemText,
                        formData.category === category.name && styles.categoryItemTextSelected
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>
        </View>

        {/* Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dish Image</Text>
          
          <TouchableOpacity style={styles.imageContainer} onPress={handleImagePicker}>
            {formData.image ? (
              <Image source={{ uri: formData.image }} style={styles.dishImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={48} color={colors.textSecondary} />
                <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Ingredients Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recipe Ingredients</Text>
          <Text style={styles.sectionSubtitle}>Add ingredients for one unit of this dish</Text>
          
          {/* Add Ingredient Form */}
          <View style={styles.ingredientForm}>
            <View style={styles.ingredientInputRow}>
              <TextInput
                style={[styles.ingredientInput, styles.ingredientNameInput]}
                value={newIngredient.name}
                onChangeText={(text) => setNewIngredient(prev => ({ ...prev, name: text }))}
                placeholder="Ingredient name"
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={[styles.ingredientInput, styles.ingredientQuantityInput]}
                value={newIngredient.quantity}
                onChangeText={(text) => setNewIngredient(prev => ({ ...prev, quantity: text }))}
                placeholder="Qty"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.ingredientInput, styles.ingredientUnitInput]}
                value={newIngredient.unit}
                onChangeText={(text) => setNewIngredient(prev => ({ ...prev, unit: text }))}
                placeholder="Unit"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                style={styles.addIngredientButton}
                onPress={addIngredient}
              >
                <Ionicons name="add" size={20} color={colors.background} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Ingredients List */}
          {ingredients.length > 0 && (
            <View style={styles.ingredientsList}>
              {ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientQuantity}>
                      {ingredient.quantity} {ingredient.unit}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeIngredientButton}
                    onPress={() => removeIngredient(index)}
                  >
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : (isEditing ? 'Update Dish' : 'Add Dish')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  section: {
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  formField: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  categoryDropdownText: {
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  categoryDropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  categoryScrollView: {
    maxHeight: 200,
  },
  categoryItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  categoryItemSelected: {
    backgroundColor: colors.primary + '20',
  },
  categoryItemText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  categoryItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  radioRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  radioItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    marginRight: spacing.xs,
    backgroundColor: 'transparent',
  },
  radioDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dishImage: {
    width: 200,
    height: 150,
    borderRadius: radius.md,
  },
  imagePlaceholder: {
    width: 200,
    height: 150,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.outline,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  ingredientForm: {
    marginBottom: spacing.md,
  },
  ingredientInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ingredientInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  ingredientNameInput: {
    flex: 2,
  },
  ingredientQuantityInput: {
    flex: 1,
  },
  ingredientUnitInput: {
    flex: 1,
  },
  addIngredientButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientsList: {
    marginTop: spacing.sm,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  ingredientQuantity: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  removeIngredientButton: {
    padding: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    backgroundColor: colors.surface,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
});

export default AddDishScreen;

