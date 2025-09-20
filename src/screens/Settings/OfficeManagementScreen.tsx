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

const IMGBB_API_KEY = 'ff7e9b429a79828004e588b651c7e041';

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
  
  // Debug: Log when panVatImageUrl changes
  useEffect(() => {
    console.log('🔄 PAN/VAT URL state changed to:', panVatImageUrl);
    console.log('🔄 PAN/VAT URL change stack trace:', new Error().stack);
    console.log('🔄 isUpdatingPanVat flag:', isUpdatingPanVat);
  }, [panVatImageUrl, isUpdatingPanVat]);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string>('');
  const [viewingImageTitle, setViewingImageTitle] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  const canEdit = role === 'Owner' || role === 'Manager';

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

  // Debug: Log auth state (moved to useEffect to prevent infinite re-renders)
  const authState = useSelector((s: RootState) => s.auth);

  // Debug: Log auth state changes
  useEffect(() => {
    console.log('🔍 Office Management - Auth state:', {
      logoUrl: authState.logoUrl,
      restaurantId: authState.restaurantId,
      role: authState.role
    });
    console.log('🔍 Office Management - Local state:', {
      localLogoUrl: logoUrl,
      localPanVatImageUrl: panVatImageUrl
    });
    console.log('🔍 Office Management - State comparison:', {
      authLogoUrl: authState.logoUrl,
      localLogoUrl: logoUrl,
      localPanVatImageUrl: panVatImageUrl,
      areEqual: authState.logoUrl === logoUrl
    });
  }, [authState.logoUrl, authState.restaurantId, authState.role, logoUrl, panVatImageUrl]);

  // Sync logo from Redux state when it changes (e.g., after login)
  useEffect(() => {
    if (authState.logoUrl && !logoUrl) {
      console.log('🔍 Syncing logo from Redux state:', authState.logoUrl);
      setLogoUrl(authState.logoUrl);
    }
  }, [authState.logoUrl]); // Removed logoUrl from dependencies to prevent infinite loop

  // Sync PAN/VAT image from Redux state when it changes (e.g., after login)
  useEffect(() => {
    if (authState.panVatImageUrl && panVatImageUrl !== authState.panVatImageUrl && !isUpdatingPanVat) {
      console.log('🔍 Syncing PAN/VAT image from Redux state:', authState.panVatImageUrl);
      console.log('🔍 Current local PAN/VAT state:', panVatImageUrl);
      setPanVatImageUrl(authState.panVatImageUrl);
    }
  }, [authState.panVatImageUrl, isUpdatingPanVat]); // Added isUpdatingPanVat to prevent conflicts

  // Initial sync from Redux state on component mount
  useEffect(() => {
    if (authState.panVatImageUrl && !panVatImageUrl && !isUpdatingPanVat) {
      console.log('🔍 Initial sync PAN/VAT image from Redux state:', authState.panVatImageUrl);
      setPanVatImageUrl(authState.panVatImageUrl);
    }
  }, []); // Run only on mount

  // Load PAN/VAT image when restaurantId changes (e.g., after login)
  useEffect(() => {
    if (restaurantId && hasLoadedInitialData) {
      console.log('🔍 Restaurant ID changed, reloading PAN/VAT image...');
      console.log('🔍 Current PAN/VAT state:', panVatImageUrl);
      const fsSvc = createFirestoreService(restaurantId);
      fsSvc.getRestaurantInfo().then(info => {
        console.log('🔍 Firestore PAN/VAT data:', info?.panVatImageUrl);
        if (info && info.panVatImageUrl) {
          console.log('🔍 Reloading PAN/VAT image from Firestore:', info.panVatImageUrl);
          setPanVatImageUrl(info.panVatImageUrl);
        } else {
          console.log('🔍 No PAN/VAT image in Firestore, setting to undefined');
          setPanVatImageUrl(undefined);
        }
      }).catch(e => console.warn('PAN/VAT reload failed', (e as Error).message));
    }
  }, [restaurantId, hasLoadedInitialData]); // Removed panVatImageUrl from dependencies to prevent infinite loop

  useEffect(() => {
    if (!restaurantId || hasLoadedInitialData) return;
    
    const fsSvc = createFirestoreService(restaurantId);

    // Initial load
    fsSvc.getRestaurantInfo().then(info => {
      console.log('🔍 Office Management - Loaded restaurant info:', info);
      if (info) {
        setName(info.name || '');
        setOwnerName((info.ownerName || authUserName || '').toString());
        setPanVat(info.panVat || info.pan || info.vat || '');
        console.log('🔍 Setting logoUrl to:', info.logoUrl);
        console.log('🔍 Setting panVatImageUrl to:', info.panVatImageUrl);
        console.log('🔍 PAN/VAT image URL details:', {
          exists: !!info.panVatImageUrl,
          length: info.panVatImageUrl?.length,
          startsWith: info.panVatImageUrl?.substring(0, 20)
        });
        
        // Set logo URL from Firestore, or fall back to Redux state
        const logoToSet = info.logoUrl || authState.logoUrl;
        setLogoUrl(logoToSet);
        console.log('🔍 Logo URL set to:', logoToSet, '(from Firestore:', !!info.logoUrl, ', from Redux:', !!authState.logoUrl, ')');
        
        // Set PAN/VAT image URL from Firestore, or fall back to Redux state
        const panVatToSet = info.panVatImageUrl || authState.panVatImageUrl;
        setPanVatImageUrl(panVatToSet);
        console.log('🔍 PAN/VAT image URL set to:', panVatToSet, '(from Firestore:', !!info.panVatImageUrl, ', from Redux:', !!authState.panVatImageUrl, ')');
        setAddress(info.address || '');
        setContactNumber(info.contactNumber || info.phone || '');
        setHasLoadedInitialData(true);
        console.log('🔍 Initial data loaded, flag set to true');
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
    console.log('📷 pickImage pressed. canEdit:', canEdit, 'isLogo:', isLogo);
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
          console.log('📷 Converting selected image to base64...');
          const base64 = await ensureBase64FromAsset(result.assets[0]);
          const url = await uploadToImgbbBase64(base64);
          console.log('📷 Upload success. URL:', url);
          console.log('📷 URL length:', url.length);
          console.log('📷 URL starts with:', url.substring(0, 20));
          console.log('📷 URL ends with:', url.substring(url.length - 20));
          onPicked(url);
          // Update Redux state based on image type
          if (isLogo) {
            dispatch({ type: 'auth/setLogoUrl', payload: url });
            console.log('📷 Logo updated in Redux state');
          } else {
            dispatch({ type: 'auth/setPanVatImageUrl', payload: url });
            console.log('📷 PAN/VAT image updated in Redux state');
          }
          // Show success feedback
          const imageType = isLogo ? 'Logo' : 'PAN/VAT image';
          Alert.alert('Success', `${imageType} selected successfully! You can see it in the circle above.`);
        } catch (e) {
          console.error('📷 Upload error:', e);
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
    console.log('📷 pickFromCamera pressed. canEdit:', canEdit, 'isLogo:', isLogo);
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
          console.log('📷 Converting camera image to base64...');
          const base64 = await ensureBase64FromAsset(result.assets[0]);
          const url = await uploadToImgbbBase64(base64);
          console.log('📷 Camera upload success. URL:', url);
          console.log('📷 Camera URL length:', url.length);
          console.log('📷 Camera URL starts with:', url.substring(0, 20));
          console.log('📷 Camera URL ends with:', url.substring(url.length - 20));
          onPicked(url);
          // Update Redux state based on image type
          if (isLogo) {
            dispatch({ type: 'auth/setLogoUrl', payload: url });
            console.log('📷 Logo updated in Redux state');
          } else {
            dispatch({ type: 'auth/setPanVatImageUrl', payload: url });
            console.log('📷 PAN/VAT image updated in Redux state');
          }
          // Show success feedback
          const imageType = isLogo ? 'Logo' : 'PAN/VAT image';
          Alert.alert('Success', `${imageType} captured successfully! You can see it in the circle above.`);
        } catch (e) {
          console.error('📷 Upload error:', e);
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
      console.log('🔍 Office Management - Saving data:', saveData);
      await fs.createRestaurant(saveData);
      console.log('🔍 Office Management - Save successful');
      
      // Update Redux state with the new logo URL
      if (logoUrl) {
        dispatch({ type: 'auth/setLogoUrl', payload: logoUrl });
        console.log('🔍 Office Management - Updated Redux logoUrl:', logoUrl);
      }
      
      // Update Redux state with the new PAN/VAT image URL
      if (panVatImageUrl) {
        dispatch({ type: 'auth/setPanVatImageUrl', payload: panVatImageUrl });
        console.log('🔍 Office Management - Updated Redux panVatImageUrl:', panVatImageUrl);
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
                onLoad={() => {
                  console.log('📷 Logo preview loaded successfully:', logoUrl || authState.logoUrl);
                  console.log('📷 Preview image should be 60x60');
                  console.log('📷 Preview using URL from:', logoUrl ? 'local state' : 'auth state');
                }}
                onError={(error) => {
                  console.error('📷 Logo preview load error:', error.nativeEvent.error);
                  console.error('📷 Preview URL that failed:', logoUrl || authState.logoUrl);
                }}
                onLoadStart={() => console.log('📷 Logo preview loading started...')}
                onLoadEnd={() => console.log('📷 Logo preview loading ended')}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.logoPreviewPlaceholder}>
              <Text style={styles.logoPreviewText}>No logo set</Text>
            </View>
          )}
        </View>
      </View>

      {/* Debug info - enhanced to debug image display issues */}
      {__DEV__ && (
        <View style={{ backgroundColor: colors.surface, padding: 8, marginBottom: 8, borderRadius: 4 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
            Debug: Local logoUrl={logoUrl ? 'Set' : 'Not set'}, Auth logoUrl={authState.logoUrl ? 'Set' : 'Not set'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
            Local Logo URL: {logoUrl ? logoUrl.substring(0, 30) + '...' : 'None'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
            Auth Logo URL: {authState.logoUrl ? authState.logoUrl.substring(0, 30) + '...' : 'None'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
            PAN/VAT URL: {panVatImageUrl ? panVatImageUrl.substring(0, 30) + '...' : 'None'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
            Redux PAN/VAT URL: {authState.panVatImageUrl ? authState.panVatImageUrl.substring(0, 30) + '...' : 'None'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
            Loading: {loading ? 'Yes' : 'No'}, Updating: {isUpdatingImage ? 'Yes' : 'No'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
            <TouchableOpacity 
              onPress={() => {
                console.log('🧪 Testing with sample image URL...');
                setLogoUrl('https://via.placeholder.com/96x96/ff6b35/ffffff?text=TEST');
              }}
              style={{ backgroundColor: colors.primary, padding: 4, borderRadius: 4, flex: 1 }}
            >
              <Text style={{ color: 'white', fontSize: 10, textAlign: 'center' }}>Test Sample</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                console.log('🔄 Syncing local state with auth state...');
                if (authState.logoUrl) {
                  setLogoUrl(authState.logoUrl);
                  console.log('🔄 Synced logo URL from auth state:', authState.logoUrl);
                }
                if (authState.panVatImageUrl) {
                  setPanVatImageUrl(authState.panVatImageUrl);
                  console.log('🔄 Synced PAN/VAT URL from auth state:', authState.panVatImageUrl);
                }
              }}
              style={{ backgroundColor: colors.surface2, padding: 4, borderRadius: 4, flex: 1 }}
            >
              <Text style={{ color: 'white', fontSize: 10, textAlign: 'center' }}>Sync Auth</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
            <TouchableOpacity 
              onPress={() => {
                console.log('🧪 Testing PAN/VAT with sample image URL...');
                console.log('🧪 Setting panVatImageUrl to test URL');
                setPanVatImageUrl('https://via.placeholder.com/96x96/4CAF50/ffffff?text=PAN');
                console.log('🧪 PAN/VAT test URL set, should appear in circle');
              }}
              style={{ backgroundColor: colors.primary, padding: 4, borderRadius: 4, flex: 1 }}
            >
              <Text style={{ color: 'white', fontSize: 10, textAlign: 'center' }}>Test PAN/VAT</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                console.log('🔄 Reloading restaurant info...');
                setHasLoadedInitialData(false); // Reset flag to allow reload
                if (restaurantId) {
                  const fsSvc = createFirestoreService(restaurantId);
                  fsSvc.getRestaurantInfo().then(info => {
                    console.log('🔄 Reloaded restaurant info:', info);
                    if (info) {
                      setLogoUrl(info.logoUrl || undefined);
                      setPanVatImageUrl(info.panVatImageUrl || undefined);
                      console.log('🔄 Reloaded logoUrl:', info.logoUrl);
                      console.log('🔄 Reloaded panVatImageUrl:', info.panVatImageUrl);
                    }
                    setHasLoadedInitialData(true);
                  }).catch(e => console.error('🔄 Reload failed:', e));
                }
              }}
              style={{ backgroundColor: colors.surface2, padding: 4, borderRadius: 4, flex: 1 }}
            >
              <Text style={{ color: 'white', fontSize: 10, textAlign: 'center' }}>Reload Data</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
            <TouchableOpacity onPress={() => {
              if (restaurantId) {
                const fsSvc = createFirestoreService(restaurantId);
                fsSvc.getRestaurantInfo().then(info => {
                  console.log('🧪 Manual PAN/VAT reload:', info?.panVatImageUrl);
                  setPanVatImageUrl(info?.panVatImageUrl || undefined);
                }).catch(e => console.error('🧪 Manual PAN/VAT reload failed:', e));
              }
            }}>
              <Text>Reload PAN/VAT</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPanVatImageUrl(undefined)}>
              <Text>Clear PAN/VAT</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              console.log('🔄 Manual sync from Redux state...');
              console.log('🔄 Redux PAN/VAT URL:', authState.panVatImageUrl);
              console.log('🔄 Local PAN/VAT URL:', panVatImageUrl);
              if (authState.panVatImageUrl) {
                setPanVatImageUrl(authState.panVatImageUrl);
                console.log('🔄 Synced PAN/VAT from Redux state');
              }
            }}>
              <Text>Sync Redux</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
            onLoad={() => {
              console.log('📷 Logo image loaded successfully:', logoUrl || authState.logoUrl);
              console.log('📷 Logo image dimensions should be 96x96');
              console.log('📷 Using URL from:', logoUrl ? 'local state' : 'auth state');
            }}
            onError={(error) => {
              console.error('📷 Logo image load error:', error.nativeEvent.error);
              console.error('📷 Logo URL that failed:', logoUrl || authState.logoUrl);
              console.error('📷 Logo URL length:', (logoUrl || authState.logoUrl)?.length);
              console.error('📷 Logo URL starts with:', (logoUrl || authState.logoUrl)?.substring(0, 20));
            }}
            onLoadStart={() => console.log('📷 Logo image loading started...')}
            onLoadEnd={() => console.log('📷 Logo image loading ended')}
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
            <Text style={styles.secondaryBtnText}>Use Camera</Text>
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
            style={[styles.logo, { borderWidth: 2, borderColor: 'red' }]} // Add red border for debugging
            onLoad={() => {
              console.log('📷 PAN/VAT image loaded successfully:', panVatImageUrl || authState.panVatImageUrl);
              console.log('📷 PAN/VAT image dimensions should be 96x96');
              console.log('📷 Using URL from:', panVatImageUrl ? 'local state' : 'Redux state');
            }}
            onError={(error) => {
              console.error('📷 PAN/VAT image load error:', error.nativeEvent.error);
              console.error('📷 PAN/VAT URL that failed:', panVatImageUrl || authState.panVatImageUrl);
              console.error('📷 PAN/VAT URL length:', (panVatImageUrl || authState.panVatImageUrl)?.length);
              console.error('📷 PAN/VAT URL starts with:', (panVatImageUrl || authState.panVatImageUrl)?.substring(0, 20));
            }}
            onLoadStart={() => console.log('📷 PAN/VAT image loading started...')}
            onLoadEnd={() => console.log('📷 PAN/VAT image loading ended')}
          />
        ) : (
          <Text style={styles.logoPlaceholder}>Pick PAN/VAT Image</Text>
        )}
      </TouchableOpacity>
      
      {/* Debug PAN/VAT Image State */}
      {__DEV__ && (
        <View style={{ backgroundColor: colors.surface2, padding: 4, marginBottom: 8, borderRadius: 4 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 8 }}>
            PAN/VAT Debug: {panVatImageUrl ? 'URL SET' : 'NO URL'} | Length: {panVatImageUrl?.length || 0}
          </Text>
          {panVatImageUrl && (
            <Text style={{ color: colors.textSecondary, fontSize: 8 }}>
              URL: {panVatImageUrl.substring(0, 40)}...
            </Text>
          )}
          <TouchableOpacity 
            onPress={() => {
              console.log('🧪 Testing PAN/VAT with known working URL...');
              setPanVatImageUrl('https://via.placeholder.com/96x96/4CAF50/ffffff?text=PAN');
            }}
            style={{ backgroundColor: colors.primary, padding: 2, borderRadius: 2, marginTop: 2 }}
          >
            <Text style={{ color: 'white', fontSize: 8, textAlign: 'center' }}>Test PAN/VAT Image</Text>
          </TouchableOpacity>
        </View>
      )}
      {canEdit && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => pickImage(setPanVatImageUrl, false)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Choose PAN/VAT Image</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pickFromCamera(setPanVatImageUrl, false)} style={styles.secondaryBtnAlt}>
            <Text style={styles.secondaryBtnText}>Use Camera</Text>
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
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },
  label: { color: colors.textPrimary, marginBottom: 6, marginTop: spacing.md },
  helpText: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.sm, fontStyle: 'italic' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  logoBox: {
    height: 96,
    width: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: spacing.md,
  },
  logo: { 
    height: 96, 
    width: 96, 
    borderRadius: 48,
    resizeMode: 'cover',
    backgroundColor: 'transparent'
  },
  logoPlaceholder: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', paddingHorizontal: spacing.xs },
  previewSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  logoPreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    resizeMode: 'cover',
  },
  logoPreviewPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  logoPreviewText: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
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
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveText: { color: 'white', fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  secondaryBtnAlt: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.textPrimary, fontWeight: '500' },
});


