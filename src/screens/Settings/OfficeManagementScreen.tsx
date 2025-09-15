import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { colors, spacing, radius } from '../../theme';
import { createFirestoreService } from '../../services/firestoreService';
import { setLogoUrl as setAuthLogoUrl } from '../../redux/slices/authSlice';

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
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const restaurantId = useSelector((s: RootState) => s.auth.restaurantId);
  const role = useSelector((s: RootState) => s.auth.role);
  const authUserName = useSelector((s: RootState) => s.auth.userName);

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [panVat, setPanVat] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [panVatImageUrl, setPanVatImageUrl] = useState<string | undefined>(undefined);
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const canEdit = role === 'Owner';

  useEffect(() => {
    const load = async () => {
      if (!restaurantId) return;
      try {
        const fs = createFirestoreService(restaurantId);
        const info = await fs.getRestaurantInfo();
        if (info) {
          setName(info.name || '');
          setOwnerName((info.ownerName || authUserName || '').toString());
          setPanVat(info.panVat || info.pan || info.vat || '');
          setLogoUrl(info.logoUrl || undefined);
          setPanVatImageUrl(info.panVatImageUrl || undefined);
          setAddress(info.address || '');
          setContactNumber(info.contactNumber || info.phone || '');
        }
      } catch (e) {
        console.warn('Office load failed', (e as Error).message);
      }
    };
    load();
  }, [restaurantId]);

  const pickImage = async (onPicked: (url: string) => void) => {
    console.log('📷 pickImage pressed. canEdit:', canEdit);
    if (!canEdit) {
      Alert.alert('View only', 'Only owners can change images.');
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
          console.log('📷 Converting selected image to base64...');
          const base64 = await ensureBase64FromAsset(result.assets[0]);
          const url = await uploadToImgbbBase64(base64);
          onPicked(url);
          // update auth logo immediately for drawer
          dispatch(setAuthLogoUrl(url));
          console.log('📷 Upload success. URL:', url);
        } catch (e) {
          console.error('📷 Upload error:', e);
          Alert.alert('Upload failed', (e as Error).message || 'Failed to upload image. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('📷 Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const pickFromCamera = async (onPicked: (url: string) => void) => {
    console.log('📷 pickFromCamera pressed. canEdit:', canEdit);
    if (!canEdit) {
      Alert.alert('View only', 'Only owners can take images.');
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
          console.log('📷 Converting camera image to base64...');
          const base64 = await ensureBase64FromAsset(result.assets[0]);
          const url = await uploadToImgbbBase64(base64);
          onPicked(url);
          dispatch(setAuthLogoUrl(url));
          console.log('📷 Upload success (camera). URL:', url);
        } catch (e) {
          console.error('📷 Upload error:', e);
          Alert.alert('Upload failed', (e as Error).message || 'Failed to upload image. Please try again.');
        } finally {
          setLoading(false);
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
      await fs.createRestaurant({
        name: name.trim(),
        ownerName: ownerName.trim(),
        panVat: panVat.trim(),
        logoUrl: logoUrl || null,
        panVatImageUrl: panVatImageUrl || null,
        address: address.trim(),
        contactNumber: contactNumber.trim(),
      });
      Alert.alert('Saved', 'Office details updated');
    } catch (e) {
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

      <TouchableOpacity onPress={() => pickImage(setLogoUrl)} style={styles.logoBox} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={styles.logoPlaceholder}>Pick Logo</Text>
        )}
      </TouchableOpacity>
      {canEdit && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.sm }}>
          <TouchableOpacity onPress={() => pickImage(setLogoUrl)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Choose Logo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pickFromCamera(setLogoUrl)} style={styles.secondaryBtnAlt}>
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
      <TouchableOpacity onPress={() => pickImage(setPanVatImageUrl)} style={styles.logoBox} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        {panVatImageUrl ? (
          <Image source={{ uri: panVatImageUrl }} style={styles.logo} />
        ) : (
          <Text style={styles.logoPlaceholder}>Pick PAN/VAT Image</Text>
        )}
      </TouchableOpacity>
      {canEdit && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => pickImage(setPanVatImageUrl)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Choose PAN/VAT Image</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pickFromCamera(setPanVatImageUrl)} style={styles.secondaryBtnAlt}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },
  label: { color: colors.textPrimary, marginBottom: 6, marginTop: spacing.md },
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
  logo: { height: 96, width: 96, borderRadius: 48 },
  logoPlaceholder: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', paddingHorizontal: spacing.xs },
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


