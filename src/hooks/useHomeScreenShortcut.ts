import { useState, useEffect, useCallback, useRef } from 'react';
import { triggerHaptic } from '../lib/telegram';

export type HomeScreenStatus = 'added' | 'missed' | 'unknown' | 'unsupported' | 'loading';

const VERIFIED_STORAGE_KEY = 'grmf_homescreen_verified_v2';
const SESSION_DISMISSED_KEY = 'grmf_homescreen_dismissed_session';

export const useHomeScreenShortcut = () => {
  const [status, setStatus] = useState<HomeScreenStatus>('loading');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [justVerified, setJustVerified] = useState(false);
  const [isDismissedForSession, setIsDismissedForSession] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true';
    } catch (e) {
      return false;
    }
  });

  const verifyTimeoutRef = useRef<number | null>(null);

  const applyCheckedStatus = useCallback((rawStatus: string | undefined | null) => {
    if (!rawStatus) return;

    if (rawStatus === 'added') {
      // OS / Telegram confirmed the shortcut is currently on the Home Screen
      try {
        localStorage.setItem(VERIFIED_STORAGE_KEY, 'added');
      } catch (e) {}
      setStatus('added');
      setIsVerifying(false);
      setVerificationError(null);
      return;
    }

    if (rawStatus === 'missed') {
      // OS / Telegram confirmed the shortcut is NOT on the Home Screen (never added OR deleted by user!)
      try {
        localStorage.removeItem(VERIFIED_STORAGE_KEY);
        sessionStorage.removeItem(SESSION_DISMISSED_KEY);
      } catch (e) {}
      setIsDismissedForSession(false);
      setStatus('missed');
      return;
    }

    if (rawStatus === 'unknown') {
      // Device supports addToHomeScreen, but OS doesn't query existing icons directly;
      // check if we previously received the official 'homeScreenAdded' event.
      let wasAdded = false;
      try {
        wasAdded = localStorage.getItem(VERIFIED_STORAGE_KEY) === 'added';
      } catch (e) {}
      setStatus(wasAdded ? 'added' : 'unknown');
      return;
    }

    if (rawStatus === 'unsupported') {
      let wasAdded = false;
      try {
        wasAdded = localStorage.getItem(VERIFIED_STORAGE_KEY) === 'added';
      } catch (e) {}
      setStatus(wasAdded ? 'added' : 'unsupported');
    }
  }, []);

  const checkStatusNow = useCallback(() => {
    const tg = (window as any).Telegram?.WebApp;

    // Check if running as installed standalone PWA
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)')?.matches ||
        (window.navigator as any)?.standalone === true)
    ) {
      applyCheckedStatus('added');
      return;
    }

    if (!tg) {
      applyCheckedStatus('unknown');
      return;
    }

    if (typeof tg.checkHomeScreenStatus === 'function') {
      try {
        tg.checkHomeScreenStatus((cbStatus?: string) => {
          if (cbStatus) {
            applyCheckedStatus(cbStatus);
          }
        });
      } catch (e) {
        applyCheckedStatus('unknown');
      }
    } else if ((window as any).TelegramWebviewProxy?.postEvent) {
      try {
        (window as any).TelegramWebviewProxy.postEvent('web_app_check_home_screen', JSON.stringify({}));
      } catch (e) {
        applyCheckedStatus('unknown');
      }
    } else {
      applyCheckedStatus('unknown');
    }
  }, [applyCheckedStatus]);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;

    const handleStatusChecked = (event: any) => {
      const resolved = typeof event === 'string' ? event : event?.status;
      if (resolved) {
        applyCheckedStatus(resolved);
      }
    };

    const handleAdded = () => {
      if (verifyTimeoutRef.current) {
        window.clearTimeout(verifyTimeoutRef.current);
        verifyTimeoutRef.current = null;
      }
      try {
        localStorage.setItem(VERIFIED_STORAGE_KEY, 'added');
      } catch (e) {}
      triggerHaptic('success');
      setIsVerifying(false);
      setVerificationError(null);
      setJustVerified(true);
      setStatus('added');
    };

    if (tg && typeof tg.onEvent === 'function') {
      tg.onEvent('homeScreenChecked', handleStatusChecked);
      tg.onEvent('homeScreenAdded', handleAdded);
      tg.onEvent('activated', checkStatusNow);
    }

    // Re-verify whenever user returns to the Mini App from their phone's Home Screen
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatusNow();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkStatusNow);

    // Initial check on app launch
    checkStatusNow();

    // Fallback timeout in case older Telegram client doesn't fire callback on checkHomeScreenStatus
    const initFallback = window.setTimeout(() => {
      setStatus((prev) => {
        if (prev !== 'loading') return prev;
        try {
          return localStorage.getItem(VERIFIED_STORAGE_KEY) === 'added' ? 'added' : 'missed';
        } catch (e) {
          return 'missed';
        }
      });
    }, 900);

    return () => {
      window.clearTimeout(initFallback);
      if (verifyTimeoutRef.current) {
        window.clearTimeout(verifyTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkStatusNow);
      if (tg && typeof tg.offEvent === 'function') {
        tg.offEvent('homeScreenChecked', handleStatusChecked);
        tg.offEvent('homeScreenAdded', handleAdded);
        tg.offEvent('activated', checkStatusNow);
      }
    };
  }, [applyCheckedStatus, checkStatusNow]);

  const addToHomeScreen = useCallback(() => {
    triggerHaptic('medium');
    setIsVerifying(true);
    setVerificationError(null);

    const tg = (window as any).Telegram?.WebApp;

    if (tg && typeof tg.addToHomeScreen === 'function') {
      try {
        tg.addToHomeScreen();
      } catch (e) {
        if ((window as any).TelegramWebviewProxy?.postEvent) {
          try {
            (window as any).TelegramWebviewProxy.postEvent('web_app_add_to_home_screen', JSON.stringify({}));
          } catch (err) {}
        }
      }
    } else if ((window as any).TelegramWebviewProxy?.postEvent) {
      try {
        (window as any).TelegramWebviewProxy.postEvent('web_app_add_to_home_screen', JSON.stringify({}));
      } catch (e) {}
    }

    // Poll checkHomeScreenStatus to verify whether the user actually confirmed adding the shortcut
    if (verifyTimeoutRef.current) {
      window.clearTimeout(verifyTimeoutRef.current);
    }

    window.setTimeout(() => {
      checkStatusNow();
    }, 1800);

    window.setTimeout(() => {
      checkStatusNow();
    }, 3600);

    verifyTimeoutRef.current = window.setTimeout(() => {
      setStatus((currentStatus) => {
        if (currentStatus !== 'added') {
          setIsVerifying(false);
          setVerificationError(
            'Shortcut addition was not detected yet. Please tap "Add to Home Screen" and confirm in the Telegram prompt.'
          );
        }
        return currentStatus;
      });
    }, 5500);
  }, [checkStatusNow]);

  const dismissForSession = useCallback(() => {
    triggerHaptic('light');
    try {
      sessionStorage.setItem(SESSION_DISMISSED_KEY, 'true');
    } catch (e) {}
    setIsDismissedForSession(true);
  }, []);

  const reopenPrompt = useCallback(() => {
    triggerHaptic('light');
    try {
      sessionStorage.removeItem(SESSION_DISMISSED_KEY);
    } catch (e) {}
    setIsDismissedForSession(false);
  }, []);

  const shouldShowPrompt =
    status !== 'loading' &&
    (status !== 'added' || justVerified) &&
    !isDismissedForSession;

  return {
    status,
    isAdded: status === 'added',
    isVerifying,
    justVerified,
    verificationError,
    shouldShowPrompt,
    addToHomeScreen,
    checkStatusNow,
    dismissForSession,
    reopenPrompt
  };
};
