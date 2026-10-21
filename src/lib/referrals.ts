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
  orderBy,
  increment
} from 'firebase/firestore';
import { grantReward } from './rewardsEngine';

const LOCAL_STORAGE_KEY = 'grmf_pending_referrer';

export const extractAndStoreReferralCode = (): string | null => {
  try {
    const tg = (window as any).Telegram?.WebApp;
    let rawParam: string | null = null;
    
    if (tg?.initDataUnsafe?.start_param) {
      rawParam = String(tg.initDataUnsafe.start_param);
    }
    
    if (!rawParam && tg?.initData) {
      const parsed = new URLSearchParams(tg.initData);
      rawParam = parsed.get('start_param') || parsed.get('startapp');
    }
    
    if (!rawParam) {
      const urlParams = new URLSearchParams(window.location.search);
      rawParam = urlParams.get('startapp') || urlParams.get('start') || urlParams.get('ref');
    }
    
    if (!rawParam) {
      rawParam = localStorage.getItem(LOCAL_STORAGE_KEY);
    }
    
    if (!rawParam) return null;
    
    // Clean prefix 'ref_'
    const cleanCode = String(rawParam).replace(/^(ref_|r_|tg_)/, '').trim();
    
    if (cleanCode && cleanCode !== 'null' && cleanCode !== 'undefined' && cleanCode !== '') {
      localStorage.setItem(LOCAL_STORAGE_KEY, cleanCode);
      return cleanCode;
    }
  } catch (e) {
    console.error("Error extracting referral code:", e);
  }
  return null;
};

export const processReferral = async (
  currentUid: string,
  currentUserData: any,
  tgUser?: any
): Promise<{ success: boolean; reward?: number; referrerUsername?: string; isPremium?: boolean }> => {
  if (!currentUid) return { success: false };
  
  if (currentUserData?.referredBy || currentUserData?.hasProcessedReferral) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return { success: false };
  }
  
  const referrerCode = extractAndStoreReferralCode();
  if (!referrerCode) return { success: false };
  
  // Ignore self-referral
  if (referrerCode === currentUid) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return { success: false };
  }
  
  const WELCOME_BONUS = 100;
  const REFERRER_REWARD = 250;
  
  try {
    const referrerDocId = referrerCode;
    let referrerUsername = 'Friend';

    await runTransaction(db, async (transaction) => {
      const referrerRef = doc(db, 'users', referrerDocId);
      const referredRef = doc(db, 'users', currentUid);
      
      const [referrerDoc, referredDoc] = await Promise.all([
        transaction.get(referrerRef),
        transaction.get(referredRef)
      ]);
      
      // Make sure the referred user hasn't been referred yet
      if (referredDoc.exists() && referredDoc.data().referredBy) {
        throw new Error("User already referred");
      }
      
      const referrerData = referrerDoc.exists() ? referrerDoc.data() : {};
      const referredData = referredDoc.exists() ? referredDoc.data() : {};
      
      referrerUsername = referrerData.username || referrerData.telegramUsername || 'Friend';
      
      const newUsername = tgUser?.username || tgUser?.first_name || referredData.username || `user_${currentUid.slice(0, 5)}`;
      const tgId = tgUser?.id || referredData.telegramId || null;
      
      // 1. Update Referred User (Current User)
      const referredUpdate = {
        referredBy: referrerDocId,
        hasProcessedReferral: true,
        'realBalances.GRMF': increment(WELCOME_BONUS),
        'betaBalances.GRMF': increment(WELCOME_BONUS),
        ...(!referredDoc.exists() && { 
            createdAt: serverTimestamp(), 
            telegramId: tgId, 
            username: newUsername,
            referralsCount: 0,
            earnedReferralCoins: 0,
            claimedMilestones: []
        })
      };
      
      if (referredDoc.exists()) {
        transaction.update(referredRef, referredUpdate);
      } else {
        transaction.set(referredRef, referredUpdate, { merge: true });
      }
      
      // 2. Update Referrer User
      const referrerUpdate = {
        'realBalances.GRMF': increment(REFERRER_REWARD),
        'betaBalances.GRMF': increment(REFERRER_REWARD),
        referralsCount: increment(1),
        earnedReferralCoins: increment(REFERRER_REWARD),
        ...(!referrerDoc.exists() && { 
            createdAt: serverTimestamp(),
            username: `user_${referrerDocId.slice(0, 5)}`,
            claimedMilestones: []
        })
      };
      
      if (referrerDoc.exists()) {
        transaction.update(referrerRef, referrerUpdate);
      } else {
        transaction.set(referrerRef, referrerUpdate, { merge: true });
      }
      
      // 3. Create a public record in "referrals" collection
      const referralRecordRef = doc(collection(db, 'referrals'));
      transaction.set(referralRecordRef, {
        referrerId: referrerDocId,
        referredId: currentUid,
        referredUsername: newUsername,
        referredTelegramId: tgId,
        reward: REFERRER_REWARD,
        createdAt: serverTimestamp()
      });

      // 4. Update Global Stats
      const statsRef = doc(db, 'global', 'stats');
      transaction.set(statsRef, {
        totalReferrals: increment(1),
        totalGrmf: increment(WELCOME_BONUS + REFERRER_REWARD),
        lastUpdatedAt: serverTimestamp()
      }, { merge: true });
    });
    
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return { success: true, reward: WELCOME_BONUS, referrerUsername };
  } catch (err: any) {
    console.error("Transaction failed:", err);
    return { success: false };
  }
};

export interface Milestone {
  id: string;
  targetCount: number;
  rewardCoins: number;
  
}

export const REFERRAL_MILESTONES: Milestone[] = [
  { id: 'ref_3', targetCount: 3, rewardCoins: 500 },
  { id: 'ref_5', targetCount: 5, rewardCoins: 1000 },
  { id: 'ref_10', targetCount: 10, rewardCoins: 2500 },
  { id: 'ref_25', targetCount: 25, rewardCoins: 7000 },
];

export const claimMilestone = async (userId: string, milestone: Milestone): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    
    const data = userSnap.data();
    const count = data.referralsCount || 0;
    const claimed = data.claimedMilestones || [];
    
    if (count < milestone.targetCount) {
      console.warn("Milestone claim failed: not enough referrals", { count, target: milestone.targetCount });
      return false;
    }
    if (claimed.includes(milestone.id)) {
      console.warn("Milestone claim failed: already claimed", { milestoneId: milestone.id });
      return false;
    }
    
    const res = await grantReward({
      userId,
      source: `milestone_${milestone.id}`,
      amount: milestone.rewardCoins,
      balanceType: 'both',
      extraUserUpdates: {
        claimedMilestones: [...claimed, milestone.id]
      }
    });

    return res.success;
  } catch (err) {
    console.error("Claim milestone failed:", err);
    return false;
  }
};

export const getReferredFriends = async (userId: string) => {
  const q = query(
    collection(db, 'referrals'),
    where('referrerId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const syncReferralsForUser = async (userUid: string, userProfile: any) => {
  // Now using runTransaction in processReferral, so this can be a no-op or implemented later
};
