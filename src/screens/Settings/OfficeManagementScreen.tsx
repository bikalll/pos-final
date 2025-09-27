import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
// import * as DocumentPicker from 'expo-document-picker'; // Not used currently
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/storeFirebase';
import { setLogoUrl, setPanVatImageUrl } from '../../redux/slices/authSlice';
import { colors, spacing, radius } from '../../theme';
import { createFirestoreService } from '../../services/firestoreService';
import { useOptimizedListenerCleanup } from '../../services/OptimizedListenerManager';
import { usePerformanceMonitor } from '../../services/PerformanceMonitor';
import { getFirebaseAuthEnhanced } from '../../services/firebaseAuthEnhanced';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IMGBB_API_KEY = 'ff7e9b429a79828004e588b651c7e041';

// AsyncStorage keys
const EMAIL_VERIFICATION_STATUS_KEY = 'email_verification_status';
const EMAIL_VERIFICATION_TIMESTAMP_KEY = 'email_verification_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

async function uploadToImgbbBase64(imageBase64: string): Promise<string> {
  const form = new FormData();
  // imgbb expects raw base64 string without data URI prefix
  form.append('image', imageBase64);
  const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: form as any,
  });
  const json = await resp.json();
  if (!resp.ok || !json?.data) {
    throw new Error(json?.error?.message || 'Upload failed');
  }
  const direct = (json.data.display_url || json.data.url || (json.data.image && json.data.image.url)) as string | undefined;
  if (!direct) {
    throw new Error('Upload succeeded but URL missing');
  }
  return direct;
}

async function ensureBase64FromAsset(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (asset.base64 && asset.base64.length > 0) return asset.base64;
  if (asset.uri) {
    // Prefer FileSystem for reliability in Expo Go
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      return base64;
    } catch (e) {
      // Fallback to fetch + FileReader
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      return await new Promise<string>((resolve, reject) => {
        reader.onerror = () => reject(new Error('Failed to read image data'));
        reader.onload = () => {
          const result = reader.result as string;
          const comma = result.indexOf(',');
          resolve(comma > -1 ? result.slice(comma + 1) : result);
        };
        reader.readAsDataURL(blob);
      });
    }
  }
  throw new Error('No image data available');
}

