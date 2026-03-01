'use client';

import { useEffect } from 'react';

export default function TouchBlur() {
  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button')) {
        setTimeout(() => (target.closest('button') as HTMLElement)?.blur(), 100);
      }
    };
    document.addEventListener('touchend', handleTouch);
    return () => document.removeEventListener('touchend', handleTouch);
  }, []);

  return null;
}