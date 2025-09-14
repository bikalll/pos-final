const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Optimize bundling performance
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Enable symlinks for better module resolution
config.resolver.enableSymlinks = true;

// Optimize asset handling
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Add custom resolver for better performance
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
