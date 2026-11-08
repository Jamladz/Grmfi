import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { 
  ArrowLeftRight, 
  Wallet as WalletIcon, 
  Trophy,
  User,
  Zap,
  Award,
  UserCheck,
  Sparkles,
  ListTodo,
  AlertCircle
} from 'lucide-react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  serverTimestamp, 
  updateDoc, 
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  getDoc,
  increment,
  deleteField
} from 'firebase/firestore';
import { grantReward, flattenObjectToDotNotation } from './lib/rewardsEngine';
import { auth, db } from './lib/firebase';
import { extractAndStoreReferralCode, processReferral, syncReferralsForUser } from './lib/referrals';
import { awardXP } from './lib/levelSystem';

// Immediately capture referral start parameter from Telegram on script load
extractAndStoreReferralCode();

import { Header } from './components/Header';
import { SwapCard } from './components/SwapCard';
import { PriceChart } from './components/PriceChart';
import { PoolCard } from './components/PoolCard';
import { WalletDrawer } from './components/WalletDrawer';
import { TransactionModal } from './components/TransactionModal';
import { AirdropView } from './components/AirdropView';
import { ProfileView } from './components/ProfileView';
import { ReferralsView } from './components/ReferralsView';
import { TasksView } from './components/TasksView';
import { TokenSelectModal } from './components/TokenSelectModal';
import { AdminView } from './components/AdminView';
import { PresaleHub } from './components/PresaleHub';
import { SettingsModal } from './components/SettingsModal';
import { WhitepaperModal } from './components/WhitepaperModal';
import { triggerHaptic, initTelegramFullScreen, getTelegramUser, isStrictAdminUser } from './lib/telegram';
import { Users, ShieldAlert, Gift, Rocket } from 'lucide-react';

import { TOKENS, POOLS } from './data/tokens';
import { Token, TransactionState, WalletState } from './types';

type ActiveView = 'swap' | 'tasks' | 'referrals' | 'airdrop' | 'profile' | 'admin' | 'presale';

function safeCloneDeep(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (Array.isArray(obj)) return obj.map(safeCloneDeep);
  
  const copy: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    copy[key] = safeCloneDeep(obj[key]);
  }
  return copy;
}

const DAILY_TASK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function sanitizeTaskTimestamp(val: any, now = Date.now()): number {
  if (typeof val !== 'number' || isNaN(val) || val <= 0) return 0;
  let ts = val;
  // Recover timestamps that were accidentally summed together by legacy dot-key normalization
  while (ts > now + 60000) {
    ts = Math.floor(ts / 2);
  }
  return ts;
}

function normalizeAndSanitizeUserData(rawData: any) {
  if (!rawData || typeof rawData !== 'object') return { data: rawData || {} };
  
  const now = Date.now();
  const data = safeCloneDeep(rawData);

  Object.keys(rawData).forEach(key => {
    if (key.includes('.')) {
      const parts = key.split('.');
      let target = data;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!target[p] || typeof target[p] !== 'object' || Array.isArray(target[p])) {
          target[p] = {};
        }
        target = target[p];
      }
      const last = parts[parts.length - 1];
      const val = rawData[key];
      const isTimestampField = last.endsWith('At') || last.endsWith('Timestamp');
      const isTaskField = key.startsWith('taskProgress.');

      if (isTimestampField && typeof val === 'number') {
        const cleanVal = sanitizeTaskTimestamp(val, now);
        const cleanExisting = sanitizeTaskTimestamp(target[last], now);
        target[last] = Math.max(cleanExisting, cleanVal);
      } else if (isTaskField) {
        if (typeof val === 'number' && typeof target[last] === 'number') {
          target[last] = Math.max(target[last], val);
        } else if (val !== undefined && val !== null) {
          target[last] = val;
        }
      } else if (typeof val === 'number' && typeof target[last] === 'number') {
        target[last] = Math.max(target[last], val);
      } else if (target[last] === undefined || target[last] === null) {
        target[last] = val;
      }
      delete data[key];
    }
  });

  if (data.taskProgress && typeof data.taskProgress === 'object') {
    Object.keys(data.taskProgress).forEach(taskId => {
      const entry = data.taskProgress[taskId];
      if (entry && typeof entry === 'object') {
        if (typeof entry.completedAt === 'number') {
          entry.completedAt = sanitizeTaskTimestamp(entry.completedAt, now);
        }
        if (typeof entry.claimedAt === 'number') {
          entry.claimedAt = sanitizeTaskTimestamp(entry.claimedAt, now);
        }
      }
    });
  }

  return { data };
}

