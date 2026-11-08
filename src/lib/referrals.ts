import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  getDocs,
  increment
} from 'firebase/firestore';
import { grantReward } from './rewardsEngine';
import { getTelegramUser } from './telegram';

const LOCAL_STORAGE_KEY = 'grmf_pending_referrer';

export interface Milestone {
  id: string;
  targetCount: number;
  rewardCoins: number;
  title?: string;
}

export const REFERRAL_MILESTONES: Milestone[] = [
  { id: 'ref_1', targetCount: 1, rewardCoins: 150, title: 'First Invite' },
  { id: 'ref_3', targetCount: 3, rewardCoins: 500, title: '3 Friends Joined' },
  { id: 'ref_5', targetCount: 5, rewardCoins: 1000, title: '5 Friends Joined' },
  { id: 'ref_10', targetCount: 10, rewardCoins: 2500, title: '10 Friends Joined' },
  { id: 'ref_25', targetCount: 25, rewardCoins: 7000, title: '25 Friends Ambassador' },
];

export const STANDARD_REFERRER_REWARD = 250;
export const PREMIUM_REFERRER_REWARD = 500;
export const STANDARD_FRIEND_WELCOME = 100;
export const PREMIUM_FRIEND_WELCOME = 200;

/**
 * Normalizes a raw start_param / referral parameter into a canonical referrer code.
 * Preserves "tg_<digits>" when the code refers to a Telegram user ID.
 */
function normalizeReferralCode(rawParam: string | null | undefined): string | null {
  if (!rawParam || typeof rawParam !== 'string') return null;
  let cleaned = rawParam.trim();
  if (!cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '12345') {
    return null;
  }

  // Strip leading "ref_" or "r_" prefix (but preserve "tg_" if present)
  cleaned = cleaned.replace(/^(ref_|r_)/i, '').trim();

  if (!cleaned || cleaned === '12345') return null;

  // If the remaining string is purely numeric (a Telegram user ID), normalize to "tg_<id>"
  if (/^\d+$/.test(cleaned)) {
    return `tg_${cleaned}`;
  }

  return cleaned;
}

/**
 * Extracts and stores the referral start parameter from all Telegram Mini App sources:
 * 1. Telegram.WebApp.initDataUnsafe.start_param
 * 2. Telegram.WebApp.initData (start_param / startapp)
 * 3. URL search/hash parameters (tgWebAppStartParam, startapp, start, ref)
 * 4. sessionStorage.__telegram__initParams
 * 5. Previously cached pending referral code in localStorage
 */
export const extractAndStoreReferralCode = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    const tg = (window as any).Telegram?.WebApp;
    let rawParam: string | null = null;

    // 1. Official Telegram WebApp initDataUnsafe.start_param
    if (tg?.initDataUnsafe?.start_param) {
      rawParam = String(tg.initDataUnsafe.start_param);
    }

    // 2. Parse raw initData string
    if (!rawParam && tg?.initData) {
      const parsed = new URLSearchParams(tg.initData);
      rawParam = parsed.get('start_param') || parsed.get('startapp');
    }

    // 3. Check URL search query parameters (including Telegram's tgWebAppStartParam)
    if (!rawParam) {
      const urlParams = new URLSearchParams(window.location.search);
      rawParam =
        urlParams.get('tgWebAppStartParam') ||
        urlParams.get('startapp') ||
        urlParams.get('start') ||
        urlParams.get('ref');
    }

    // 4. Check URL hash parameters (including nested tgWebAppData)
    if (!rawParam && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      rawParam =
        hashParams.get('tgWebAppStartParam') ||
        hashParams.get('startapp') ||
        hashParams.get('start') ||
        hashParams.get('ref');

      if (!rawParam) {
        const tgWebAppData = hashParams.get('tgWebAppData');
        if (tgWebAppData) {
          const innerParams = new URLSearchParams(tgWebAppData);
          rawParam = innerParams.get('start_param') || innerParams.get('startapp');
        }
      }
    }

    // 5. Check sessionStorage.__telegram__initParams
    if (!rawParam) {
      try {
        const sessionRaw = window.sessionStorage?.getItem('__telegram__initParams');
        if (sessionRaw) {
          const sessionObj = JSON.parse(sessionRaw);
          rawParam = sessionObj?.tgWebAppStartParam || null;
          if (!rawParam && sessionObj?.tgWebAppData) {
            const inner = new URLSearchParams(sessionObj.tgWebAppData);
            rawParam = inner.get('start_param') || inner.get('startapp');
          }
        }
      } catch (e) {}
    }

    // 6. Fallback to localStorage pending code
    if (!rawParam) {
      rawParam = localStorage.getItem(LOCAL_STORAGE_KEY);
    }

    const normalized = normalizeReferralCode(rawParam);
    if (normalized) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, normalized);
      } catch (e) {}
      return normalized;
    }
  } catch (e) {
    console.error('Error extracting referral code:', e);
  }
  return null;
};

