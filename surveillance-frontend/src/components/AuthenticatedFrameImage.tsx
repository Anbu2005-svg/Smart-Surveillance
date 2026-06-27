import React, { useEffect, useRef, useState } from 'react';
import { detectionAPI } from '../services/api';

interface AuthenticatedFrameImageProps {
  src: string;
  alt: string;
  className?: string;
  refreshKey?: string | number;
  fallback?: React.ReactNode;
}

export const AuthenticatedFrameImage: React.FC<AuthenticatedFrameImageProps> = ({
  src,
  alt,
  className,
  refreshKey,
  fallback = null,
}) => {
  const [objectUrl, setObjectUrl] = useState('');
  const objectUrlRef = useRef('');

  useEffect(() => {
    let cancelled = false;

    if (!src) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
      setObjectUrl('');
      return;
    }

    detectionAPI
      .getFrameObjectUrl(src)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        const previousObjectUrl = objectUrlRef.current;
        objectUrlRef.current = url;
        setObjectUrl(url);
        if (previousObjectUrl) {
          URL.revokeObjectURL(previousObjectUrl);
        }
      })
      .catch(() => {
        if (!cancelled && !objectUrlRef.current) setObjectUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [src, refreshKey]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  if (!objectUrl) {
    return <>{fallback}</>;
  }

  return <img src={objectUrl} alt={alt} className={className} />;
};
