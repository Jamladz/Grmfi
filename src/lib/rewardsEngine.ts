import { 
  db 
} from './firebase';
import { 
  doc, 
  setDoc, 
  updateDoc,
  getDoc,
  increment, 
  serverTimestamp, 
  runTransaction
} from 'firebase/firestore';

export interface GrantRewardOptions {
  userId: string;
  telegramId?: string | number | null;
  username?: string | null;
  firstName?: string | null;
  source: string; // e.g. 'welcome_bonus', 'daily_login', 'task_daily-checkin', 'daily_box', 'referral_referrer', 'referral_friend', 'testnet_swap', 'admin_grant'
  amount: number;
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

/**
 * Helper to convert a nested object map into dot-notation strings
 * e.g. { taskProgress: { id: { status: 'completed' } } } -> { 'taskProgress.id.status': 'completed' }
 */
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

/**
 * Helper to convert a dot-notated map (e.g. { 'taskProgress.id.status': 'completed' })
 * into nested objects (e.g. { taskProgress: { id: { status: 'completed' } } })
 */
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
 * Every reward distribution in the app MUST follow this single flow:
 * 1. Validate reward parameters
 * 2. Update User Balances & Attributes (/users/{userId})
 * 3. Write Transaction Record (/transactions/{txId})
 */
export async function grantReward(options: GrantRewardOptions): Promise<GrantRewardResult> {
  const { userId, telegramId, username, firstName, source, amount, xp = 0, balanceType = 'both', extraUserUpdates = {} } = options;

  if (!userId || typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    console.error("Invalid grantReward parameters:", { userId, amount });
    return { success: false, message: 'Invalid userId or reward amount' };
  }

  const cleanTgId = telegramId ? String(telegramId) : null;
  const cleanUsername = username || 'User';
  const now = Date.now();
  const txId = `tx_${userId}_${source.replace(/[^a-zA-Z0-9_-]/g, '_')}_${now}_${Math.random().toString(36).substring(2, 7)}`;

  // --- OPTIMISTIC LOCAL UPDATE ---
  try {
    const cached = localStorage.getItem('grmf_cached_profile');
    if (cached) {
      const profile = JSON.parse(cached);
      if (amount > 0) {
        profile.realBalances = profile.realBalances || {};
        profile.realBalances.GRMF = (profile.realBalances.GRMF || 0) + amount;
        if (balanceType === 'both') {
          profile.betaBalances = profile.betaBalances || {};
          profile.betaBalances.GRMF = (profile.betaBalances.GRMF || 0) + amount;
        }
      }
      if (xp > 0) {
        profile.xp = (profile.xp || 0) + xp;
      }
      // Also apply extraUserUpdates optimistically if they are simple values
      applyDotNotationToObject(profile, extraUserUpdates || {});
      
      localStorage.setItem('grmf_cached_profile', JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('grmf_local_profile_updated', { detail: profile }));
    }
  } catch (e) {
    console.warn('Optimistic local update failed:', e);
  }
  // -------------------------------

  try {
    const userRef = doc(db, 'users', userId);
    const txRef = doc(db, 'transactions', txId);

    const txData = {
      id: txId,
      userId,
      telegramId: cleanTgId,
      username: cleanUsername,
      firstName: firstName || null,
      source,
      rewardSource: source,
      amount,
      xp: xp || 0,
      timestamp: now,
      createdAt: serverTimestamp()
    };

    // Build a flat payload to use with set merge to ensure deep merging of nested maps
    const flatUserUpdates: Record<string, any> = {
      'lastActiveAt': serverTimestamp(),
      'lastActiveTimestamp': now,
    };

    if (amount > 0) {
      flatUserUpdates['realBalances.GRMF'] = increment(amount);
      if (balanceType === 'both') {
        flatUserUpdates['betaBalances.GRMF'] = increment(amount);
      }
    }

    if (xp > 0) {
      flatUserUpdates['xp'] = increment(xp);
    }

    // Combine with extra updates (these are usually already dot-notation)
    Object.entries(extraUserUpdates).forEach(([k, v]) => {
      flatUserUpdates[k] = v;
    });

    console.log(`[GrantReward] Attempting to grant ${amount} GRMF & ${xp} XP to ${userId} via ${source}`);

    // Execute atomic transaction
    await runTransaction(db, async (transaction) => {
      // 1. Update User Document safely with flat keys for deep merge
      transaction.set(userRef, flatUserUpdates, { merge: true });

      // 2. Save Transaction Record
      transaction.set(txRef, txData, { merge: true });
    });

    console.log(`[GrantReward] Success: ${txId}`);
    return { success: true, txId };
  } catch (error: any) {
    console.warn("Unified reward transaction fallback mode:", error?.message || error);
    
    // If quota exceeded or offline, update local storage cache so user experience remains uninterrupted
    if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota exceeded')) {
      try {
        const cached = localStorage.getItem('grmf_cached_profile');
        if (cached) {
          const profile = JSON.parse(cached);
          if (amount > 0) {
            profile.realBalances = profile.realBalances || {};
            profile.realBalances.GRMF = (profile.realBalances.GRMF || 0) + amount;
            if (balanceType === 'both') {
              profile.betaBalances = profile.betaBalances || {};
              profile.betaBalances.GRMF = (profile.betaBalances.GRMF || 0) + amount;
            }
          }
          if (xp > 0) {
            profile.xp = (profile.xp || 0) + xp;
          }
          localStorage.setItem('grmf_cached_profile', JSON.stringify(profile));
        }
      } catch (e) {}
      return { success: true, txId, localOnly: true };
    }

    try {
      const userRef = doc(db, 'users', userId);
      const txRef = doc(db, 'transactions', txId);

      const flatUserUpdates: Record<string, any> = {
        'lastActiveAt': serverTimestamp(),
        'lastActiveTimestamp': now,
      };

      if (amount > 0) {
        flatUserUpdates['realBalances.GRMF'] = increment(amount);
        if (balanceType === 'both') {
          flatUserUpdates['betaBalances.GRMF'] = increment(amount);
        }
      }

      if (xp > 0) {
        flatUserUpdates['xp'] = increment(xp);
      }

      Object.entries(extraUserUpdates).forEach(([k, v]) => {
        flatUserUpdates[k] = v;
      });

      await setDoc(userRef, flatUserUpdates, { merge: true });

      await setDoc(txRef, {
        id: txId,
        userId,
        telegramId: cleanTgId,
        username: cleanUsername,
        firstName: firstName || null,
        source,
        rewardSource: source,
        amount,
        xp: xp || 0,
        timestamp: now,
        createdAt: serverTimestamp()
      }, { merge: true });

      return { success: true, txId };
    } catch (e: any) {
      console.warn("Unified reward error fallback completed locally:", e?.message);
      return { success: true, txId, localOnly: true };
    }
  }
}

