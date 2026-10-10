import { useState, useEffect } from 'react';

export interface ResponsiveState {
  isMobile: boolean; // < 768px
  isTablet: boolean; // >= 768px && < 1024px
  isDesktop: boolean; // >= 1024px
  width: number;
  height: number;
  isTouch: boolean;
}

/**
 * useResponsive Hook
 * Provides device viewport detection adhering to the LMS Design Guidelines:
 * - Desktop: >= 1024px
 * - Tablet: 768px ~ 1023px
 * - Mobile: < 768px
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    const isClient = typeof window !== 'undefined';
    const width = isClient ? window.innerWidth : 1200;
    const height = isClient ? window.innerHeight : 800;
    const isTouch = isClient
      ? 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
      : false;
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      width,
      height,
      isTouch: Boolean(isTouch),
    };
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isTouch =
          'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        setState({
          isMobile: width < 768,
          isTablet: width >= 768 && width < 1024,
          isDesktop: width >= 1024,
          width,
          height,
          isTouch: Boolean(isTouch),
        });
      }, 50);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return state;
}

export default useResponsive;
