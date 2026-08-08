import { useState, useEffect, useCallback } from 'react';

export type HomeScreenStatus = 'added' | 'missed' | 'unknown' | 'unsupported' | 'loading';

export const useHomeScreenShortcut = () => {
  const [status, setStatus] = useState<HomeScreenStatus>('loading');

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    
    // Check if we are in Telegram and the required methods exist
    if (!tg || typeof tg.checkHomeScreenStatus !== 'function' || typeof tg.addToHomeScreen !== 'function') {
      setStatus('unsupported');
      return;
    }

    const handleStatusChecked = (event: any) => {
       // event: { status: "added" | "missed" | "unknown" | "unsupported" }
       if (event && event.status) {
         setStatus(event.status);
       }
    };

    const handleAdded = () => {
       setStatus('added');
    };

    // Add event listeners
    if (typeof tg.onEvent === 'function') {
      tg.onEvent('homeScreenChecked', handleStatusChecked);
      tg.onEvent('homeScreenAdded', handleAdded);
    }

    // Trigger the status check
    try {
      tg.checkHomeScreenStatus();
    } catch (e) {
      console.error('Error checking home screen status', e);
      setStatus('unsupported');
    }

    return () => {
      if (typeof tg.offEvent === 'function') {
        tg.offEvent('homeScreenChecked', handleStatusChecked);
        tg.offEvent('homeScreenAdded', handleAdded);
      }
    };
  }, []);

  const addToHomeScreen = useCallback(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.addToHomeScreen === 'function') {
      try {
        tg.addToHomeScreen();
      } catch (e) {
        console.error('Error adding to home screen', e);
      }
    }
  }, []);

  return { status, addToHomeScreen };
};
