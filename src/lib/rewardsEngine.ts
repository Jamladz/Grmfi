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
  balanceType?: 'real' | 'both';
  extraUserUpdates?: Record<string, any>;
}

export interface GrantRewardResult {
  success: boolean;
  message?: string;
  txId?: string;
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
 * 2. Update Global Assets (/global/assets)
 * 3. Update User Balances & Attributes (/users/{userId})
 * 4. Write Transaction Record (/transactions/{txId})
 */
export async function grantReward(options: GrantRewardOptions): Promise<GrantRewardResult> {
  const { userId, telegramId, username, firstName, source, amount, balanceType = 'both', extraUserUpdates = {} } = options;

  if (!userId || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    console.error("Invalid grantReward parameters:", { userId, amount });
    return { success: false, message: 'Invalid userId or reward amount' };
  }

  const cleanTgId = telegramId ? String(telegramId) : null;
  const cleanUsername = username || 'User';
  const now = Date.now();
  const txId = `tx_${userId}_${source.replace(/[^a-zA-Z0-9_-]/g, '_')}_${now}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const userRef = doc(db, 'users', userId);
    const globalAssetsRef = doc(db, 'global', 'assets');
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
      timestamp: now,
      createdAt: serverTimestamp()
    };

    // Build a nested payload to use with set merge
    const userPayload: Record<string, any> = {};
    
    // We start with the base updates in dot-notation and convert to nested
    const initialDotMap: Record<string, any> = {
      'realBalances.GRMF': increment(amount),
      'lastActiveAt': serverTimestamp(),
      'lastActiveTimestamp': now,
    };

    if (balanceType === 'both') {
      initialDotMap['betaBalances.GRMF'] = increment(amount);
    }

    // Combine with extra updates
    Object.entries(extraUserUpdates).forEach(([k, v]) => {
      initialDotMap[k] = v;
    });

    // Convert to nested object structure for proper Firestore merging
    applyDotNotationToObject(userPayload, initialDotMap);

    console.log(`[GrantReward] Attempting to grant ${amount} GRMF to ${userId} via ${source}`);

    // Execute atomic transaction
    await runTransaction(db, async (transaction) => {
      // 1. Update Global Assets
      transaction.set(globalAssetsRef, {
        totalDistributedTokens: increment(amount),
        totalRewardCount: increment(1),
        lastUpdatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Update User Document safely with deep merge
      transaction.set(userRef, userPayload, { merge: true });

      // 3. Save Transaction Record
      transaction.set(txRef, txData, { merge: true });
    });

    console.log(`[GrantReward] Success: ${txId}`);
    return { success: true, txId };
  } catch (error: any) {
    console.warn("Unified reward transaction fallback mode:", error);
    try {
      const userRef = doc(db, 'users', userId);
      const globalAssetsRef = doc(db, 'global', 'assets');
      const txRef = doc(db, 'transactions', txId);

      const userPayload: Record<string, any> = {};
      const initialDotMap: Record<string, any> = {
        'realBalances.GRMF': increment(amount),
        'lastActiveAt': serverTimestamp(),
        'lastActiveTimestamp': now,
      };

      if (balanceType === 'both') {
        initialDotMap['betaBalances.GRMF'] = increment(amount);
      }

      Object.entries(extraUserUpdates).forEach(([k, v]) => {
        initialDotMap[k] = v;
      });

      applyDotNotationToObject(userPayload, initialDotMap);

      await setDoc(globalAssetsRef, {
        totalDistributedTokens: increment(amount),
        totalRewardCount: increment(1),
        lastUpdatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(userRef, userPayload, { merge: true });

      await setDoc(txRef, {
        id: txId,
        userId,
        telegramId: cleanTgId,
        username: cleanUsername,
        firstName: firstName || null,
        source,
        rewardSource: source,
        amount,
        timestamp: now,
        createdAt: serverTimestamp()
      }, { merge: true });

      return { success: true, txId };
    } catch (e: any) {
      console.error("Unified reward error completely failed:", e);
      return { success: false, message: e.message || 'Failed to grant reward' };
    }
  }
}

