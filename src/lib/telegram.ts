export const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : undefined;

export interface TelegramUserData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

const TG_USER_CACHE_KEY = 'grmf_verified_tg_user';

function parseUserFromInitDataString(rawInitData: string | null | undefined): TelegramUserData | null {
  if (!rawInitData || typeof rawInitData !== 'string') return null;
  try {
    const params = new URLSearchParams(rawInitData);
    const userJson = params.get('user');
    if (userJson) {
      const parsed = JSON.parse(decodeURIComponent(userJson));
      if (parsed && parsed.id) return parsed as TelegramUserData;
    }
    const directParsed = JSON.parse(rawInitData);
    if (directParsed && directParsed.id) return directParsed as TelegramUserData;
  } catch (e) {
    // Ignore parse errors
  }
  return null;
}

/**
 * Extracts the authenticated Telegram user from WebApp.initDataUnsafe
 * or falls back to parsing WebApp.initData, sessionStorage.__telegram__initParams,
 * URL parameters, or verified local cache.
 */
export function getTelegramUser(): TelegramUserData | null {
  if (typeof window === 'undefined') return null;
  const webApp = (window as any).Telegram?.WebApp;

  // 1. Primary: Telegram.WebApp.initDataUnsafe.user
  if (webApp?.initDataUnsafe?.user && webApp.initDataUnsafe.user.id) {
    const u = webApp.initDataUnsafe.user as TelegramUserData;
    try {
      localStorage.setItem(TG_USER_CACHE_KEY, JSON.stringify(u));
    } catch (e) {}
    return u;
  }

  // 2. Fallback: parse raw WebApp.initData string
  const fromInitData = parseUserFromInitDataString(webApp?.initData);
  if (fromInitData) {
    try {
      localStorage.setItem(TG_USER_CACHE_KEY, JSON.stringify(fromInitData));
    } catch (e) {}
    return fromInitData;
  }

  // 3. Fallback: check URL hash/query for tgWebAppData
  try {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const tgData =
      hashParams.get('tgWebAppData') ||
      new URLSearchParams(window.location.search).get('tgWebAppData');
    const fromUrl = parseUserFromInitDataString(tgData);
    if (fromUrl) {
      try {
        localStorage.setItem(TG_USER_CACHE_KEY, JSON.stringify(fromUrl));
      } catch (e) {}
      return fromUrl;
    }
  } catch (e) {}

  // 4. Fallback: check sessionStorage.__telegram__initParams (saved by telegram-web-app.js)
  try {
    const sessionParamsRaw = window.sessionStorage?.getItem('__telegram__initParams');
    if (sessionParamsRaw) {
      const sessionParams = JSON.parse(sessionParamsRaw);
      const fromSession = parseUserFromInitDataString(sessionParams?.tgWebAppData);
      if (fromSession) {
        try {
          localStorage.setItem(TG_USER_CACHE_KEY, JSON.stringify(fromSession));
        } catch (e) {}
        return fromSession;
      }
    }
  } catch (e) {}

  // 5. Fallback: previously verified Telegram user cached on this device
  try {
    const cached = localStorage.getItem(TG_USER_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.id) {
        return parsed as TelegramUserData;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Checks whether the current user is strictly the authorized admin (@sekanedr_is).
 */
export function isStrictAdminUser(
  tgUser?: TelegramUserData | null,
  userProfile?: any,
  currentEmail?: string | null
): boolean {
  const candidates = [
    tgUser?.username,
    userProfile?.telegramUsername,
    userProfile?.username
  ]
    .filter(Boolean)
    .map((u) => String(u).toLowerCase().replace(/^@/, '').trim());

  if (candidates.includes('sekanedr_is')) {
    return true;
  }

  // Allow owner email in web preview when no conflicting Telegram handle is active
  if (candidates.length === 0 && currentEmail === 'sekanedrmessaif@gmail.com') {
    return true;
  }

  return false;
}

/**
 * Updates CSS custom properties for Telegram Fullscreen safe-area insets
 * so the header never overlaps with Telegram's native top overlay bar.
 */
export function syncTelegramSafeAreas() {
  if (typeof document === 'undefined') return;
  const webApp = (window as any).Telegram?.WebApp;
  if (!webApp) return;

  try {
    const safeTop = webApp.safeAreaInset?.top || 0;
    const contentSafeTop = webApp.contentSafeAreaInset?.top || 0;
    const isFullscreen = Boolean(webApp.isFullscreen);

    // When in native Telegram fullscreen mode, combine safeAreaInset.top and contentSafeAreaInset.top
    const totalTopInset = isFullscreen
      ? Math.max(safeTop + contentSafeTop, 44)
      : Math.max(safeTop, 8);

    document.documentElement.style.setProperty('--app-safe-top', `${totalTopInset}px`);
  } catch (e) {
    // Ignore
  }
}

/**
 * Official Telegram Mini App Fullscreen initialization (Bot API 8.0+ & Legacy compatible)
 */
export function initTelegramFullScreen() {
  if (typeof window === 'undefined') return;
  const webApp = (window as any).Telegram?.WebApp;
  if (!webApp) return;

  try {
    // 1. Inform Telegram client that the Mini App is ready
    webApp.ready();

    // 2. Always expand bottom sheet to maximum height first
    if (typeof webApp.expand === 'function') {
      webApp.expand();
    }

    // 3. Official Bot API 8.0+ Fullscreen Request
    if (typeof webApp.requestFullscreen === 'function' && !webApp.isFullscreen) {
      try {
        webApp.requestFullscreen();
      } catch (err) {
        console.warn('requestFullscreen call warning:', err);
      }
    } else if ((window as any).TelegramWebviewProxy?.postEvent) {
      // Direct native bridge fallback for clients supporting web_app_request_fullscreen
      try {
        (window as any).TelegramWebviewProxy.postEvent('web_app_request_fullscreen', JSON.stringify({}));
      } catch (e) {}
    }

    // 4. Disable vertical swipes so scrolling never collapses the Mini App (Bot API 7.7+)
    if (typeof webApp.disableVerticalSwipes === 'function') {
      webApp.disableVerticalSwipes();
    }

    // 5. Match native header & background colors to our financial light theme
    webApp.setHeaderColor?.('#F8FAFC');
    webApp.setBackgroundColor?.('#F8FAFC');

    // 6. Enable closing confirmation to prevent accidental exit
    webApp.enableClosingConfirmation?.();

    // 7. Sync safe areas & listen for fullscreen/viewport changes
    syncTelegramSafeAreas();
    webApp.onEvent?.('fullscreenChanged', syncTelegramSafeAreas);
    webApp.onEvent?.('safeAreaChanged', syncTelegramSafeAreas);
    webApp.onEvent?.('contentSafeAreaChanged', syncTelegramSafeAreas);
    webApp.onEvent?.('viewportChanged', () => {
      if (!webApp.isExpanded && typeof webApp.expand === 'function') {
        webApp.expand();
      }
      syncTelegramSafeAreas();
    });
  } catch (e) {
    console.warn('Telegram WebApp fullscreen initialization warning:', e);
  }
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'success' | 'warning' | 'error' = 'light') {
  try {
    const webApp = (window as any).Telegram?.WebApp;
    if (!webApp?.HapticFeedback) return;
    if (type === 'success' || type === 'warning' || type === 'error') {
      webApp.HapticFeedback.notificationOccurred(type);
    } else {
      webApp.HapticFeedback.impactOccurred(type);
    }
  } catch (e) {
    // Ignore haptic errors on unsupported platforms
  }
}

export function openTelegramLink(url: string) {
  triggerHaptic('light');
  try {
    const webApp = (window as any).Telegram?.WebApp;
    if (webApp?.openTelegramLink && (url.startsWith('https://t.me/') || url.startsWith('tg://'))) {
      webApp.openTelegramLink(url);
      return;
    }
    if (webApp?.openLink) {
      webApp.openLink(url);
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
    const webApp = (window as any).Telegram?.WebApp;
    if (webApp?.showPopup) {
      webApp.showPopup({
        title,
        message,
        buttons: [{ type: 'ok' }]
      });
      return true;
    }
    if (webApp?.showAlert) {
      webApp.showAlert(message);
      return true;
    }
  } catch (e) {
    // Ignore and allow custom UI toast
  }
  return false;
}
