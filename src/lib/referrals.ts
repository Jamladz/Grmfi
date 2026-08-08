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
  orderBy
} from 'firebase/firestore';

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
    const cleanCode = String(rawParam).replace(/^ref_/, '').replace(/^tg_/, '').trim();
    
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
  if (referrerCode === currentUid || (tgUser?.id && referrerCode === String(tgUser.id))) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return { success: false };
  }
  
  const WELCOME_BONUS = 100;
  const REFERRER_REWARD = 250;
  
  try {
    await runTransaction(db, async (transaction) => {
      let referrerDocId = referrerCode;
      
      // Attempt to resolve if it's a telegram ID
      const numCode = Number(referrerCode);
      if (!isNaN(numCode)) {
        const qNum = query(collection(db, 'users'), where('telegramId', '==', numCode));
        const snapNum = await getDocs(qNum);
        if (!snapNum.empty) {
          referrerDocId = snapNum.docs[0].id;
        }
      }
      
      const referrerRef = doc(db, 'users', referrerDocId);
      const referredRef = doc(db, 'users', currentUid);
      
      const [referrerDoc, referredDoc] = await Promise.all([
        transaction.get(referrerRef),
        transaction.get(referredRef)
      ]);
      
      if (!referrerDoc.exists()) {
        throw new Error("Referrer does not exist.");
      }
      
      // Make sure the referred user hasn't been referred yet
      if (referredDoc.exists() && referredDoc.data().referredBy) {
        throw new Error("User already referred");
      }
      
      const referrerData = referrerDoc.data();
      const referredData = referredDoc.exists() ? referredDoc.data() : {};
      
      const newUsername = tgUser?.username || referredData?.username || `user_${currentUid.slice(0, 5)}`;
      const tgId = tgUser?.id || referredData?.telegramId || null;
      
      // 1. Update Referred User (Current User)
      const referredUpdate = {
        referredBy: referrerDocId,
        hasProcessedReferral: true,
        'realBalances.GRMF': (referredData?.realBalances?.GRMF || 0) + WELCOME_BONUS,
        'betaBalances.GRMF': (referredData?.betaBalances?.GRMF || 0) + WELCOME_BONUS,
        ...(!referredDoc.exists() && { createdAt: serverTimestamp() })
      };
      
      if (referredDoc.exists()) {
        transaction.update(referredRef, referredUpdate);
      } else {
        transaction.set(referredRef, referredUpdate);
      }
      
      // 2. Update Referrer User
      transaction.update(referrerRef, {
        'realBalances.GRMF': (referrerData?.realBalances?.GRMF || 0) + REFERRER_REWARD,
        'betaBalances.GRMF': (referrerData?.betaBalances?.GRMF || 0) + REFERRER_REWARD,
        referralsCount: (referrerData?.referralsCount || 0) + 1,
        earnedReferralCoins: (referrerData?.earnedReferralCoins || 0) + REFERRER_REWARD
      });
      
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
    });
    
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return { success: true, reward: WELCOME_BONUS };
  } catch (err) {
    console.error("Transaction failed:", err);
    return { success: false };
  }
};

export interface Milestone {
  id: string;
  targetCount: number;
  rewardCoins: number;
  vipDays?: number;
}

export const REFERRAL_MILESTONES: Milestone[] = [
  { id: 'ref_3', targetCount: 3, rewardCoins: 500, vipDays: 1 },
  { id: 'ref_5', targetCount: 5, rewardCoins: 1000, vipDays: 3 },
  { id: 'ref_10', targetCount: 10, rewardCoins: 2500, vipDays: 7 },
  { id: 'ref_25', targetCount: 25, rewardCoins: 7000, vipDays: 30 },
];

export const claimMilestone = async (userId: string, milestone: Milestone): Promise<boolean> => {
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("User not found");
      
      const data = userDoc.data();
      const count = data.referralsCount || 0;
      const claimed = data.claimedMilestones || [];
      
      if (count < milestone.targetCount) {
        throw new Error("Not enough referrals");
      }
      if (claimed.includes(milestone.id)) {
        throw new Error("Milestone already claimed");
      }
      
      transaction.update(userRef, {
        'realBalances.GRMF': (data.realBalances?.GRMF || 0) + milestone.rewardCoins,
        'betaBalances.GRMF': (data.betaBalances?.GRMF || 0) + milestone.rewardCoins,
        claimedMilestones: [...claimed, milestone.id],
        ...(milestone.vipDays ? { vipDays: (data.vipDays || 0) + milestone.vipDays } : {})
      });
    });
    return true;
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