/**
 * Resolves a normalized referral code to the canonical referrer document ID in /users.
 */
async function resolveReferrerAccount(rawCode: string): Promise<{
  referrerDocId: string;
  referrerData: any | null;
}> {
  const normalized = normalizeReferralCode(rawCode) || rawCode;
  const numericId = normalized.replace(/^tg_/i, '').trim();
  const isNumeric = /^\d+$/.test(numericId);

  // 1. Check canonical "tg_<id>" document first
  if (isNumeric) {
    const tgDocId = `tg_${numericId}`;
    try {
      const tgSnap = await getDoc(doc(db, 'users', tgDocId));
      if (tgSnap.exists()) {
        return { referrerDocId: tgDocId, referrerData: tgSnap.data() };
      }
    } catch (e) {}
  }

  // 2. Check exact match on document ID
  try {
    const exactSnap = await getDoc(doc(db, 'users', normalized));
    if (exactSnap.exists()) {
      return { referrerDocId: normalized, referrerData: exactSnap.data() };
    }
  } catch (e) {}

  // 3. Search by telegramId (number or string) if numeric
  if (isNumeric) {
    try {
      const usersCol = collection(db, 'users');
      const qNum = query(usersCol, where('telegramId', '==', Number(numericId)));
      const snapNum = await getDocs(qNum);
      if (!snapNum.empty) {
        return { referrerDocId: snapNum.docs[0].id, referrerData: snapNum.docs[0].data() };
      }

      const qStr = query(usersCol, where('telegramId', '==', numericId));
      const snapStr = await getDocs(qStr);
      if (!snapStr.empty) {
        return { referrerDocId: snapStr.docs[0].id, referrerData: snapStr.docs[0].data() };
      }
    } catch (e) {}

    // Default to canonical tg_<id> if numeric
    return { referrerDocId: `tg_${numericId}`, referrerData: null };
  }

  // 4. Search by username / telegramUsername if code is a handle
  try {
    const cleanHandle = normalized.replace(/^@/, '').trim();
    const usersCol = collection(db, 'users');
    const qHandle = query(usersCol, where('telegramUsername', '==', cleanHandle));
    const snapHandle = await getDocs(qHandle);
    if (!snapHandle.empty) {
      return { referrerDocId: snapHandle.docs[0].id, referrerData: snapHandle.docs[0].data() };
    }

    const qUser = query(usersCol, where('username', '==', cleanHandle));
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      return { referrerDocId: snapUser.docs[0].id, referrerData: snapUser.docs[0].data() };
    }
  } catch (e) {}

  return { referrerDocId: normalized, referrerData: null };
}

/**
 * Processes a referral atomically and idempotently when a new user opens the Mini App.
 */
