import { 
  db 
} from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  updateDoc, 
  increment, 
  arrayUnion, 
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'grmf_pending_referrer';

/**
 * Extracts referral code from all possible Telegram Mini App entry points:
 * 1. window.Telegram.WebApp.initDataUnsafe.start_param
 * 2. window.Telegram.WebApp.initData query parameters
 * 3. URL search params (?startapp=, ?tgWebAppStartParam=, ?start=, ?ref=)
 * 4. URL hash params (#tgWebAppStartParam=, etc.)
 * 5. LocalStorage fallback
 */
export const extractAndStoreReferralCode = (): string | null => {
  try {
    const tg = (window as any).Telegram?.WebApp;
    let rawParam: string | null = null;

    // 1. Direct Telegram WebApp start_param
    if (tg?.initDataUnsafe?.start_param) {
      rawParam = String(tg.initDataUnsafe.start_param);
    }

    // 2. Parse inside initData string if available
    if (!rawParam && tg?.initData) {
      const parsed = new URLSearchParams(tg.initData);
      rawParam = parsed.get('start_param') || parsed.get('startapp') || parsed.get('tgWebAppStartParam');
    }

    // 3. Search parameters in window.location
    if (!rawParam) {
      const urlParams = new URLSearchParams(window.location.search);
      rawParam = urlParams.get('startapp') 
        || urlParams.get('tgWebAppStartParam') 
        || urlParams.get('start_param') 
        || urlParams.get('start') 
        || urlParams.get('ref');
    }

    // 4. Hash parameters
    if (!rawParam && window.location.hash) {
      const hashStr = window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hashStr);
      rawParam = hashParams.get('tgWebAppStartParam') 
        || hashParams.get('startapp') 
        || hashParams.get('start_param') 
        || hashParams.get('start') 
        || hashParams.get('ref');
    }

    // 5. Check localStorage fallback
    if (!rawParam) {
      rawParam = localStorage.getItem(LOCAL_STORAGE_KEY);
    }

    if (!rawParam) return null;

    // Clean prefix: ref_tg_1368899842 -> 1368899842
    const cleanCode = String(rawParam)
      .replace(/^ref_tg_/, '')
      .replace(/^ref_/, '')
      .replace(/^tg_/, '')
      .trim();

    if (cleanCode && cleanCode !== 'null' && cleanCode !== 'undefined' && cleanCode !== '') {
      localStorage.setItem(LOCAL_STORAGE_KEY, cleanCode);
      return cleanCode;
    }
  } catch (e) {
    console.error("Error extracting referral code:", e);
  }
  return null;
};

/**
 * Searches Firestore for the referrer's user document across all potential identifiers
 */
export const findReferrerDoc = async (referrerCode: string) => {
  if (!referrerCode) return null;
  const usersRef = collection(db, 'users');

  // 1. Direct document ID lookup
  try {
    const directSnap = await getDoc(doc(db, 'users', referrerCode));
    if (directSnap.exists()) {
      return { ref: directSnap.ref, data: directSnap.data(), id: directSnap.id };
    }
  } catch (e) {
    // Continue searching
  }

  // 2. Search telegramId as Number
  const numCode = Number(referrerCode);
  if (!isNaN(numCode)) {
    try {
      const qNum = query(usersRef, where('telegramId', '==', numCode));
      const snapNum = await getDocs(qNum);
      if (!snapNum.empty) {
        return { ref: snapNum.docs[0].ref, data: snapNum.docs[0].data(), id: snapNum.docs[0].id };
      }
    } catch (e) {
      // Continue searching
    }
  }

  // 3. Search telegramId as String
  try {
    const qStr = query(usersRef, where('telegramId', '==', String(referrerCode)));
    const snapStr = await getDocs(qStr);
    if (!snapStr.empty) {
      return { ref: snapStr.docs[0].ref, data: snapStr.docs[0].data(), id: snapStr.docs[0].id };
    }
  } catch (e) {
    // Continue searching
  }

  // 4. Search username or telegramUsername
  const cleanUsername = referrerCode.toLowerCase().replace(/^@/, '');
  try {
    const qTgUser = query(usersRef, where('telegramUsername', '==', cleanUsername));
    const snapTgUser = await getDocs(qTgUser);
    if (!snapTgUser.empty) {
      return { ref: snapTgUser.docs[0].ref, data: snapTgUser.docs[0].data(), id: snapTgUser.docs[0].id };
    }
  } catch (e) {
    // Continue searching
  }

  try {
    const qUser = query(usersRef, where('username', '==', cleanUsername));
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      return { ref: snapUser.docs[0].ref, data: snapUser.docs[0].data(), id: snapUser.docs[0].id };
    }
  } catch (e) {
    // Continue searching
  }

  return null;
};

/**
 * Main function to process referrals reliably
 */
