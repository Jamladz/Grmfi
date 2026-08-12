import re

with open('src/lib/referrals.ts', 'r') as f:
    content = f.read()

new_process = """export const processReferral = async (
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
    });
    
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return { success: true, reward: WELCOME_BONUS, referrerUsername };
  } catch (err: any) {
    console.error("Transaction failed:", err);
    return { success: false };
  }
};"""

# Replace the old processReferral with new one using regex
new_content = re.sub(r'export const processReferral = async \(.*?\n\};\n', new_process + '\n', content, flags=re.DOTALL)

with open('src/lib/referrals.ts', 'w') as f:
    f.write(new_content)