export const processReferral = async (
  currentUid: string,
  currentUserData: any,
  tgUserParam?: any
): Promise<{
  success: boolean;
  reward?: number;
  referrerUsername?: string;
  isPremium?: boolean;
}> => {
  if (!currentUid) return { success: false };

  const activeTgUser = tgUserParam || getTelegramUser();

  if (currentUserData?.referredBy || currentUserData?.hasProcessedReferral) {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {}
    return { success: false };
  }

  const referrerCode = extractAndStoreReferralCode();
  if (!referrerCode) return { success: false };

  const { referrerDocId } = await resolveReferrerAccount(referrerCode);
  if (!referrerDocId) return { success: false };

  // Strict Self-Referral Guard (check doc ID and Telegram ID)
  const referrerNumericTgId = referrerDocId.replace(/^tg_/i, '').trim();
  const currentNumericTgId = activeTgUser?.id
    ? String(activeTgUser.id)
    : currentUserData?.telegramId
      ? String(currentUserData.telegramId)
      : currentUid.replace(/^tg_/i, '').trim();

  if (
    referrerDocId === currentUid ||
    referrerCode === currentUid ||
    (referrerNumericTgId && currentNumericTgId && referrerNumericTgId === currentNumericTgId)
  ) {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {}
    return { success: false };
  }

  const isPremiumFriend = Boolean(activeTgUser?.is_premium || currentUserData?.isPremium);
  const friendWelcomeReward = isPremiumFriend ? PREMIUM_FRIEND_WELCOME : STANDARD_FRIEND_WELCOME;
  const referrerReward = isPremiumFriend ? PREMIUM_REFERRER_REWARD : STANDARD_REFERRER_REWARD;

  // Deterministic referral document ID prevents double-counting the same user pair
  const canonicalReferredKey = activeTgUser?.id ? `tg_${activeTgUser.id}` : currentUid;
  const deterministicReferralId = `ref_${referrerDocId}__${canonicalReferredKey}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    let referrerDisplayName = 'Friend';
    const nowTs = Date.now();

    await runTransaction(db, async (transaction) => {
      const referrerRef = doc(db, 'users', referrerDocId);
      const referredRef = doc(db, 'users', currentUid);
      const referralRecordRef = doc(db, 'referrals', deterministicReferralId);

      const [referrerDoc, referredDoc, existingReferralDoc] = await Promise.all([
        transaction.get(referrerRef),
        transaction.get(referredRef),
        transaction.get(referralRecordRef)
      ]);

      // Guard 1: Check if this referral pair or referred user was already processed
      if (existingReferralDoc.exists()) {
        throw new Error('Referral pair already exists');
      }
      if (referredDoc.exists() && (referredDoc.data().referredBy || referredDoc.data().hasProcessedReferral)) {
        throw new Error('User already referred');
      }

      const referrerData = referrerDoc.exists() ? referrerDoc.data() : {};
      const referredData = referredDoc.exists() ? referredDoc.data() : {};

      referrerDisplayName =
        referrerData.telegramUsername ||
        referrerData.username ||
        referrerData.firstName ||
        'Friend';

      const tgFullName = activeTgUser?.first_name
        ? `${activeTgUser.first_name}${activeTgUser.last_name ? ' ' + activeTgUser.last_name : ''}`.trim()
        : referredData.fullName || referredData.firstName || null;

      const referredUsername =
        activeTgUser?.username ||
        tgFullName ||
        referredData.telegramUsername ||
        referredData.username ||
        `tg_${currentNumericTgId || currentUid.slice(-6)}`;

      const tgIdNum = activeTgUser?.id
        ? Number(activeTgUser.id)
        : referredData.telegramId
          ? Number(referredData.telegramId)
          : null;

      // 1. Update Referred User (Current User) using nested objects for safe deep merge
      transaction.set(
        referredRef,
        {
          referredBy: referrerDocId,
          referredByName: referrerDisplayName,
          hasProcessedReferral: true,
          referralBonusReceived: friendWelcomeReward,
          username: referredUsername,
          ...(activeTgUser?.username ? { telegramUsername: activeTgUser.username } : {}),
          ...(activeTgUser?.first_name ? { firstName: activeTgUser.first_name } : {}),
          ...(activeTgUser?.last_name ? { lastName: activeTgUser.last_name } : {}),
          ...(tgFullName ? { fullName: tgFullName } : {}),
          ...(tgIdNum ? { telegramId: tgIdNum, telegramIdStr: String(tgIdNum) } : {}),
          ...(activeTgUser?.photo_url ? { photoUrl: activeTgUser.photo_url } : {}),
          isPremium: isPremiumFriend,
          isTelegramMiniApp: true,
          lastActiveAt: serverTimestamp(),
          lastActiveTimestamp: nowTs,
          realBalances: {
            GRMF: increment(friendWelcomeReward)
          },
          betaBalances: {
            GRMF: increment(friendWelcomeReward)
          },
          ...(!referredDoc.exists() && {
            createdAt: serverTimestamp(),
            createdTimestamp: nowTs,
            referralsCount: 0,
            inviteCount: 0,
            earnedReferralCoins: 0,
            claimedMilestones: []
          })
        },
        { merge: true }
      );

      // 2. Update Referrer User using nested objects for safe deep merge
      transaction.set(
        referrerRef,
        {
          referralsCount: increment(1),
          inviteCount: increment(1),
          earnedReferralCoins: increment(referrerReward),
          xp: increment(isPremiumFriend ? 100 : 50),
          lastReferralAt: serverTimestamp(),
          lastReferralTimestamp: nowTs,
          realBalances: {
            GRMF: increment(referrerReward)
          },
          betaBalances: {
            GRMF: increment(referrerReward)
          },
          ...(!referrerDoc.exists() && {
            createdAt: serverTimestamp(),
            createdTimestamp: nowTs,
            username: referrerDocId,
             ...( /^\d+$/.test(referrerNumericTgId) ? { telegramId: Number(referrerNumericTgId), telegramIdStr: referrerNumericTgId } : {} ),
            claimedMilestones: []
          })
        },
        { merge: true }
      );

      // 3. Create deterministic record in /referrals collection
      transaction.set(referralRecordRef, {
        id: deterministicReferralId,
        referrerId: referrerDocId,
        referrerTelegramId: /^\d+$/.test(referrerNumericTgId) ? referrerNumericTgId : (referrerData.telegramId ? String(referrerData.telegramId) : null),
        referredId: currentUid,
        referredUsername,
        referredTelegramUsername: activeTgUser?.username || referredData.telegramUsername || null,
        referredFullName: tgFullName,
        referredPhotoUrl: activeTgUser?.photo_url || referredData.photoUrl || null,
        referredTelegramId: tgIdNum ? String(tgIdNum) : null,
        isPremium: isPremiumFriend,
        reward: referrerReward,
        friendReward: friendWelcomeReward,
        timestamp: nowTs,
        createdAt: serverTimestamp()
      });

      // 4. Update Global Stats
      const statsRef = doc(db, 'global', 'stats');
      transaction.set(
        statsRef,
        {
          totalReferrals: increment(1),
          totalGrmf: increment(friendWelcomeReward + referrerReward),
          lastUpdatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });

    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {}

    return {
      success: true,
      reward: friendWelcomeReward,
      referrerUsername: referrerDisplayName,
      isPremium: isPremiumFriend
    };
  } catch (err: any) {
    if (
      err?.message?.includes('already exists') ||
      err?.message?.includes('already referred')
    ) {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {}
    } else {
      console.warn('Referral transaction warning:', err?.message || err);
    }
    return { success: false };
  }
};

export const claimMilestone = async (userId: string, milestone: Milestone): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;

    const data = userSnap.data();
    const count = Math.max(Number(data.referralsCount) || 0, Number(data.inviteCount) || 0);
    const claimed = Array.isArray(data.claimedMilestones) ? data.claimedMilestones : [];

    if (count < milestone.targetCount) {
      return false;
    }
    if (claimed.includes(milestone.id)) {
      return false;
    }

    const res = await grantReward({
      userId,
      source: `milestone_${milestone.id}`,
      amount: milestone.rewardCoins,
      xp: 100,
      balanceType: 'both',
      extraUserUpdates: {
        claimedMilestones: [...claimed, milestone.id]
      }
    });

    return res.success;
  } catch (err) {
    console.error('Claim milestone failed:', err);
    return false;
  }
};

/**
 * Fetches all referred friends for a user across both /referrals and /users collections
 * without requiring a Firestore composite index, deduplicating by Telegram ID / User ID.
 */
export const getReferredFriends = async (userId: string, telegramId?: string | number | null) => {
  if (!userId) return [];

  const numericTgId = telegramId
    ? String(telegramId).trim()
    : userId.startsWith('tg_')
      ? userId.replace(/^tg_/, '').trim()
      : null;

  const candidateIds = Array.from(
    new Set(
      [
        userId,
        numericTgId ? `tg_${numericTgId}` : null,
        numericTgId || null
      ].filter(Boolean) as string[]
    )
  );

  const friendsMap = new Map<string, any>();

  try {
    // 1. Query /referrals collection by referrerId (without orderBy to avoid composite index error)
    const qReferrals = query(
      collection(db, 'referrals'),
      where('referrerId', 'in', candidateIds)
    );
    const snapReferrals = await getDocs(qReferrals);

    snapReferrals.docs.forEach((docSnap) => {
      const d = docSnap.data();
      const key = d.referredTelegramId
        ? `tg_${d.referredTelegramId}`
        : d.referredId || docSnap.id;

      const ts =
        Number(d.timestamp) ||
        (d.createdAt?.toMillis ? d.createdAt.toMillis() : 0) ||
        (d.createdAt?.seconds ? d.createdAt.seconds * 1000 : 0);

      friendsMap.set(key, {
        id: docSnap.id,
        referredId: d.referredId || key,
        referredUsername: d.referredFullName || d.referredUsername || d.referredTelegramUsername || 'Telegram User',
        referredTelegramUsername: d.referredTelegramUsername || (d.referredUsername && !String(d.referredUsername).includes(' ') ? d.referredUsername : null),
        referredTelegramId: d.referredTelegramId || null,
        photoUrl: d.referredPhotoUrl || null,
        isPremium: Boolean(d.isPremium),
        reward: Number(d.reward) || STANDARD_REFERRER_REWARD,
        timestamp: ts,
        createdAt: d.createdAt
      });
    });
  } catch (e) {
    console.warn('getReferredFriends /referrals query warning:', e);
  }

  try {
    // 2. Also query /users collection where referredBy matches candidateIds
    const qUsers = query(
      collection(db, 'users'),
      where('referredBy', 'in', candidateIds)
    );
    const snapUsers = await getDocs(qUsers);

    snapUsers.docs.forEach((uSnap) => {
      const u = uSnap.data();
      const key = u.telegramId ? `tg_${u.telegramId}` : uSnap.id;
      const existing = friendsMap.get(key);

      const displayName =
        u.fullName ||
        (u.firstName ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}`.trim() : '') ||
        u.telegramUsername ||
        u.username ||
        existing?.referredUsername ||
        'Telegram User';

      const ts =
        existing?.timestamp ||
        Number(u.createdTimestamp) ||
        (u.createdAt?.toMillis ? u.createdAt.toMillis() : 0) ||
        0;

      friendsMap.set(key, {
        id: existing?.id || `u_${uSnap.id}`,
        referredId: uSnap.id,
        referredUsername: displayName,
        referredTelegramUsername: u.telegramUsername || existing?.referredTelegramUsername || null,
        referredTelegramId: u.telegramId ? String(u.telegramId) : existing?.referredTelegramId || null,
        photoUrl: u.photoUrl || existing?.photoUrl || null,
        isPremium: Boolean(u.isPremium || existing?.isPremium),
        reward: existing?.reward || (u.isPremium ? PREMIUM_REFERRER_REWARD : STANDARD_REFERRER_REWARD),
        timestamp: ts,
        createdAt: existing?.createdAt || u.createdAt
      });
    });
  } catch (e) {
    console.warn('getReferredFriends /users query warning:', e);
  }

  const list = Array.from(friendsMap.values());
  list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return list;
};