export default function OfficeManagementScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const restaurantId = useSelector((s: RootState) => s.auth.restaurantId);
  const role = useSelector((s: RootState) => s.auth.role);
  const authUserName = useSelector((s: RootState) => s.auth.userName);
  
  // Optimized listener management and performance monitoring
  const { addListener, cleanup } = useOptimizedListenerCleanup('OfficeManagementScreen');
  const { updateListenerCount, incrementReduxUpdates, recordRenderTime } = usePerformanceMonitor();

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [panVat, setPanVat] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [panVatImageUrl, setPanVatImageUrl] = useState<string | undefined>(undefined);
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [isUpdatingPanVat, setIsUpdatingPanVat] = useState(false);
  
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string>('');
  const [viewingImageTitle, setViewingImageTitle] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(true);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);

  const canEdit = role === 'Owner' || role === 'Manager';
  const authService = getFirebaseAuthEnhanced();

  // Check email verification status with local cache
  const checkEmailVerificationStatus = async (forceRefresh = false) => {
    try {
      setIsCheckingVerification(true);
      
      // Check if we have cached data and it's still valid
      if (!forceRefresh) {
        const cachedStatus = await AsyncStorage.getItem(EMAIL_VERIFICATION_STATUS_KEY);
        const cachedTimestamp = await AsyncStorage.getItem(EMAIL_VERIFICATION_TIMESTAMP_KEY);
        
        if (cachedStatus && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp);
          const now = Date.now();
          
          // If cache is still valid (less than 5 minutes old)
          if (now - timestamp < CACHE_DURATION) {
            setIsEmailVerified(cachedStatus === 'true');
            setIsCheckingVerification(false);
            setIsUsingCachedData(true);
            console.log('Using cached email verification status:', cachedStatus === 'true');
            return;
          }
        }
      }
      
      // Fetch fresh data from Firebase
      console.log('Fetching fresh email verification status from Firebase');
      const isVerified = await authService.isEmailVerified();
      setIsEmailVerified(isVerified);
      setIsUsingCachedData(false);
      
      // Cache the result
      await AsyncStorage.setItem(EMAIL_VERIFICATION_STATUS_KEY, isVerified.toString());
      await AsyncStorage.setItem(EMAIL_VERIFICATION_TIMESTAMP_KEY, Date.now().toString());
      
    } catch (error) {
      console.error('Error checking email verification:', error);
      
      // Try to use cached data as fallback
      try {
        const cachedStatus = await AsyncStorage.getItem(EMAIL_VERIFICATION_STATUS_KEY);
        if (cachedStatus) {
          setIsEmailVerified(cachedStatus === 'true');
          console.log('Using cached data as fallback:', cachedStatus === 'true');
        } else {
          setIsEmailVerified(false);
        }
      } catch (cacheError) {
        console.error('Error reading cached data:', cacheError);
        setIsEmailVerified(false);
      }
    } finally {
      setIsCheckingVerification(false);
    }
  };

  // Clear verification cache (useful when verification status changes)
  const clearVerificationCache = async () => {
    try {
      await AsyncStorage.removeItem(EMAIL_VERIFICATION_STATUS_KEY);
      await AsyncStorage.removeItem(EMAIL_VERIFICATION_TIMESTAMP_KEY);
      console.log('Email verification cache cleared');
    } catch (error) {
      console.error('Error clearing verification cache:', error);
    }
  };

  // Check verification status on component mount
  useEffect(() => {
    checkEmailVerificationStatus();
  }, []);

  // Image viewer functions
  const openImageViewer = (imageUrl: string, title: string) => {
    setViewingImageUrl(imageUrl);
    setViewingImageTitle(title);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setViewingImageUrl('');
    setViewingImageTitle('');
  };

  const downloadImage = async () => {
    if (!viewingImageUrl || isDownloading) return;

    setIsDownloading(true);
    try {
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Please grant permission to save images to your device. You can enable this in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              // On some platforms, this might open settings
              console.log('User should go to settings to enable media library permission');
            }}
          ]
        );
        return;
      }

      // Create a safe filename
      const safeTitle = viewingImageTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `${safeTitle}_${Date.now()}.jpg`;
      
      // Use cache directory instead of document directory for better compatibility
      const fileUri = FileSystem.cacheDirectory + filename;
      
      console.log('📥 Downloading image to:', fileUri);
      
      // Ensure the cache directory exists
      const cacheDirInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory!);
      if (!cacheDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(FileSystem.cacheDirectory!, { intermediates: true });
      }
      
      const downloadResult = await FileSystem.downloadAsync(viewingImageUrl, fileUri);
      
      if (downloadResult.status === 200) {
        console.log('📥 Download successful, saving to media library...');
        
        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('Restaurant Images', asset, false);
        
        // Clean up the temporary file
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        
        Alert.alert('Success', `${viewingImageTitle} has been saved to your device!`);
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      
      // Try alternative method - direct save to media library
      try {
        console.log('📥 Trying alternative download method...');
        
        // Create a temporary file in a different location
        const tempFilename = `temp_${Date.now()}.jpg`;
        const tempUri = FileSystem.documentDirectory + tempFilename;
        
        // Ensure document directory exists
        const docDirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory!);
        if (!docDirInfo.exists) {
          await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory!, { intermediates: true });
        }
        
        const altDownloadResult = await FileSystem.downloadAsync(viewingImageUrl, tempUri);
        
        if (altDownloadResult.status === 200) {
          const asset = await MediaLibrary.createAssetAsync(altDownloadResult.uri);
          await MediaLibrary.createAlbumAsync('Restaurant Images', asset, false);
          
          // Clean up
          await FileSystem.deleteAsync(tempUri, { idempotent: true });
          
          Alert.alert('Success', `${viewingImageTitle} has been saved to your device!`);
        } else {
          throw new Error('Alternative download also failed');
        }
      } catch (altError) {
        console.error('Alternative download error:', altError);
        Alert.alert('Download Failed', 'Could not download the image. Please try again later.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const authState = useSelector((s: RootState) => s.auth);

  // Sync logo from Redux state when it changes (e.g., after login)
  useEffect(() => {
    if (authState.logoUrl && !logoUrl) {
      setLogoUrl(authState.logoUrl);
    }
  }, [authState.logoUrl]);

  // Sync PAN/VAT image from Redux state when it changes (e.g., after login)
  useEffect(() => {
    if (authState.panVatImageUrl && panVatImageUrl !== authState.panVatImageUrl && !isUpdatingPanVat) {
      setPanVatImageUrl(authState.panVatImageUrl);
    }
  }, [authState.panVatImageUrl, isUpdatingPanVat]);

  // Initial sync from Redux state on component mount
  useEffect(() => {
    if (authState.panVatImageUrl && !panVatImageUrl && !isUpdatingPanVat) {
      setPanVatImageUrl(authState.panVatImageUrl);
    }
  }, []);

  // Load PAN/VAT image when restaurantId changes (e.g., after login)
  useEffect(() => {
    if (restaurantId && hasLoadedInitialData) {
      const fsSvc = createFirestoreService(restaurantId);
      fsSvc.getRestaurantInfo().then(info => {
        if (info && info.panVatImageUrl) {
          setPanVatImageUrl(info.panVatImageUrl);
        } else {
          setPanVatImageUrl(undefined);
        }
      }).catch(e => console.warn('PAN/VAT reload failed', (e as Error).message));
    }
  }, [restaurantId, hasLoadedInitialData]);

  useEffect(() => {
    if (!restaurantId || hasLoadedInitialData) return;
    
    const fsSvc = createFirestoreService(restaurantId);

    // Initial load
    fsSvc.getRestaurantInfo().then(info => {
      if (info) {
        setName(info.name || '');
        setOwnerName((info.ownerName || authUserName || '').toString());
        setPanVat(info.panVat || info.pan || info.vat || '');
        
        // Set logo URL from Firestore, or fall back to Redux state
        const logoToSet = info.logoUrl || authState.logoUrl;
        setLogoUrl(logoToSet);
        
        // Set PAN/VAT image URL from Firestore, or fall back to Redux state
        const panVatToSet = info.panVatImageUrl || authState.panVatImageUrl;
        setPanVatImageUrl(panVatToSet);
        
        setAddress(info.address || '');
        setContactNumber(info.contactNumber || info.phone || '');
        setHasLoadedInitialData(true);
      }
    }).catch(e => console.warn('Office load failed', (e as Error).message));

    // Real-time updates for office info - DISABLED to prevent infinite loops
    // const unsubscribe = (fsSvc as any).listenToCollection?.('restaurant', (docs: Record<string, any>) => {
    //   const startTime = performance.now();
      
    //   const info = docs?.info;
    //   if (info && !isUpdatingImage) {
    //     console.log('📷 Real-time update received, updating state...');
    //     // Only update if values are actually different to prevent infinite loops
    //     const newName = info.name || '';
    //     const newOwnerName = (info.ownerName || authUserName || '').toString();
    //     const newPanVat = info.panVat || info.pan || info.vat || '';
    //     const newLogoUrl = info.logoUrl || undefined;
    //     const newPanVatImageUrl = info.panVatImageUrl || undefined;
    //     const newAddress = info.address || '';
    //     const newContactNumber = info.contactNumber || info.phone || '';
        
    //     // Only update state if values have changed
    //     if (newName !== name) setName(newName);
    //     if (newOwnerName !== ownerName) setOwnerName(newOwnerName);
    //     if (newPanVat !== panVat) setPanVat(newPanVat);
    //     if (newLogoUrl !== logoUrl) setLogoUrl(newLogoUrl);
    //     if (newPanVatImageUrl !== panVatImageUrl) setPanVatImageUrl(newPanVatImageUrl);
    //     if (newAddress !== address) setAddress(newAddress);
    //     if (newContactNumber !== contactNumber) setContactNumber(newContactNumber);
    //   } else if (isUpdatingImage) {
    //     console.log('📷 Skipping real-time update - image update in progress');
    //   }
      
    //   // Performance monitoring
    //   const endTime = performance.now();
    //   recordRenderTime(endTime - startTime);
    //   incrementReduxUpdates();
    // });

    // if (unsubscribe) {
    //   addListener('office-realtime', unsubscribe);
    // }

    return () => {
      cleanup();
    };
  }, [restaurantId, authUserName, addListener, cleanup, isUpdatingImage, hasLoadedInitialData]);

  const pickImage = async (onPicked: (url: string) => void, isLogo: boolean = false) => {
    if (!canEdit) {
      Alert.alert('View only', 'Only owners and managers can change images.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for logos
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        try {
          setLoading(true);
          setIsUpdatingImage(true);
          if (!isLogo) {
            setIsUpdatingPanVat(true);
          }
          const base64 = await ensureBase64FromAsset(result.assets[0]);
          const url = await uploadToImgbbBase64(base64);
          onPicked(url);
          // Update Redux state based on image type
          if (isLogo) {
            dispatch({ type: 'auth/setLogoUrl', payload: url });
          } else {
            dispatch({ type: 'auth/setPanVatImageUrl', payload: url });
          }
          // Show success feedback
          const imageType = isLogo ? 'Logo' : 'PAN/VAT image';
          Alert.alert('Success', `${imageType} selected successfully!`);
        } catch (e) {
          console.error('Upload error:', e);
          Alert.alert('Upload failed', (e as Error).message || 'Failed to upload image. Please try again.');
        } finally {
          setLoading(false);
          setIsUpdatingImage(false);
          if (!isLogo) {
            setIsUpdatingPanVat(false);
          }
        }
      }
    } catch (error) {
      console.error('📷 Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const pickFromCamera = async (onPicked: (url: string) => void, isLogo: boolean = false) => {
    if (!canEdit) {
      Alert.alert('View only', 'Only owners and managers can take images.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for logos
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        try {
          setLoading(true);
          setIsUpdatingImage(true);
          if (!isLogo) {
            setIsUpdatingPanVat(true);
          }
          const base64 = await ensureBase64FromAsset(result.assets[0]);
          const url = await uploadToImgbbBase64(base64);
          onPicked(url);
          // Update Redux state based on image type
          if (isLogo) {
            dispatch({ type: 'auth/setLogoUrl', payload: url });
          } else {
            dispatch({ type: 'auth/setPanVatImageUrl', payload: url });
          }
          // Show success feedback
          const imageType = isLogo ? 'Logo' : 'PAN/VAT image';
          Alert.alert('Success', `${imageType} captured successfully!`);
        } catch (e) {
          console.error('Upload error:', e);
          Alert.alert('Upload failed', (e as Error).message || 'Failed to upload image. Please try again.');
        } finally {
          setLoading(false);
          setIsUpdatingImage(false);
          if (!isLogo) {
            setIsUpdatingPanVat(false);
          }
        }
      }
    } catch (error) {
      console.error('📷 Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const save = async () => {
    if (!canEdit) return;
    if (!restaurantId) return;
    try {
      setLoading(true);
      const fs = createFirestoreService(restaurantId);
      const saveData = {
        name: name.trim(),
        ownerName: ownerName.trim(),
        panVat: panVat.trim(),
        logoUrl: logoUrl || null,
        panVatImageUrl: panVatImageUrl || null,
        address: address.trim(),
        contactNumber: contactNumber.trim(),
      };
      await fs.createRestaurant(saveData);
      
      // Update Redux state with the new logo URL
      if (logoUrl) {
        dispatch({ type: 'auth/setLogoUrl', payload: logoUrl });
      }
      
      // Update Redux state with the new PAN/VAT image URL
      if (panVatImageUrl) {
        dispatch({ type: 'auth/setPanVatImageUrl', payload: panVatImageUrl });
      }
      
      Alert.alert('Saved', 'Office details updated');
    } catch (e) {
      console.error('🔍 Office Management - Save failed:', e);
      Alert.alert('Save failed', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          padding: spacing.lg, 
          paddingBottom: Math.max(120, 80 + (insets.bottom || 0)) 
        }}
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.title}>Office Management</Text>
      <Text style={styles.subtitle}>Update restaurant profile, owner details, and PAN/VAT</Text>
      
      {/* Email Verification Status */}
      <View style={styles.emailVerificationContainer}>
        {isCheckingVerification ? (
          <>
            <Ionicons name="time" size={24} color={colors.textMuted} />
            <Text style={styles.emailVerificationText}>Checking verification...</Text>
          </>
        ) : isEmailVerified ? (
          <>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.emailVerificationText}>
              Email Verified
              {isUsingCachedData && <Text style={styles.cachedIndicator}> (cached)</Text>}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="mail-unread" size={24} color={colors.warning} />
            <Text style={styles.emailVerificationText}>
              Email Not Verified
              {isUsingCachedData && <Text style={styles.cachedIndicator}> (cached)</Text>}
            </Text>
          </>
        )}
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => checkEmailVerificationStatus(true)}
          disabled={isCheckingVerification}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={isCheckingVerification ? colors.textMuted : colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Current Logo Preview Section */}
      <View style={styles.previewSection}>
        <Text style={styles.previewLabel}>Current Logo (shown in navigation)</Text>
        <View style={styles.logoPreviewContainer}>
          {(logoUrl || authState.logoUrl) ? (
            <TouchableOpacity
              onLongPress={() => {
                const currentLogoUrl = logoUrl || authState.logoUrl;
                if (currentLogoUrl) {
                  openImageViewer(currentLogoUrl, 'Restaurant Logo');
                }
              }}
            >
              <Image 
                source={{ uri: logoUrl || authState.logoUrl }} 
                style={styles.logoPreview}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.logoPreviewPlaceholder}>
              <Text style={styles.logoPreviewText}>No logo set</Text>
            </View>
          )}
        </View>
      </View>


      <Text style={styles.label}>Restaurant Logo</Text>
      <Text style={styles.helpText}>💡 Long press to view and download</Text>
      <TouchableOpacity 
        onPress={() => pickImage(setLogoUrl, true)} 
        onLongPress={() => {
          const currentLogoUrl = logoUrl || authState.logoUrl;
          if (currentLogoUrl) {
            openImageViewer(currentLogoUrl, 'Restaurant Logo');
          }
        }}
        style={styles.logoBox} 
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {(logoUrl || authState.logoUrl) ? (
          <Image 
            source={{ uri: logoUrl || authState.logoUrl }} 
            style={styles.logo}
          />
        ) : (
          <Text style={styles.logoPlaceholder}>Pick Logo</Text>
        )}
      </TouchableOpacity>
      {canEdit && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.sm }}>
          <TouchableOpacity onPress={() => pickImage(setLogoUrl, true)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Choose Logo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pickFromCamera(setLogoUrl, true)} style={styles.secondaryBtnAlt}>
            <Text style={styles.secondaryBtnAltText}>Use Camera</Text>
          </TouchableOpacity>
        </View>
      )}
      {loading && <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.md }} />}

      <Text style={styles.label}>Restaurant Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        editable={canEdit}
        placeholder="Enter restaurant name"
        placeholderTextColor={'#FFFFFF'}
      />

      <Text style={styles.label}>Owner Name</Text>
      <TextInput
        style={styles.input}
        value={ownerName}
        onChangeText={setOwnerName}
        editable={canEdit}
        placeholder="Enter owner name"
        placeholderTextColor={'#FFFFFF'}
      />

      <Text style={styles.label}>PAN / VAT Number</Text>
      <TextInput
        style={styles.input}
        value={panVat}
        onChangeText={setPanVat}
        editable={canEdit}
        placeholder="Enter PAN/VAT number"
        placeholderTextColor={'#FFFFFF'}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>PAN / VAT Image (optional)</Text>
      <Text style={styles.helpText}>💡 Long press to view and download</Text>
      <TouchableOpacity 
        onPress={() => pickImage(setPanVatImageUrl, false)} 
        onLongPress={() => {
          const currentPanVatUrl = panVatImageUrl || authState.panVatImageUrl;
          if (currentPanVatUrl) {
            openImageViewer(currentPanVatUrl, 'PAN/VAT Document');
          }
        }}
        style={styles.logoBox} 
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {(panVatImageUrl || authState.panVatImageUrl) ? (
          <Image 
            source={{ uri: panVatImageUrl || authState.panVatImageUrl }} 
            style={styles.logo}
          />
        ) : (
          <Text style={styles.logoPlaceholder}>Pick PAN/VAT Image</Text>
        )}
      </TouchableOpacity>
      {canEdit && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => pickImage(setPanVatImageUrl, false)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Choose PAN/VAT Image</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pickFromCamera(setPanVatImageUrl, false)} style={styles.secondaryBtnAlt}>
            <Text style={styles.secondaryBtnAltText}>Use Camera</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.label}>Address (optional)</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        editable={canEdit}
        placeholder="Enter address"
        placeholderTextColor={'#FFFFFF'}
        multiline
      />

      <Text style={styles.label}>Contact Number (optional)</Text>
      <TextInput
        style={styles.input}
        value={contactNumber}
        onChangeText={setContactNumber}
        editable={canEdit}
        placeholder="Enter contact number"
        placeholderTextColor={'#FFFFFF'}
        keyboardType="phone-pad"
      />

      {canEdit && (
        <TouchableOpacity onPress={save} style={styles.saveBtn} disabled={loading}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      )}
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{viewingImageTitle}</Text>
              <TouchableOpacity onPress={closeImageViewer} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalImageContainer}>
              <Image
                source={{ uri: viewingImageUrl }}
                style={styles.modalImage}
                resizeMode="contain"
                onError={(error) => {
                  console.error('Modal image load error:', error.nativeEvent.error);
                  Alert.alert('Error', 'Failed to load image');
                }}
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={downloadImage} 
                style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="download" size={20} color="white" />
                )}
                <Text style={styles.downloadButtonText}>
                  {isDownloading ? 'Downloading...' : 'Download'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: { 
    color: colors.textSecondary, 
    fontSize: 16,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  label: { 
    color: colors.textPrimary, 
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm, 
    marginTop: spacing.lg,
  },
  helpText: { 
    color: colors.textSecondary, 
    fontSize: 13, 
    marginBottom: spacing.sm, 
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: 16,
    minHeight: 56,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  logoBox: {
    height: 120,
    width: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.outline,
    marginBottom: spacing.lg,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: { 
    height: 120, 
    width: 120, 
    borderRadius: 60,
    resizeMode: 'cover',
    backgroundColor: 'transparent'
  },
  logoPlaceholder: { 
    color: colors.textSecondary, 
    fontSize: 14, 
    textAlign: 'center', 
    paddingHorizontal: spacing.sm,
    fontWeight: '500',
  },
  previewSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  previewLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  logoPreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  logoPreviewPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.outline,
  },
  logoPreviewText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    margin: spacing.lg,
    maxWidth: Dimensions.get('window').width - spacing.xl,
    maxHeight: Dimensions.get('window').height - spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalImageContainer: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  modalImage: {
    width: Dimensions.get('window').width - spacing.xl * 2,
    height: 400,
    maxWidth: 400,
    maxHeight: 400,
  },
  modalActions: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  downloadButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveText: { 
    color: 'white', 
    fontWeight: '700',
    fontSize: 18,
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryBtnAlt: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryBtnText: { 
    color: colors.textPrimary, 
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryBtnAltText: { 
    color: 'white', 
    fontWeight: '600',
    fontSize: 14,
  },
  emailVerificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  emailVerificationText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  refreshButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  cachedIndicator: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});


