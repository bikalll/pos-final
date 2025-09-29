import React, { useState, useEffect, useRef } from 'react';
import { Image, View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface LazyImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  style?: any;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = '',
  width = 100,
  height = 100,
  style,
  placeholder,
  onLoad,
  onError,
  threshold = 0.1
}) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const imageRef = useRef<View>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    if (!src) return;
    
    // Create intersection observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold }
    );
    
    if (imageRef.current) {
      observer.observe(imageRef.current);
      observerRef.current = observer;
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, threshold]);
  
  useEffect(() => {
    if (inView && !loaded && !loading && !error) {
      setLoading(true);
      
      // Preload image
      const img = new Image();
      
      img.onload = () => {
        setLoaded(true);
        setLoading(false);
        onLoad?.();
      };
      
      img.onerror = () => {
        setError(true);
        setLoading(false);
        onError?.();
      };
      
      img.src = src;
    }
  }, [inView, loaded, loading, error, src, onLoad, onError]);
  
  const renderPlaceholder = () => {
    if (placeholder) return placeholder;
    
    return (
      <View style={[styles.placeholder, { width, height }]}>
        <ActivityIndicator size="small" color="#666" />
        <Text style={styles.placeholderText}>Loading...</Text>
      </View>
    );
  };
  
  const renderError = () => (
    <View style={[styles.error, { width, height }]}>
      <Text style={styles.errorText}>Failed to load</Text>
    </View>
  );
  
  if (error) {
    return renderError();
  }
  
  if (!inView || loading) {
    return (
      <View ref={imageRef} style={[{ width, height }, style]}>
        {renderPlaceholder()}
      </View>
    );
  }
  
  if (loaded) {
    return (
      <Image
        source={{ uri: src }}
        style={[{ width, height }, style]}
        alt={alt}
        resizeMode="cover"
      />
    );
  }
  
  return (
    <View ref={imageRef} style={[{ width, height }, style]}>
      {renderPlaceholder()}
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  placeholderText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  error: {
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
  },
});

export default LazyImage;
