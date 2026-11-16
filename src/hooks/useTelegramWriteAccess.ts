import { useState, useCallback, useEffect } from 'react';
import {
  getRawTelegramInitData,
  getTelegramUser,
  requestTelegramWriteAccess,
  triggerHaptic
} from '../lib/telegram';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export type WriteAccessState = 'idle' | 'requesting' | 'allowed' | 'declined' | 'unsupported';

export function useTelegramWriteAccess(userProfile?: any) {
  const [status, setStatus] = useState<WriteAccessState>(() => {
    if (userProfile?.writeAccessGranted === true || userProfile?.allowsWriteToPm === true) {
      return 'allowed';
    }
    if (userProfile?.writeAccessStatus === 'declined') {
      return 'declined';
    }
    return 'idle';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.writeAccessGranted === true || userProfile?.allowsWriteToPm === true) {
      setStatus('allowed');
    } else if (userProfile?.writeAccessStatus === 'declined' && status === 'idle') {
      setStatus('declined');
    }
  }, [userProfile?.writeAccessGranted, userProfile?.allowsWriteToPm, userProfile?.writeAccessStatus, status]);

  // Sync signed initData allows_write_to_pm with server on session start if present
  useEffect(() => {
    const rawInitData = getRawTelegramInitData();
    const webApp = (window as any).Telegram?.WebApp;
    const signedAllowsWrite = webApp?.initDataUnsafe?.user?.allows_write_to_pm === true;

    if (rawInitData && signedAllowsWrite && !userProfile?.writeAccessGranted) {
      fetch('/api/telegram/write-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: rawInitData,
          requestedStatus: 'sync',
          sendWelcomeNotification: false
        })
      })
        .then((r) => r.json())
        .then((res) => {
          if (res?.ok && res.writeAccessGranted) {
            setStatus('allowed');
          }
        })
        .catch(() => {
          // Non-blocking
        });
    }
  }, [userProfile?.writeAccessGranted]);

  /**
   * Must ONLY be called inside an explicit user click handler.
   * Calls official Telegram.WebApp.requestWriteAccess() to display Telegram's native popup.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    triggerHaptic('light');
    setErrorMessage(null);
    setStatus('requesting');

    const nativeResult = await requestTelegramWriteAccess();

    if (nativeResult === 'unsupported') {
      setStatus('unsupported');
      return false;
    }

    const isAllowed = nativeResult === 'allowed';
    const rawInitData = getRawTelegramInitData();
    const tgUser = getTelegramUser();
    const tgId = tgUser?.id || userProfile?.telegramId;

    // Send authenticated initData and result to backend for cryptographic validation & DB storage
    if (rawInitData) {
      try {
        const response = await fetch('/api/telegram/write-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: rawInitData,
            telegramUserId: tgId || null,
            requestedStatus: isAllowed ? 'allowed' : 'declined',
            sendWelcomeNotification: isAllowed
          })
        });

        const data = await response.json();
        if (response.ok && data?.ok) {
          const verifiedAllowed = Boolean(data.writeAccessGranted);
          setStatus(verifiedAllowed ? 'allowed' : 'declined');
          triggerHaptic(verifiedAllowed ? 'success' : 'warning');
          return verifiedAllowed;
        }
      } catch (err) {
        // Fallback below if offline
      }
    }

    // Also persist status to user's Firestore doc if user declined or server token not yet set
    const targetDocId =
      (tgId ? `tg_${tgId}` : null) ||
      userProfile?.id ||
      localStorage.getItem('grmf_persistent_doc_id');

    if (targetDocId) {
      try {
        await setDoc(
          doc(db, 'users', targetDocId),
          {
            ...(tgId ? { telegramId: Number(tgId), telegramIdStr: String(tgId) } : {}),
            writeAccessGranted: isAllowed,
            writeAccessStatus: isAllowed ? 'allowed' : 'declined',
            allowsWriteToPm: isAllowed,
            writeAccessUpdatedAt: Date.now(),
            lastActiveAt: serverTimestamp()
          },
          { merge: true }
        );
      } catch (e) {}
    }

    setStatus(isAllowed ? 'allowed' : 'declined');
    triggerHaptic(isAllowed ? 'success' : 'warning');
    return isAllowed;
  }, [userProfile?.id, userProfile?.telegramId]);

  /**
   * Sends a private message via the server's official Bot API sendMessage endpoint.
   */
  const sendBotMessage = useCallback(
    async (text: string, targetTelegramId?: string | number): Promise<{ ok: boolean; error?: string }> => {
      const rawInitData = getRawTelegramInitData();
      if (!rawInitData) {
        return { ok: false, error: 'Telegram session initData is required' };
      }

      try {
        const response = await fetch('/api/telegram/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: rawInitData,
            targetTelegramId,
            text
          })
        });
        const data = await response.json();
        if (response.ok && data?.ok) {
          return { ok: true };
        }
        return { ok: false, error: data?.error || 'Failed to send message' };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Network error' };
      }
    },
    []
  );

  return {
    status,
    isAllowed: status === 'allowed',
    isDeclined: status === 'declined',
    isRequesting: status === 'requesting',
    errorMessage,
    requestPermission,
    sendBotMessage
  };
}