/**
 * Reconciles the user's referralsCount and earnedReferralCoins with their actual verified referrals
 * in Firestore so no referral is ever lost or uncounted.
 */
const syncedUsersInSession = new Set<string>();

export const syncReferralsForUser = async (userUid: string, userProfile: any) => {
  if (!userUid || syncedUsersInSession.has(userUid)) return;
  syncedUsersInSession.add(userUid);

  try {
    const friends = await getReferredFriends(userUid, userProfile?.telegramId);
    const actualCount = friends.length;
    const storedCount = Math.max(
      Number(userProfile?.referralsCount) || 0,
      Number(userProfile?.inviteCount) || 0
    );

    if (actualCount > storedCount) {
      const diffCount = actualCount - storedCount;
      const diffReward = diffCount * STANDARD_REFERRER_REWARD;
      const userRef = doc(db, 'users', userUid);

      await setDoc(
        userRef,
        {
          referralsCount: actualCount,
          inviteCount: actualCount,
          earnedReferralCoins: increment(diffReward),
          realBalances: {
            GRMF: increment(diffReward)
          },
          betaBalances: {
            GRMF: increment(diffReward)
          }
        },
        { merge: true }
      );
    }
  } catch (e) {
    syncedUsersInSession.delete(userUid);
  }
};
