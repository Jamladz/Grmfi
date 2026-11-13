import { db } from './firebase';
import {
  doc,
  setDoc,
  increment,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { getTelegramUser } from './telegram';

export interface GrantRewardOptions {
  userId: string;
  telegramId?: string | number | null;
  username?: string | null;
  firstName?: string | null;
  source: string;
  amount: number;
  symbol?: string;
  xp?: number;
  balanceType?: 'real' | 'both';
  extraUserUpdates?: Record<string, any>;
}

export interface GrantRewardResult {
  success: boolean;
  message?: string;
  txId?: string;
  localOnly?: boolean;
}

export function flattenObjectToDotNotation(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};
  if (!obj || typeof obj !== 'object') return result;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (
      val &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      !(val instanceof Date) &&
      val.constructor?.name !== 'FieldValue' &&
      typeof val._methodName !== 'string' &&
      typeof val.isEqual !== 'function'
    ) {
      Object.assign(result, flattenObjectToDotNotation(val, newKey));
    } else {
      result[newKey] = val;
    }
  }
  return result;
}

export function applyDotNotationToObject(target: Record<string, any>, dotMap: Record<string, any>) {
  Object.entries(dotMap).forEach(([key, val]) => {
    if (key.includes('.')) {
      const parts = key.split('.');
      let curr = target;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!curr[p] || typeof curr[p] !== 'object') {
          curr[p] = {};
        }
        curr = curr[p];
      }
      curr[parts[parts.length - 1]] = val;
    } else {
      target[key] = val;
    }
  });
}

/**
 * UNIFIED REWARD ENGINE
 * Always persists Telegram identity fields (telegramId, username, telegramUsername, firstName)
 * directly on /users/{userId} as well as /transactions/{txId}.
 */
export async function grantReward(options: GrantRewardOptions): Promise<GrantRewardResult> {
  const {
    userId,
    telegramId,
    username,
    firstName,
    source,
    amount,
    symbol = 'GRMF',
    xp = 0,
    balanceType = 'both',
    extraUserUpdates = {}
  } = options;

  const tokenSymbol = (symbol || 'GRMF').toUpperCase();

  if (!userId || typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    console.error('Invalid grantReward parameters:', { userId, amount });
    return { success: false, message: 'Invalid userId or reward amount' };
  }

  const activeTg = getTelegramUser();
  const resolvedTgId = telegramId || activeTg?.id || null;
  const cleanTgId = resolvedTgId ? String(resolvedTgId) : null;
  const resolvedUsername = activeTg?.username || username || null;
  const resolvedFirstName = activeTg?.first_name || firstName || null;
  const cleanUsername = resolvedUsername || resolvedFirstName || 'User';
  const now = Date.now();
  const txId = `tx_${userId}_${source.replace(/[^a-zA-Z0-9_-]/g, '_')}_${now}_${Math.random().toString(36).substring(2, 7)}`;

  // --- OPTIMISTIC LOCAL UPDATE ---
  try {
    const cached = localStorage.getItem('grmf_cached_profile');
    if (cached) {
      const profile = JSON.parse(cached);
      if (amount > 0) {
        profile.realBalances = profile.realBalances || {};
        profile.realBalances[tokenSymbol] = Number(((profile.realBalances[tokenSymbol] || 0) + amount).toFixed(6));
        if (balanceType === 'both') {
          profile.betaBalances = profile.betaBalances || {};
          profile.betaBalances[tokenSymbol] = Number(((profile.betaBalances[tokenSymbol] || 0) + amount).toFixed(6));
        }
      }
      if (xp > 0) {
        profile.xp = (profile.xp || 0) + xp;
      }
      applyDotNotationToObject(profile, extraUserUpdates || {});

      localStorage.setItem('grmf_cached_profile', JSON.stringify(profile));
      if (profile.betaBalances) {
        localStorage.setItem('grmf_cached_balances', JSON.stringify(profile.betaBalances));
      }
      if (tokenSymbol === 'GRMF' && profile.realBalances?.GRMF !== undefined) {
        localStorage.setItem('grmf_cached_real_grmf', String(profile.realBalances.GRMF));
      }
      window.dispatchEvent(new CustomEvent('grmf_local_profile_updated', { detail: profile }));
    }
  } catch (e) {
    console.warn('Optimistic local update failed:', e);
  }

  const buildNestedUserUpdates = () => {
    const flatUserUpdates: Record<string, any> = {
      lastActiveAt: serverTimestamp(),
      lastActiveTimestamp: now
    };

    if (cleanTgId && /^\d+$/.test(cleanTgId)) {
      flatUserUpdates.telegramId = Number(cleanTgId);
      flatUserUpdates.telegramIdStr = cleanTgId;
      flatUserUpdates.isTelegramMiniApp = true;
    }
    if (resolvedUsername && resolvedUsername !== 'User' && !resolvedUsername.startsWith('user_')) {
      flatUserUpdates.username = resolvedUsername;
      if (!resolvedUsername.includes(' ')) {
        flatUserUpdates.telegramUsername = resolvedUsername;
      }
    }
    if (resolvedFirstName) {
      flatUserUpdates.firstName = resolvedFirstName;
    }
    if (activeTg?.last_name) {
      flatUserUpdates.lastName = activeTg.last_name;
    }
    if (activeTg?.photo_url) {
      flatUserUpdates.photoUrl = activeTg.photo_url;
    }

    if (amount > 0) {
      flatUserUpdates[`realBalances.${tokenSymbol}`] = increment(amount);
      if (balanceType === 'both') {
        flatUserUpdates[`betaBalances.${tokenSymbol}`] = increment(amount);
      }
    }

    if (xp > 0) {
      flatUserUpdates.xp = increment(xp);
    }

    Object.entries(extraUserUpdates).forEach(([k, v]) => {
      flatUserUpdates[k] = v;
    });

    const nestedUserUpdates: Record<string, any> = {};
    applyDotNotationToObject(nestedUserUpdates, flatUserUpdates);
    return nestedUserUpdates;
  };

  try {
    const userRef = doc(db, 'users', userId);
    const txRef = doc(db, 'transactions', txId);
    const nestedUserUpdates = buildNestedUserUpdates();

    const txData = {
      id: txId,
      userId,
      telegramId: cleanTgId,
      username: cleanUsername,
      firstName: resolvedFirstName,
      source,
      rewardSource: source,
      amount,
      symbol: tokenSymbol,
      xp: xp || 0,
      timestamp: now,
      createdAt: serverTimestamp()
    };

    await runTransaction(db, async (transaction) => {
      transaction.set(userRef, nestedUserUpdates, { merge: true });
      transaction.set(txRef, txData, { merge: true });
    });

    return { success: true, txId };
  } catch (error: any) {
    try {
      const userRef = doc(db, 'users', userId);
      const txRef = doc(db, 'transactions', txId);
      const nestedUserUpdates = buildNestedUserUpdates();

      await setDoc(userRef, nestedUserUpdates, { merge: true });
      await setDoc(
        txRef,
        {
          id: txId,
          userId,
          telegramId: cleanTgId,
          username: cleanUsername,
          firstName: resolvedFirstName,
          source,
          rewardSource: source,
          amount,
          symbol: tokenSymbol,
          xp: xp || 0,
          timestamp: now,
          createdAt: serverTimestamp()
        },
        { merge: true }
      );

      return { success: true, txId };
    } catch (e: any) {
      return { success: true, txId, localOnly: true };
    }
  }
}