export const processReferral = async (
  currentUid: string,
  currentUserData: any,
  tgUser?: any
): Promise<boolean> => {
  if (!currentUid) return false;

  // Don't re-process if already processed or has referredBy set
  if (currentUserData?.hasProcessedReferral || currentUserData?.referredBy) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return false;
  }

  const referrerCode = extractAndStoreReferralCode();
  if (!referrerCode) return false;

  const currentTgId = tgUser?.id ? String(tgUser.id) : (currentUserData?.telegramId ? String(currentUserData.telegramId) : null);
  const currentTgUsername = (tgUser?.username || currentUserData?.telegramUsername || currentUserData?.username || '').toLowerCase().replace(/^@/, '');

  // Ignore Self-Referral
  if (
    referrerCode === currentUid || 
    (currentTgId && referrerCode === currentTgId) ||
    (currentTgUsername && referrerCode.toLowerCase().replace(/^@/, '') === currentTgUsername)
  ) {
    console.log("Self referral detected and ignored.");
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    await updateDoc(doc(db, 'users', currentUid), { hasProcessedReferral: true }).catch(() => {});
    return false;
  }

  try {
    const referrer = await findReferrerDoc(referrerCode);

    if (!referrer || referrer.id === currentUid) {
      console.warn(`Referrer document not found for code: ${referrerCode}`);
      // Do NOT set hasProcessedReferral = true if code looks like a real ID, allow retry when referrer creates account
      return false;
    }

    const referrerDocRef = referrer.ref;
    const referrerDocId = referrer.id;
    const referrerData = referrer.data;

    const newUsername = currentUserData?.username || tgUser?.username || `user_${currentUid.slice(0, 5)}`;
    const isPremium = Boolean(tgUser?.is_premium || currentUserData?.isPremium);

    const referrerReward = isPremium ? 100 : 30;
    const friendReward = isPremium ? 50 : 10;

    // 1. Audit document in /referrals collection
    const refAuditId = `${referrerDocId}_${currentUid}`;
    const refAuditRef = doc(db, 'referrals', refAuditId);

    await setDoc(refAuditRef, {
      referralId: refAuditId,
      referrerId: referrerDocId,
      referrerTelegramId: referrerData.telegramId || null,
      referredUid: currentUid,
      referredUsername: newUsername,
      referredTelegramId: currentTgId || null,
      isPremium: isPremium,
      reward: referrerReward,
      friendReward: friendReward,
      createdAt: serverTimestamp()
    }, { merge: true });

    // 2. Update Referrer User Record
    const newInvitedItem = {
      uid: currentUid,
      username: newUsername,
      telegramId: currentTgId || null,
      isPremium: isPremium,
      joinedAt: new Date().toISOString(),
      reward: referrerReward
    };

    // Filter out duplicates if invitedUsers already has this uid
    const existingInvited = referrerData.invitedUsers || [];
    const alreadyInList = existingInvited.some((u: any) => u.uid === currentUid || (currentTgId && u.telegramId === currentTgId));

    if (!alreadyInList) {
      await updateDoc(referrerDocRef, {
        'betaBalances.GRMF': increment(referrerReward),
        'realBalances.GRMF': increment(referrerReward),
        'referralEarnings.GRMF': increment(referrerReward),
        inviteCount: increment(1),
        invitedUsers: arrayUnion(newInvitedItem)
      });
    }

    // 3. Update Referred Friend (Current User)
    const currentUserRef = doc(db, 'users', currentUid);
    await updateDoc(currentUserRef, {
      referredBy: referrerDocId,
      hasProcessedReferral: true,
      referralBonusReceived: friendReward,
      'betaBalances.GRMF': increment(friendReward),
      'realBalances.GRMF': increment(friendReward)
    });

    // 4. Cleanup localStorage
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    console.log(`Referral processed successfully! Referrer (+${referrerReward} GRMF), Referred (+${friendReward} GRMF)`);
    return true;
  } catch (err) {
    console.error("Error processing referral:", err);
    return false;
  }
};

/**
 * Background sync for referrers: checks /referrals collection to ensure all invites are counted
 */
export const syncReferralsForUser = async (userUid: string, userProfile: any) => {
  if (!userUid || !userProfile) return;

  try {
    const tgId = userProfile.telegramId ? String(userProfile.telegramId) : null;
    const referralsRef = collection(db, 'referrals');

    // Query referrals by referrerId or referrerTelegramId
    let q = query(referralsRef, where('referrerId', '==', userUid));
    let snap = await getDocs(q);

    if (snap.empty && tgId) {
      q = query(referralsRef, where('referrerTelegramId', '==', tgId));
      snap = await getDocs(q);
    }

    if (snap.empty) return;

    const existingInvited = userProfile.invitedUsers || [];
    const existingUids = new Set(existingInvited.map((i: any) => i.uid));
    
    let newRewardsToGain = 0;
    const newItemsToAdd: any[] = [];

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (!existingUids.has(data.referredUid)) {
        newItemsToAdd.push({
          uid: data.referredUid,
          username: data.referredUsername || 'Telegram User',
          telegramId: data.referredTelegramId || null,
          isPremium: Boolean(data.isPremium),
          joinedAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
          reward: data.reward || 30
        });
        newRewardsToGain += (data.reward || 30);
      }
    });

    if (newItemsToAdd.length > 0) {
      const userRef = doc(db, 'users', userUid);
      await updateDoc(userRef, {
        'betaBalances.GRMF': increment(newRewardsToGain),
        'realBalances.GRMF': increment(newRewardsToGain),
        'referralEarnings.GRMF': increment(newRewardsToGain),
        inviteCount: increment(newItemsToAdd.length),
        invitedUsers: arrayUnion(...newItemsToAdd)
      });
      console.log(`Synced ${newItemsToAdd.length} missing referrals for user ${userUid}`);
    }
  } catch (err) {
    console.error("Error syncing referrals:", err);
  }
};
