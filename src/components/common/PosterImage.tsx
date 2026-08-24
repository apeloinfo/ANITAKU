import React, { useState, useEffect, useRef } from 'react';
import { isImagePreloaded, markImageLoaded } from '../../services/cacheService';

export interface PosterImageProps {
  src: string;
  alt: string;
  className?: string; // Container classes (e.g. "aspect-[2/3] rounded-2xl")
  imgClassName?: string; // Image classes (e.g. "group-hover:scale-[1.03]")
  containerClassName?: string;
  children?: React.ReactNode; // Overlays (e.g. Score badge, Episode pill, Heart count)
  loading?: 'lazy' | 'eager';
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const PosterImage: React.FC<PosterImageProps> = ({
  src,
  alt,
  className = '',
  imgClassName = '',
  containerClassName = '',
  children,
  loading = 'lazy',
  referrerPolicy = 'no-referrer',
  onClick,
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(() => isImagePreloaded(src));
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Synchronously check if image is already cached or loaded in browser memory
  useEffect(() => {
    if (isImagePreloaded(src)) {
      setIsLoaded(true);
      setIsError(false);
      return;
    }

    setIsLoaded(false);
    setIsError(false);

    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      markImageLoaded(src);
      setIsLoaded(true);
    }
  }, [src]);

  const handleLoad = () => {
    markImageLoaded(src);
    setIsLoaded(true);
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-[#1e232a] border border-white/5 ${className} ${containerClassName}`}
    >
      {/* 1. SKELETON / MATTE BOX PLACEHOLDER (Solid matte slate #1e232a, zero shimmer, zero gradient shine) */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-[#1e232a] z-0 pointer-events-none" />
      )}

      {/* 2. REAL POSTER IMAGE (Smooth opacity-0 to opacity-100 duration-300 transition on load) */}
      {!isError ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={loading}
          referrerPolicy={referrerPolicy}
          onLoad={handleLoad}
          onError={() => setIsError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#1e232a] text-neutral-500 text-[10px] p-2 text-center select-none">
          {alt}
        </div>
      )}

      {/* 3. OVERLAYS (Scores, badges, tags) - Rendered immediately on top without waiting */}
      {children && <div className="absolute inset-0 pointer-events-none z-10">{children}</div>}
    </div>
  );
};

