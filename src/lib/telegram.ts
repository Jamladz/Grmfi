export const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : undefined;

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'success' | 'warning' | 'error' = 'light') {
  try {
    if (!tg?.HapticFeedback) return;
    if (type === 'success' || type === 'warning' || type === 'error') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch (e) {
    // Ignore haptic errors on unsupported platforms
  }
}

export function openTelegramLink(url: string) {
  triggerHaptic('light');
  try {
    if (tg?.openTelegramLink && (url.startsWith('https://t.me/') || url.startsWith('tg://'))) {
      tg.openTelegramLink(url);
      return;
    }
    if (tg?.openLink) {
      tg.openLink(url);
      return;
    }
  } catch (e) {
    // Fallback
  }
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function showTelegramAlert(message: string, title = 'GRMF Fi') {
  try {
    if (tg?.showPopup) {
      tg.showPopup({
        title,
        message,
        buttons: [{ type: 'ok' }]
      });
      return true;
    }
    if (tg?.showAlert) {
      tg.showAlert(message);
      return true;
    }
  } catch (e) {
    // Ignore and allow custom UI toast
  }
  return false;
}
