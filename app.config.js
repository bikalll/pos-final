import 'dotenv/config';

export default {
  expo: {
    name: "Arbi POS",
    slug: "rn-pos",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0f1115"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.rnpos",
      infoPlist: {
        NSBluetoothAlwaysUsageDescription: "This app uses Bluetooth to connect to printers",
        NSBluetoothPeripheralUsageDescription: "This app uses Bluetooth to connect to printers",
        NSCameraUsageDescription: "This app uses the camera to take photos for menu items",
        NSPhotoLibraryUsageDescription: "This app accesses your photo library to select images for menu items"
      }
    },
    android: {
      package: "com.yourcompany.rnpos",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0f1115"
      },
      edgeToEdgeEnabled: true,
      versionCode: 1,
      permissions: [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.CAMERA",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-sqlite",
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to let you share them with your friends.",
          cameraPermission: "The app accesses your camera to take photos with your friends."
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "8a3a9553-7e86-4d63-b689-b441723699b3"
      },
      enableBluetooth: process.env.EXPO_PUBLIC_ENABLE_BLUETOOTH === 'true',
      environment: process.env.EXPO_PUBLIC_ENV || 'development',
      disableUpdates: true,
      expoUpdates: {
        enabled: false
      }
    },
    runtimeVersion: "1.0.0",
    scheme: "rn-pos",
    platforms: [
      "android",
      "ios"
    ],
    assetBundlePatterns: [
      "**/*"
    ],
    jsEngine: "hermes",
    experiments: {
      tsconfigPaths: true
    }
  }
};
