'use client';

import React, { useState, useEffect } from 'react';
import { getAbsoluteImageUrl } from '@/lib/api';

// In-memory cache for detected image aspect ratios to prevent layout jumps on re-renders
const ratioCache = new Map<string, string>();

/**
 * Hook to resolve and cache natural image aspect ratio without cropping.
 */
export function useNaturalAspectRatio(imageUrl?: string | null, fallbackRatio: string = '2048/762') {
  const [aspectRatio, setAspectRatio] = useState<string>(() => {
    if (!imageUrl) return fallbackRatio;
    return ratioCache.get(imageUrl) || fallbackRatio;
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    if (!imageUrl) return false;
    return ratioCache.has(imageUrl);
  });

  useEffect(() => {
    if (!imageUrl) {
      setAspectRatio(fallbackRatio);
      return;
    }

    const cached = ratioCache.get(imageUrl);
    if (cached) {
      setAspectRatio(cached);
      setIsLoaded(true);
      return;
    }

    const fullUrl = getAbsoluteImageUrl(imageUrl);
    if (!fullUrl) return;

    const img = new Image();
    img.src = fullUrl;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        const ratio = `${img.naturalWidth}/${img.naturalHeight}`;
        ratioCache.set(imageUrl, ratio);
        setAspectRatio(ratio);
        setIsLoaded(true);
      }
    };
  }, [imageUrl, fallbackRatio]);

  const parts = aspectRatio.split('/');
  const ratioNumber = parts.length === 2 ? parseFloat(parts[0]) / parseFloat(parts[1]) : 2.687;

  return { aspectRatio, ratioNumber, isLoaded };
}

export interface PreservedBannerImageProps {
  src: string;
  mobileSrc?: string | null;
  alt?: string;
  className?: string;
  containerClassName?: string;
  aspectRatioFallback?: string;
  priority?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  backgroundColor?: string;
  children?: React.ReactNode;
  onDimensionsDetected?: (dim: {
    naturalWidth: number;
    naturalHeight: number;
    aspectRatio: number;
    cssRatio: string;
  }) => void;
}

/**
 * PreservedBannerImage — Guarantees complete original banner display with zero cropping,
 * zero artificial zoom, and full multi-device proportional scaling.
 */
export const PreservedBannerImage: React.FC<PreservedBannerImageProps> = ({
  src,
  mobileSrc,
  alt = 'Promotional Banner',
  className = '',
  containerClassName = '',
  aspectRatioFallback = '2048/762',
  priority = false,
  objectFit = 'contain',
  backgroundColor,
  children,
  onDimensionsDetected,
}) => {
  const [detectedRatio, setDetectedRatio] = useState<string>(() => {
    return ratioCache.get(src) || aspectRatioFallback;
  });

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      const cssRatio = `${naturalWidth}/${naturalHeight}`;
      ratioCache.set(src, cssRatio);
      setDetectedRatio(cssRatio);
      if (onDimensionsDetected) {
        onDimensionsDetected({
          naturalWidth,
          naturalHeight,
          aspectRatio: naturalWidth / naturalHeight,
          cssRatio,
        });
      }
    }
  };

  const desktopUrl = getAbsoluteImageUrl(src);
  const mobileUrl = mobileSrc ? getAbsoluteImageUrl(mobileSrc) : null;

  return (
    <div
      className={`relative w-full overflow-hidden select-none ${containerClassName}`}
      style={{
        aspectRatio: detectedRatio,
        backgroundColor: backgroundColor || 'transparent',
      }}
    >
      {/* Complete Image Element with proportional scaling */}
      <picture className="w-full h-full block">
        {mobileUrl && mobileUrl !== desktopUrl && (
          <source media="(max-width: 639px)" srcSet={mobileUrl} />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={desktopUrl}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleImageLoad}
          className={`w-full h-full object-${objectFit} object-center block select-none pointer-events-none ${className}`}
        />
      </picture>

      {/* Overlay Canvas or Children pinned exactly to image bounds */}
      {children && (
        <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
};

export default PreservedBannerImage;
