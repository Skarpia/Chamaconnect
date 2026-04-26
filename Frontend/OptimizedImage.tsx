'use client';

import { useState, useRef, useEffect } from 'react';
import { useIntersectionObserver } from 'react-intersection-observer';
import { useLiteMode } from '../contexts/LiteModeContext';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
}: OptimizedImageProps) {
  const { isLiteMode } = useLiteMode();
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use intersection observer for lazy loading
  const { ref, inView } = useIntersectionObserver({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px', // Start loading 50px before image enters viewport
  });

  // Combine refs
  const setRefs = (element: HTMLImageElement | null) => {
    ref(element);
    imgRef.current = element;
  };

  // Generate optimized image URLs
  const getOptimizedSrc = (originalSrc: string) => {
    if (isLiteMode) {
      // For lite mode, use smaller, more compressed versions
      return originalSrc.replace(/\.(jpg|jpeg|png)$/, '_small.webp');
    }
    
    // For normal mode, use WebP with multiple sizes
    return originalSrc.replace(/\.(jpg|jpeg|png)$/, '.webp');
  };

  const generateSrcset = (originalSrc: string) => {
    const baseUrl = originalSrc.replace(/\.(jpg|jpeg|png)$/, '');
    
    if (isLiteMode) {
      // Only provide small size for lite mode
      return `${baseUrl}_small.webp 400w`;
    }
    
    // Provide multiple sizes for responsive loading
    return [
      `${baseUrl}_small.webp 400w`,
      `${baseUrl}_medium.webp 800w`,
      `${baseUrl}_large.webp 1200w`,
      `${baseUrl}_xlarge.webp 1600w`,
    ].join(', ');
  };

  const optimizedSrc = getOptimizedSrc(src);
  const srcset = generateSrcset(src);

  // Load image immediately if priority or in view
  const shouldLoad = priority || inView;

  useEffect(() => {
    if (shouldLoad && imgRef.current && !isLoaded) {
      const img = imgRef.current;
      
      // Preload the image
      const preloadImg = new Image();
      preloadImg.onload = () => {
        setIsLoaded(true);
      };
      preloadImg.onerror = () => {
        setError(true);
      };
      
      if (isLiteMode) {
        preloadImg.src = optimizedSrc;
      } else {
        // Use srcset for better performance
        preloadImg.srcset = srcset;
        preloadImg.sizes = sizes;
      }
    }
  }, [shouldLoad, optimizedSrc, srcset, sizes, isLiteMode, isLoaded]);

  if (error) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center text-gray-500 ${className}`}
        style={{ width, height }}
      >
        <span className="text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading placeholder */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}
      
      {/* Optimized image */}
      <img
        ref={setRefs}
        src={shouldLoad ? optimizedSrc : undefined}
        srcSet={shouldLoad && !isLiteMode ? srcset : undefined}
        sizes={shouldLoad ? sizes : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
      />
      
      {/* Lite mode indicator */}
      {isLiteMode && isLoaded && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
          Lite
        </div>
      )}
    </div>
  );
}