function App() {
  const [tonConnectUI] = useTonConnectUI();
  // Guard to prevent multiple claims of daily_login bonus in the same runtime session
  const processedDailyBonusRef = useRef<Set<string>>(new Set());
  // Initialize Telegram WebApp data immediately
  const tg = (window as any).Telegram?.WebApp;
  const tgUser = getTelegramUser();
  
  // Official Telegram Mini App Fullscreen initialization
  useEffect(() => {
    initTelegramFullScreen();
  }, []);

  const [activeView, setActiveView] = useState<ActiveView>('swap');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [deadline, setDeadline] = useState<number>(20);
  const [isExpertMode, setIsExpertMode] = useState<boolean>(false);

  // Sync native Telegram BackButton with navigation state
  useEffect(() => {
    if (!tg?.BackButton) return;
    const handleBack = () => {
      triggerHaptic('light');
      setActiveView('swap');
    };
    try {
      if (activeView !== 'swap') {
        tg.BackButton.show();
        tg.BackButton.onClick(handleBack);
      } else {
        tg.BackButton.hide();
      }
    } catch (e) {}
    return () => {
      try {
        tg.BackButton.offClick(handleBack);
      } catch (e) {}
    };
  }, [activeView, tg]);
  
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]); // GRMF (Top)
  const [toToken, setToToken] = useState<Token>(TOKENS[1]); // GRAM (Bottom)
  const [fromAmount, setFromAmount] = useState<string>('');
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
  const [selectingSide, setSelectingSide] = useState<'from' | 'to' | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isWhitepaperOpen, setIsWhitepaperOpen] = useState(false);
  const [txState, setTxState] = useState<TransactionState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  // Derived Telegram User info for instant display
  const instantTgUsername = tgUser?.username || (
    tgUser?.first_name ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`.trim() : null
  );

  // Deterministic initial document ID so userProfile.id is always available on first render
  const initialDocId = (() => {
    if (tgUser?.id) {
      const id = `tg_${tgUser.id}`;
      try {
        localStorage.setItem('grmf_persistent_doc_id', id);
      } catch (e) {}
      return id;
    }
    try {
      const stored = localStorage.getItem('grmf_persistent_doc_id');
      if (stored) return stored;
      const generated = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('grmf_persistent_doc_id', generated);
      return generated;
    } catch (e) {
      return `web_${Date.now()}`;
    }
  })();

  // Hydrate initial state from localStorage cache to prevent zero flash on restart
  const [userProfile, setUserProfile] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('grmf_cached_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        const { data: sanitized } = normalizeAndSanitizeUserData(parsed);
        return {
          ...sanitized,
          id: tgUser?.id ? `tg_${tgUser.id}` : (sanitized.id || initialDocId),
          username: instantTgUsername || sanitized.username,
          telegramUsername: tgUser?.username || sanitized.telegramUsername || instantTgUsername,
          firstName: tgUser?.first_name || sanitized.firstName || null,
          lastName: tgUser?.last_name || sanitized.lastName || null,
          telegramId: tgUser?.id ? Number(tgUser.id) : (sanitized.telegramId || null),
          photoUrl: tgUser?.photo_url || sanitized.photoUrl || null,
        };
      }
    } catch (e) {}
    return instantTgUsername ? {
      id: initialDocId,
      username: instantTgUsername,
      telegramUsername: tgUser?.username || null,
      firstName: tgUser?.first_name || null,
      lastName: tgUser?.last_name || null,
      photoUrl: tgUser?.photo_url || null,
      telegramId: tgUser?.id ? Number(tgUser.id) : null,
    } : { id: initialDocId };
  });

  const [balances, setBalances] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem('grmf_cached_balances');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return { GRAM: 0, GRMF: 0, USDT: 0, NOT: 0, DOGS: 0, HMSTR: 0 };
  });

  const [realGrmf, setRealGrmf] = useState<number>(() => {
    try {
      const cached = localStorage.getItem('grmf_cached_real_grmf');
      if (cached) return parseFloat(cached) || 0;
    } catch (e) {}
    return 0;
  });

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [referralBonusModal, setReferralBonusModal] = useState<{
    show: boolean;
    reward: number;
    referrerName: string;
    isPremium: boolean;
  } | null>(null);
  
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      const p = e.detail;
      setUserProfile(p);
      setBalances(p.betaBalances || { GRMF: 0, GRAM: 0, USDT: 0, NOT: 0, DOGS: 0, HMSTR: 0 });
      setRealGrmf(p.realBalances?.GRMF || 0);
    };
    window.addEventListener('grmf_local_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('grmf_local_profile_updated', handleProfileUpdate);
  }, []);

  const [isAppReady, setIsAppReady] = useState(false);

  // Rewards Configuration
  const WELCOME_REWARD = 4000;
  const DAILY_REWARD_REAL = 5;

  // Strict Admin access check: ONLY Telegram username @sekanedr_is
  const isAdmin = isStrictAdminUser(tgUser, userProfile, auth.currentUser?.email);

  // Helper function: Resolve permanent, immutable user document ID across reloads
  const resolveUserDocId = async (firebaseUser?: any): Promise<string> => {
    const latestTgUser = getTelegramUser() || tgUser;
    const currentTgId = latestTgUser?.id ? String(latestTgUser.id) : null;
    const storedDocId = localStorage.getItem('grmf_persistent_doc_id');

    // 1. Telegram WebApp context (permanent tg_ID)
    if (currentTgId) {
      const tgDocId = `tg_${currentTgId}`;
      const tgDocRef = doc(db, 'users', tgDocId);
      
      try {
        const tgSnap = await getDoc(tgDocRef);
        if (tgSnap.exists()) {
          localStorage.setItem('grmf_persistent_doc_id', tgDocId);
          return tgDocId;
        }

        // Search existing Firestore documents by telegramId
        const usersCol = collection(db, 'users');
        const qNum = query(usersCol, where('telegramId', '==', Number(currentTgId)));
        const snapNum = await getDocs(qNum);
        if (!snapNum.empty) {
          const foundId = snapNum.docs[0].id;
          localStorage.setItem('grmf_persistent_doc_id', foundId);
          return foundId;
        }

        const qStr = query(usersCol, where('telegramId', '==', currentTgId));
        const snapStr = await getDocs(qStr);
        if (!snapStr.empty) {
          const foundId = snapStr.docs[0].id;
          localStorage.setItem('grmf_persistent_doc_id', foundId);
          return foundId;
        }
      } catch (e) {
        console.warn("Telegram account resolution check failed:", e);
      }

      localStorage.setItem('grmf_persistent_doc_id', tgDocId);
      return tgDocId;
    }

    // 2. Web browser context
    if (storedDocId) {
      try {
        const storedSnap = await getDoc(doc(db, 'users', storedDocId));
        if (storedSnap.exists()) {
          return storedDocId;
        }
      } catch (e) {}
    }

    const finalId = storedDocId || firebaseUser?.uid || initialDocId;
    try {
      localStorage.setItem('grmf_persistent_doc_id', finalId);
    } catch (e) {}
    return finalId;
  };

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let isInitialized = false;

    const bootUserSession = async (firebaseUser?: any) => {
      if (isInitialized) return;
      isInitialized = true;

      const activeTgUser = getTelegramUser() || tgUser;
      const detectedUsername = activeTgUser?.username || (
        activeTgUser?.first_name
          ? `${activeTgUser.first_name}${activeTgUser.last_name ? ' ' + activeTgUser.last_name : ''}`.trim()
          : instantTgUsername
      );
      const userDocId = await resolveUserDocId(firebaseUser);
      const userRef = doc(db, 'users', userDocId);

      // Immediately upsert Telegram Mini App user identity on launch so every visitor is recorded in Firestore
      const tgFullName = activeTgUser?.first_name
        ? `${activeTgUser.first_name}${activeTgUser.last_name ? ' ' + activeTgUser.last_name : ''}`.trim()
        : null;
      const nowTs = Date.now();

      if (activeTgUser?.id) {
        const immediateIdentityPayload: Record<string, any> = {
          telegramId: Number(activeTgUser.id),
          telegramIdStr: String(activeTgUser.id),
          username: activeTgUser.username || tgFullName || detectedUsername || `tg_${activeTgUser.id}`,
          telegramUsername: activeTgUser.username || null,
          firstName: activeTgUser.first_name || null,
          lastName: activeTgUser.last_name || null,
          fullName: tgFullName || null,
          photoUrl: activeTgUser.photo_url || null,
          isPremium: Boolean(activeTgUser.is_premium),
          languageCode: activeTgUser.language_code || null,
          isTelegramMiniApp: true,
          lastActiveAt: serverTimestamp(),
          lastActiveTimestamp: nowTs,
        };
        setDoc(userRef, immediateIdentityPayload, { merge: true }).catch((err) => {
          console.warn("Immediate Telegram identity upsert warning:", err);
        });
      }

      // FAST CHECK for Welcome Bonus modal
      try {
        const fastSnap = await getDoc(userRef);
        if (fastSnap.exists()) {
          const data = fastSnap.data();
          if (!data.hasCollectedWelcomeBonus && !localStorage.getItem(`bonus_collected_${userDocId}`)) {
            setShowWelcomeModal(true);
          }
        } else {
          setShowWelcomeModal(true);
        }
      } catch (e) {
        console.warn("Fast check failed:", e);
      }

      setIsAppReady(true);

      unsubProfile = onSnapshot(userRef, (docSnap) => {
        const latestTg = getTelegramUser() || activeTgUser;
        const latestFullName = latestTg?.first_name
          ? `${latestTg.first_name}${latestTg.last_name ? ' ' + latestTg.last_name : ''}`.trim()
          : tgFullName;

        if (docSnap.exists()) {
          const rawData = docSnap.data();
          const { data } = normalizeAndSanitizeUserData(rawData);

          // If the doc was created by referral or immediate upsert without full defaults, ensure defaults exist
          if (data.hasCollectedWelcomeBonus === undefined && !data.createdTimestamp) {
            setDoc(userRef, {
              createdAt: serverTimestamp(),
              createdTimestamp: nowTs,
              betaBalances: data.betaBalances || { GRMF: 0, GRAM: 0, USDT: 0, NOT: 0, DOGS: 0, HMSTR: 0 },
              realBalances: data.realBalances || { GRMF: 0 },
              hasCollectedWelcomeBonus: Boolean(data.hasCollectedWelcomeBonus),
              hasProcessedReferral: Boolean(data.hasProcessedReferral),
            }, { merge: true }).catch(() => {});
          }

          const fullProfile = {
            id: userDocId,
            ...data,
            ...(latestTg?.username ? { telegramUsername: latestTg.username, username: latestTg.username } : {}),
            ...(latestTg?.first_name ? { firstName: latestTg.first_name } : {}),
            ...(latestTg?.last_name ? { lastName: latestTg.last_name } : {}),
            ...(latestFullName ? { fullName: latestFullName } : {}),
            ...(latestTg?.id ? { telegramId: Number(latestTg.id) } : {}),
            ...(latestTg?.photo_url ? { photoUrl: latestTg.photo_url } : {}),
          };
          setUserProfile(fullProfile);
          setBalances(data.betaBalances || { GRMF: 0, GRAM: 0, USDT: 0, NOT: 0, DOGS: 0, HMSTR: 0 });
          setRealGrmf(data.realBalances?.GRMF || 0);
          setAppError(null);

          // Persist locally for instant loading upon re-entry
          try {
            localStorage.setItem('grmf_cached_profile', JSON.stringify(fullProfile));
            localStorage.setItem('grmf_cached_balances', JSON.stringify(data.betaBalances || {}));
            localStorage.setItem('grmf_cached_real_grmf', String(data.realBalances?.GRMF || 0));
          } catch (e) {}

          // Sync referrals in background for referrer
          syncReferralsForUser(userDocId, data);

          // Process pending incoming referral if not yet processed
          if (!data.hasProcessedReferral && !data.referredBy) {
            const refSnapKey = `snap_ref_${userDocId}`;
            if (!processedDailyBonusRef.current.has(refSnapKey)) {
              processedDailyBonusRef.current.add(refSnapKey);
              processReferral(userDocId, data, latestTg).then((res) => {
                if (res && res.success && res.reward) {
                  setReferralBonusModal({
                    show: true,
                    reward: res.reward,
                    referrerName: res.referrerUsername || 'Friend',
                    isPremium: !!res.isPremium
                  });
                }
              });
            }
          }
        } else {
          // Create initial profile with Telegram data using persistent userDocId
          const finalUsername = latestTg?.username || latestFullName || detectedUsername || ('user_' + userDocId.slice(-6));
          const initialData = {
            username: finalUsername,
            telegramUsername: latestTg?.username || null,
            firstName: latestTg?.first_name || null,
            lastName: latestTg?.last_name || null,
            fullName: latestFullName || null,
            telegramId: latestTg?.id ? Number(latestTg.id) : null,
            telegramIdStr: latestTg?.id ? String(latestTg.id) : null,
            photoUrl: latestTg?.photo_url || null,
            isPremium: Boolean(latestTg?.is_premium),
            languageCode: latestTg?.language_code || null,
            isTelegramMiniApp: Boolean(latestTg?.id || (window as any).Telegram?.WebApp?.initData),
            points: 0,
            rank: 0,
            inviteCount: 0,
            referralsCount: 0,
            createdAt: serverTimestamp(),
            createdTimestamp: Date.now(),
            lastActiveAt: serverTimestamp(),
            lastActiveTimestamp: Date.now(),
            betaBalances: { GRMF: 0, GRAM: 0, USDT: 0, NOT: 0, DOGS: 0, HMSTR: 0 },
            realBalances: { GRMF: 0 },
            openedChests: [],
            hasCollectedWelcomeBonus: false,
            hasProcessedReferral: false
          };

          setDoc(userRef, initialData, { merge: true })
            .then(() => {
              const statsRef = doc(db, 'global', 'stats');
              setDoc(statsRef, {
                totalUsers: increment(1),
                ...(latestTg?.id ? { realUsers: increment(1) } : {}),
                lastUpdatedAt: serverTimestamp()
              }, { merge: true }).catch(() => {});

              processReferral(userDocId, initialData, latestTg).then((res) => {
                if (res && res.success && res.reward) {
                  setReferralBonusModal({
                    show: true,
                    reward: res.reward,
                    referrerName: res.referrerUsername || 'Friend',
                    isPremium: !!res.isPremium
                  });
                }
              });
            })
            .catch(err => {
              console.warn("Initial setDoc failed:", err);
              if (err.code === 'resource-exhausted') {
                setAppError("Rate limit exceeded. Please try again later.");
              }
            });

          if (!localStorage.getItem(`bonus_collected_${userDocId}`)) {
            setShowWelcomeModal(true);
          }
        }
      }, (error: any) => {
        console.error("Profile snapshot error:", error);
        const cachedProfileStr = localStorage.getItem('grmf_cached_profile');
        if (cachedProfileStr) {
          try {
            const cachedProfile = JSON.parse(cachedProfileStr);
            setUserProfile(cachedProfile);
            setBalances(cachedProfile.betaBalances || { GRMF: 0, GRAM: 0, USDT: 0, NOT: 0, DOGS: 0, HMSTR: 0 });
            setRealGrmf(cachedProfile.realBalances?.GRMF || 0);
          } catch (e) {}
        }
        if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota exceeded')) {
          if (!cachedProfileStr) {
            setAppError("Quota limit exceeded for free tier database (Spark Plan). Daily write/read units limit reached on Firestore.");
          }
        }
        setIsAppReady(true);
      });
    };

    // Start session immediately without blocking on Firebase Anonymous Auth
    bootUserSession(auth.currentUser);

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        bootUserSession(user);
      } else {
        signInAnonymously(auth).catch(() => {
          // Ignore anonymous auth failure in Telegram WebView / Cloudflare; session already booted via Telegram ID
        });
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Handle background initialization tasks (Daily Login, TG Sync, Referrals)
  useEffect(() => {
    if (!userProfile?.id || !isAppReady) return;

    const userDocId = userProfile.id;
    const userRef = doc(db, 'users', userDocId);
    const data = userProfile;
    const now = Date.now();
    const activeTgUser = getTelegramUser() || tgUser;

    // 1. Daily Login Bonus (Once per day - Resets at UTC Midnight)
    const lastLoginBonusAt = data.lastLoginBonusTimestamp || 0;
    const nowObj = new Date(now);
    const todayUTC = Date.UTC(nowObj.getUTCFullYear(), nowObj.getUTCMonth(), nowObj.getUTCDate());
    const lastBonusUTC = lastLoginBonusAt ? (() => {
      const d = new Date(lastLoginBonusAt);
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    })() : 0;
    
    const isNewDayUTC = todayUTC > lastBonusUTC;
    const todayStr = new Date(todayUTC).toISOString().split('T')[0];
    const bonusKey = `daily_claim_${userDocId}_${todayStr}`;

    if (isNewDayUTC && data.hasCollectedWelcomeBonus && !processedDailyBonusRef.current.has(bonusKey)) {
      processedDailyBonusRef.current.add(bonusKey);
      grantReward({
        userId: userDocId,
        telegramId: activeTgUser?.id || data.telegramId,
        username: data.username || data.telegramUsername,
        firstName: activeTgUser?.first_name || data.firstName,
        source: 'daily_login',
        amount: DAILY_REWARD_REAL,
        balanceType: 'both',
        extraUserUpdates: {
          lastLoginBonusTimestamp: now,
          lastActiveAt: serverTimestamp(),
          lastActiveTimestamp: now
        }
      }).catch(err => {
        console.warn("Daily reward background check failed:", err);
        processedDailyBonusRef.current.delete(bonusKey);
      });
    }

    // 2. Telegram Profile Sync (Ensure real Telegram username, name, ID, and photo are always synced)
    const tgUsernameClean = activeTgUser?.username || null;
    const tgFirstNameClean = activeTgUser?.first_name || null;
    const tgLastNameClean = activeTgUser?.last_name || null;
    const tgFullNameClean = tgFirstNameClean ? `${tgFirstNameClean}${tgLastNameClean ? ' ' + tgLastNameClean : ''}`.trim() : null;
    const tgIdClean = activeTgUser?.id ? Number(activeTgUser.id) : null;
    const tgPhotoClean = activeTgUser?.photo_url || null;

    if (activeTgUser && (
      (tgUsernameClean && data.telegramUsername !== tgUsernameClean) ||
      (tgFirstNameClean && data.firstName !== tgFirstNameClean) ||
      (tgLastNameClean && data.lastName !== tgLastNameClean) ||
      (tgIdClean && Number(data.telegramId) !== tgIdClean) ||
      (tgPhotoClean && data.photoUrl !== tgPhotoClean)
    )) {
      const syncKey = `tg_sync_${userDocId}_${tgUsernameClean || ''}_${tgFirstNameClean || ''}_${tgIdClean || ''}`;
      if (!processedDailyBonusRef.current.has(syncKey)) {
        processedDailyBonusRef.current.add(syncKey);
        setDoc(userRef, {
          ...(tgUsernameClean ? { username: tgUsernameClean, telegramUsername: tgUsernameClean } : tgFullNameClean ? { username: tgFullNameClean } : {}),
          ...(tgFirstNameClean ? { firstName: tgFirstNameClean } : {}),
          ...(tgLastNameClean ? { lastName: tgLastNameClean } : {}),
          ...(tgFullNameClean ? { fullName: tgFullNameClean } : {}),
          ...(tgIdClean ? { telegramId: tgIdClean, telegramIdStr: String(tgIdClean) } : {}),
          ...(tgPhotoClean ? { photoUrl: tgPhotoClean } : {}),
          isPremium: Boolean(activeTgUser.is_premium),
          isTelegramMiniApp: true,
          lastActiveAt: serverTimestamp(),
          lastActiveTimestamp: now
        }, { merge: true }).catch(err => console.warn("TG sync failed:", err));
      }
    }

    // 3. Referral Processing
    if (!data.hasProcessedReferral) {
      const refKey = `ref_proc_${userDocId}`;
      if (!processedDailyBonusRef.current.has(refKey)) {
        processedDailyBonusRef.current.add(refKey);
        processReferral(userDocId, data, tgUser).then((res) => {
          if (res && res.success && res.reward) {
            setReferralBonusModal({
              show: true,
              reward: res.reward,
              referrerName: res.referrerUsername || 'Friend',
              isPremium: !!res.isPremium
            });
          }
        });
      }
    }

    // 4. Activity heartbeat (Every 30 minutes to save quota)
    const lastActive = data.lastActiveTimestamp || 0;
    if (now - lastActive > 30 * 60 * 1000) {
      updateDoc(userRef, {
        lastActiveAt: serverTimestamp(),
        lastActiveTimestamp: now
      }).catch(e => {});
    }

    // 5. Reward Modals
    if (!data.hasCollectedWelcomeBonus && !localStorage.getItem(`bonus_collected_${userDocId}`)) {
      if (!showWelcomeModal) setShowWelcomeModal(true);
    } else if (showWelcomeModal) {
      setShowWelcomeModal(false);
    }

    if (data.referralBonusReceived && !data.hasSeenReferralRewardModal && !localStorage.getItem(`seen_ref_modal_${userDocId}`)) {
      if (!referralBonusModal?.show) {
        setReferralBonusModal({
          show: true,
          reward: data.referralBonusReceived,
          referrerName: data.referredByName || 'Friend',
          isPremium: Boolean(data.isPremium)
        });
      }
    }
  }, [userProfile?.id, isAppReady, tgUser]);

  const dismissReferralModal = () => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (targetId) {
      localStorage.setItem(`seen_ref_modal_${targetId}`, 'true');
      const userRef = doc(db, 'users', targetId);
      updateDoc(userRef, { hasSeenReferralRewardModal: true }).catch(() => {});
    }
    setReferralBonusModal(null);
  };

  const collectWelcomeBonus = async () => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId) return;
    
    // Save locally immediately to avoid any re-trigger
    localStorage.setItem(`bonus_collected_${targetId}`, 'true');

    // Optimistic UI updates
    const updatedBeta = { ...balances, GRMF: (balances.GRMF || 0) + WELCOME_REWARD };
    
    setBalances(updatedBeta);
    setRealGrmf(prev => prev + WELCOME_REWARD);
    setUserProfile(prev => prev ? {
      ...prev,
      realBalances: {
        ...(prev.realBalances || {}),
        GRMF: (prev.realBalances?.GRMF || 0) + WELCOME_REWARD
      },
      betaBalances: {
        ...(prev.betaBalances || {}),
        GRMF: (prev.betaBalances?.GRMF || 0) + WELCOME_REWARD
      }
    } : prev as any);
    setShowWelcomeModal(false);

    try {
      const res = await grantReward({
        userId: targetId,
        telegramId: userProfile?.telegramId,
        username: userProfile?.username || userProfile?.telegramUsername,
        firstName: userProfile?.firstName,
        source: 'welcome_bonus',
        amount: WELCOME_REWARD,
        balanceType: 'both',
        extraUserUpdates: {
          hasCollectedWelcomeBonus: true,
          lastLoginBonusTimestamp: Date.now()
        }
      });
      if (!res || !res.success) {
        console.warn("Welcome bonus grantReward failed:", res?.message);
      }
    } catch (error) {
      console.error("Error collecting bonus:", error);
    }
  };

  const mergedBalances: Record<string, number> = {
    GRMF: Math.max(realGrmf, balances.GRMF || 0, userProfile?.realBalances?.GRMF || 0),
    GRAM: Math.max(userProfile?.realBalances?.GRAM || 0, balances.GRAM || 0),
    USDT: Math.max(userProfile?.realBalances?.USDT || 0, balances.USDT || 0),
    NOT: Math.max(userProfile?.realBalances?.NOT || 0, balances.NOT || 0),
    DOGS: Math.max(userProfile?.realBalances?.DOGS || 0, balances.DOGS || 0),
    HMSTR: Math.max(userProfile?.realBalances?.HMSTR || 0, balances.HMSTR || 0),
  };

  const wallet: WalletState = {
    address: tonConnectUI.account?.address || null,
    isConnected: !!tonConnectUI.connected,
    balances: mergedBalances,
    walletName: tonConnectUI.account ? 'TON Wallet' : null,
  };

  const rawToAmount = fromAmount && !isNaN(parseFloat(fromAmount)) && parseFloat(fromAmount) > 0
    ? parseFloat(fromAmount) * (fromToken.priceUsd / toToken.priceUsd)
    : 0;

  const toAmount = rawToAmount > 0
    ? rawToAmount < 0.01
      ? rawToAmount.toFixed(6)
      : rawToAmount < 1
        ? rawToAmount.toFixed(4)
        : rawToAmount.toFixed(2)
    : '';

  const handleSwap = async () => {
    const fAmt = parseFloat(fromAmount);
    const tAmt = rawToAmount;
    if (isNaN(fAmt) || fAmt <= 0 || isNaN(tAmt) || tAmt <= 0) return;

    const availFrom = mergedBalances[fromToken.symbol] || 0;
    if (fAmt > availFrom) return;

    const targetId =
      userProfile?.id ||
      localStorage.getItem('grmf_persistent_doc_id') ||
      auth.currentUser?.uid;

    const fromSym = fromToken.symbol;
    const toSym = toToken.symbol;
    const partnerSym = fromSym === 'GRMF' ? toSym : toSym === 'GRMF' ? fromSym : toSym;
    const taskId = partnerSym && partnerSym !== 'GRMF' ? `swap_grmf_${partnerSym.toLowerCase()}` : null;
    const nowTs = Date.now();

    const canCompleteSwapTask = (progressMap: any, id: string | null) => {
      if (!id) return false;
      const entry = progressMap?.[id];
      if (!entry) return true;
      const status = typeof entry === 'object' ? entry.status : entry;
      // One-time swap task: only mark completed if not already completed or claimed
      return status !== 'completed' && status !== 'claimed';
    };

    const curBeta = { ...mergedBalances };
    const curReal = { ...(userProfile?.realBalances || {}), GRMF: mergedBalances.GRMF };

    const newBetaFrom = Math.max(0, (curBeta[fromSym] || 0) - fAmt);
    const newBetaTo = Number(((curBeta[toSym] || 0) + tAmt).toFixed(6));

    const newRealFrom = Math.max(0, (curReal[fromSym] || 0) - fAmt);
    const newRealTo = Number(((curReal[toSym] || 0) + tAmt).toFixed(6));

    const updatedBeta = { ...curBeta, [fromSym]: newBetaFrom, [toSym]: newBetaTo };
    const updatedReal = { ...curReal, [fromSym]: newRealFrom, [toSym]: newRealTo };

    // Immediately update local state & mark swap task completed right away
    setBalances(updatedBeta);
    if (toSym === 'GRMF') setRealGrmf(newRealTo);
    else if (fromSym === 'GRMF') setRealGrmf(newRealFrom);

    const prevProgress = userProfile?.taskProgress || {};
    const shouldMarkTaskCompleted = taskId ? canCompleteSwapTask(prevProgress, taskId) : false;
    const updatedProgress = { ...prevProgress };
    if (taskId && shouldMarkTaskCompleted) {
      updatedProgress[taskId] = {
        ...(updatedProgress[taskId] || {}),
        status: 'completed',
        completedAt: nowTs
      };
    }

    setUserProfile((prev: any) => {
      const nextProfile = {
        ...(prev || {}),
        betaBalances: updatedBeta,
        realBalances: updatedReal,
        taskProgress: updatedProgress
      };
      try {
        localStorage.setItem('grmf_cached_profile', JSON.stringify(nextProfile));
        localStorage.setItem('grmf_cached_balances', JSON.stringify(updatedBeta));
        localStorage.setItem('grmf_cached_real_grmf', String(updatedReal.GRMF || 0));
      } catch (e) {}
      return nextProfile;
    });

    // Persist swap & task completion to Firestore immediately so it is never lost
    if (targetId) {
      const firestoreUpdate: Record<string, any> = {
        betaBalances: updatedBeta,
        realBalances: updatedReal,
        lastActiveAt: serverTimestamp(),
        lastActiveTimestamp: nowTs
      };

      if (taskId && shouldMarkTaskCompleted) {
        firestoreUpdate[`taskProgress.${taskId}.status`] = 'completed';
        firestoreUpdate[`taskProgress.${taskId}.completedAt`] = nowTs;
      }

      grantReward({
        userId: targetId,
        telegramId: userProfile?.telegramId,
        username: userProfile?.username || userProfile?.telegramUsername,
        firstName: userProfile?.firstName,
        source: `swap_${fromSym}_to_${toSym}`,
        amount: 0,
        xp: 30,
        balanceType: 'real',
        extraUserUpdates: firestoreUpdate
      }).catch((err) => console.warn('Swap reward sync warning:', err));
    }

    setTxState('submitting');
    setTxHash(null);

    setTimeout(() => {
      setTxState('confirming');
      setTimeout(() => {
        triggerHaptic('success');
        setTxState('success');
        setTxHash('0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6));
      }, 900);
    }, 600);
  };

  const handleSelectToken = (token: Token) => {
    if (selectingSide === 'from') {
      if (token.id === toToken.id) {
        setToToken(fromToken);
      }
      setFromToken(token);
    } else if (selectingSide === 'to') {
      if (token.id === fromToken.id) {
        setFromToken(toToken);
      }
      setToToken(token);
    }
  };

  const handleFlipTokens = () => {
    const prevFrom = fromToken;
    setFromToken(toToken);
    setToToken(prevFrom);
    setFromAmount('');
  };
  
  const handleOpenChest = async (chestId: string, rewards: { symbol: string, amount: number }) => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId) return;
    const userRef = doc(db, 'users', targetId);
    
    try {
      if (rewards.symbol === 'GRMF') {
        await updateDoc(userRef, {
          'betaBalances.GRMF': increment(rewards.amount),
          'realBalances.GRMF': increment(rewards.amount),
          openedChests: arrayUnion(chestId)
        });
      } else {
        await updateDoc(userRef, {
          [`betaBalances.${rewards.symbol}`]: increment(rewards.amount),
          openedChests: arrayUnion(chestId)
        });
      }
    } catch (err) {
      console.warn("Failed to open chest (quota?):", err);
    }
  };

  const handleClaimUnclaimedReferrals = async () => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId) return;
    const userRef = doc(db, 'users', targetId);
    const unclaimed = userProfile?.unclaimedReferralRewards || 0;
    if (unclaimed <= 0) return;

    try {
      await updateDoc(userRef, {
        'realBalances.GRMF': increment(unclaimed),
        'betaBalances.GRMF': increment(unclaimed),
        unclaimedReferralRewards: 0
      });
    } catch (err) {
      console.warn("Failed to claim referrals (quota?):", err);
    }
  };

  if (appError) {
    const isQuotaError = appError.toLowerCase().includes("quota") || appError.toLowerCase().includes("rate limit");
    const firestoreConsoleUrl = "https://console.firebase.google.com/project/gen-lang-client-0163667078/firestore/databases/ai-studio-grmffi-1a964c60-5149-45bd-8b05-969acc181c85/data?openUpgradeDialog=true";

    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-white font-sans selection:bg-blue-500/30">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
          {isQuotaError ? "Firestore Quota Limit Reached" : "Service Temporarily Busy"}
        </h1>
        <p className="text-slate-500 text-[13px] mb-6 max-w-xs leading-relaxed font-medium">
          {isQuotaError
            ? "Daily free write/read units limit reached on Firebase Spark plan. Quota resets daily."
            : appError}
        </p>

        {isQuotaError && (
          <a
            href={firestoreConsoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
          >
            Open Firebase Console ↗
          </a>
        )}

        <button 
          onClick={() => window.location.reload()}
          className="w-full max-w-[200px] py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 transition-transform active:scale-95"
        >
          Retry Now
        </button>
      </div>
    );
  }

  if (!isAppReady && !userProfile) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-[#F0F2F5] p-6 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin relative z-10" />
        </div>
        <div className="space-y-1.5">
          <span className="block text-slate-900 font-black text-sm uppercase tracking-[0.2em]">GRMF FI</span>
          <span className="block text-slate-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Initializing Ecosystem...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-500/30 flex flex-col overflow-hidden relative pt-[var(--app-safe-top,env(safe-area-inset-top,8px))]">
      {/* Dynamic Background Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[50%] bg-blue-100/40 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[50%] bg-blue-50/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Header 
        onOpenWalletDrawer={() => {
          triggerHaptic('light');
          setIsWalletOpen(true);
        }} 
        onOpenSettings={() => {
          triggerHaptic('light');
          setIsSettingsOpen(true);
        }}
        onOpenWhitepaper={() => {
          triggerHaptic('light');
          setIsWhitepaperOpen(true);
        }}
        isAdmin={isAdmin}
        isAdminViewActive={activeView === 'admin'}
        onToggleAdmin={() => {
          triggerHaptic('light');
          setActiveView(activeView === 'admin' ? 'swap' : 'admin');
        }}
      />

      <main className={`flex-1 w-full mx-auto px-4 pt-2 pb-[calc(5.5rem+env(safe-area-inset-bottom,20px))] flex flex-col overflow-hidden relative z-10 ${
        activeView === 'admin' && isAdmin ? 'max-w-6xl' : 'max-w-xl'
      }`}>
        <AnimatePresence mode="wait">
          {activeView === 'swap' && (
            <motion.div 
              key="swap"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col items-center justify-center overflow-y-auto no-scrollbar py-4"
            >
              <SwapCard 
                fromToken={fromToken} 
                toToken={toToken}
                fromAmount={fromAmount}
                setFromAmount={setFromAmount}
                toAmount={toAmount}
                onFlipTokens={() => {
                  triggerHaptic('light');
                  handleFlipTokens();
                }}
                onOpenFromTokenSelect={() => {
                  triggerHaptic('light');
                  setSelectingSide('from');
                  setIsTokenSelectOpen(true);
                }}
                onOpenToTokenSelect={() => {
                  triggerHaptic('light');
                  setSelectingSide('to');
                  setIsTokenSelectOpen(true);
                }}
                onOpenSettings={() => {
                  triggerHaptic('light');
                  setIsSettingsOpen(true);
                }}
                onSwap={() => {
                  triggerHaptic('medium');
                  handleSwap();
                }}
                wallet={wallet}
                onOpenConnectModal={() => {
                  triggerHaptic('light');
                  setIsWalletOpen(true);
                }}
                slippage={slippage}
              />
            </motion.div>
          )}

          {activeView === 'referrals' && (
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              <ReferralsView 
                key="referrals" 
                userProfile={userProfile} 
                onOpenChest={handleOpenChest}
                onClaimUnclaimed={handleClaimUnclaimedReferrals}
              />
            </div>
          )}
          {activeView === 'tasks' && (
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              <TasksView 
                key="tasks" 
                userProfile={userProfile} 
                setActiveView={setActiveView}
                onSelectSwapPair={(toSymbol: string) => {
                  const grmfToken = TOKENS.find(t => t.symbol === 'GRMF') || TOKENS[0];
                  const targetToken = TOKENS.find(t => t.symbol.toUpperCase() === toSymbol.toUpperCase());
                  if (grmfToken) setFromToken(grmfToken);
                  if (targetToken) setToToken(targetToken);
                  if (!fromAmount || parseFloat(fromAmount) <= 0) {
                    const availGrmf = mergedBalances.GRMF || 0;
                    const defaultSwapAmt = availGrmf >= 100 ? 100 : availGrmf > 0 ? Math.max(1, Math.floor(availGrmf * 0.25)) : 100;
                    setFromAmount(String(defaultSwapAmt));
                  }
                  setActiveView('swap');
                }}
              />
            </div>
          )}
          {activeView === 'airdrop' && (
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              <AirdropView 
                key="airdrop" 
                userProfile={userProfile} 
                wallet={wallet}
                onOpenWalletModal={() => setIsWalletOpen(true)}
                setActiveView={setActiveView}
              />
            </div>
          )}
          {activeView === 'profile' && (
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              <ProfileView 
                key="profile" 
                balances={balances} 
                userProfile={userProfile} 
                isAdmin={isAdmin}
                onOpenAdmin={() => setActiveView('admin')}
              />
            </div>
          )}
          {activeView === 'admin' && isAdmin && (
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              <AdminView key="admin" />
            </div>
          )}
          {activeView === 'presale' && (
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              <PresaleHub key="presale" userProfile={userProfile} />
            </div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 px-3 sm:px-4 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,10px))] z-50 pointer-events-none">
        <div className="max-w-xl mx-auto flex items-center gap-2.5 pointer-events-auto">
          {/* Rounded-Edge Capsule Frame for the 5 Main Navigation Buttons */}
          <div className="flex-1 bg-white/95 backdrop-blur-xl border border-slate-200/85 shadow-lg shadow-slate-900/8 rounded-full p-1.5 grid grid-cols-5 items-center gap-0.5">
            <NavButton 
              active={activeView === 'swap'} 
              onClick={() => { triggerHaptic('light'); setActiveView('swap'); }} 
              icon={<ArrowLeftRight className="w-4 h-4" />} 
              label="Swap" 
            />
            <NavButton 
              active={activeView === 'tasks'} 
              onClick={() => { triggerHaptic('light'); setActiveView('tasks'); }} 
              icon={<ListTodo className="w-4 h-4" />} 
              label="Tasks" 
            />
            <NavButton 
              active={activeView === 'referrals'} 
              onClick={() => { triggerHaptic('light'); setActiveView('referrals'); }} 
              icon={<Users className="w-4 h-4" />} 
              label="Friends" 
            />
            <NavButton 
              active={activeView === 'airdrop'} 
              onClick={() => { triggerHaptic('light'); setActiveView('airdrop'); }} 
              icon={<Trophy className="w-4 h-4" />} 
              label="Airdrop" 
            />
            <NavButton 
              active={activeView === 'presale'} 
              onClick={() => { triggerHaptic('light'); setActiveView('presale'); }} 
              icon={<Rocket className="w-4 h-4" />} 
              label="Presale" 
            />
          </div>

          {/* Standalone Circular Profile Icon Button on the Same Row */}
          <button
            onClick={() => { triggerHaptic('light'); setActiveView('profile'); }}
            aria-label="Profile"
            title="Profile"
            className={`shrink-0 w-[54px] h-[54px] rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer shadow-lg ${
              activeView === 'profile'
                ? 'bg-[#0088CC] text-white border-[#0088CC] shadow-[#0088CC]/25 ring-2 ring-[#0088CC]/20'
                : 'bg-white/95 backdrop-blur-xl text-slate-600 hover:text-slate-900 border-slate-200/85 shadow-slate-900/8'
            }`}
          >
            <User className="w-5 h-5" strokeWidth={activeView === 'profile' ? 2.5 : 2} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-[290px] bg-white rounded-3xl p-6 text-center shadow-2xl border border-slate-100"
            >
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 mb-3.5 flex items-center justify-center">
                  <Gift className="w-7 h-7 text-[#0088CC]" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-1">Welcome Bonus</h3>
                <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
                  Claim your starter allocation to begin swapping and earning on GRMF Fi.
                </p>
                <div className="bg-slate-50 rounded-2xl py-3.5 px-4 w-full mb-5 border border-slate-200/60 flex items-baseline justify-center gap-1.5">
                  <span className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">+{WELCOME_REWARD.toLocaleString()}</span>
                  <span className="text-xs font-extrabold text-[#0088CC]">GRMF</span>
                </div>
                <button
                  onClick={() => {
                    triggerHaptic('success');
                    collectWelcomeBonus();
                  }}
                  className="w-full min-h-[44px] py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Claim Starter Gift
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Referral Reward Modal Banner for Referred User */}
        {referralBonusModal?.show && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="w-full max-w-xs bg-white rounded-3xl p-6 text-center shadow-2xl border border-slate-100"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 mb-4 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-amber-500" />
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1.5">
                  Referral Bonus Unlocked
                </h3>
                
                <p className="text-xs text-slate-500 font-medium mb-5 leading-relaxed">
                  You joined via invite from <strong className="text-slate-900 font-bold">@{referralBonusModal.referrerName}</strong>
                </p>

                <div className="w-full bg-slate-50 border border-slate-200/70 p-4 rounded-2xl mb-5">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Bonus Credited
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5 font-mono tabular-nums">
                    <span className="text-3xl font-extrabold text-slate-900">
                      +{referralBonusModal.reward}
                    </span>
                    <span className="text-sm font-bold text-amber-600">GRMF</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    triggerHaptic('success');
                    dismissReferralModal();
                  }}
                  className="w-full min-h-[44px] py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        slippage={slippage}
        setSlippage={setSlippage}
        deadline={deadline}
        setDeadline={setDeadline}
        isExpertMode={isExpertMode}
        setIsExpertMode={setIsExpertMode}
      />

      <WalletDrawer 
        isOpen={isWalletOpen} 
        onClose={() => setIsWalletOpen(false)} 
        wallet={wallet}
        onDisconnect={() => tonConnectUI.disconnect()}
      />

      <TransactionModal 
        isOpen={txState !== 'idle'} 
        txState={txState} 
        txHash={txHash}
        fromAmount={fromAmount || '0'}
        fromSymbol={fromToken.symbol}
        toAmount={toAmount || '0'}
        toSymbol={toToken.symbol}
        onClose={() => setTxState('idle')}
        onGoToTasks={() => setActiveView('tasks')}
      />

      <TokenSelectModal 
        isOpen={isTokenSelectOpen}
        onClose={() => setIsTokenSelectOpen(false)}
        onSelect={handleSelectToken}
        selectedToken={selectingSide === 'from' ? fromToken : toToken}
        balances={balances}
      />

      <WhitepaperModal
        isOpen={isWhitepaperOpen}
        onClose={() => setIsWhitepaperOpen(false)}
      />
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`min-h-[44px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all active:scale-95 cursor-pointer ${
      active 
        ? 'bg-sky-50 text-[#0088CC]' 
        : 'text-slate-500 hover:text-slate-800'
    }`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4', strokeWidth: active ? 2.5 : 2 })}
    <span className={`text-[10px] tracking-tight whitespace-nowrap leading-none ${active ? 'font-extrabold text-[#0088CC]' : 'font-semibold text-slate-500'}`}>
      {label}
    </span>
  </button>
);

export default App;
