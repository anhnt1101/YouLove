import React, { useState, useRef, useEffect } from 'react';

interface ScaledAvatarProps {
  src: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

export const ScaledAvatar: React.FC<ScaledAvatarProps> = ({
  src,
  scale,
  offsetX,
  offsetY,
  className = "",
  alt = "Avatar",
  onClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(80); // Default to 80px

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use contentRect width or borderBoxSize to know the actual layout size
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Check if this is a pre-cropped image (no-transform fallback)
  const isPreCropped = scale === 1.0 && offsetX === 0 && offsetY === 0;

  if (isPreCropped) {
    return (
      <div 
        ref={containerRef}
        onClick={onClick}
        className={`relative overflow-hidden rounded-full flex items-center justify-center select-none ${className}`}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // The GestureImageEditor uses a clipping area of radius 120px, which is a diameter of 240px.
  // We scale down the 240px editor space to match the actual layout bounds of this container.
  const scaleFactor = containerWidth / 240;

  return (
    <div 
      ref={containerRef}
      onClick={onClick}
      className={`relative overflow-hidden rounded-full flex items-center justify-center select-none ${className}`}
    >
      <div 
        style={{
          position: 'absolute',
          width: '240px',
          height: '240px',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scaleFactor})`,
          transformOrigin: 'center center',
        }} 
        className="flex items-center justify-center pointer-events-none"
      >
        <img
          src={src}
          alt={alt}
          style={{
            transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`,
            maxWidth: '1200px', // Exact parity with GestureImageEditor
            maxHeight: '85vh',  // Exact parity with GestureImageEditor
            objectFit: 'contain',
          }}
          className="pointer-events-none max-w-none origin-center"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};
