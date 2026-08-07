import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { 
  ArrowLeftRight, 
  Wallet as WalletIcon, 
  Trophy, 
  ListTodo,
  User,
  Zap,
  Award,
  UserCheck,
  Sparkles
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
import { TasksView } from './components/TasksView';
import { AirdropView } from './components/AirdropView';
import { ProfileView } from './components/ProfileView';
import { ReferralsView } from './components/ReferralsView';
import { AdminView } from './components/AdminView';
import { TokenSelectModal } from './components/TokenSelectModal';
import { Users, ShieldCheck } from 'lucide-react';

import { TOKENS, POOLS } from './data/tokens';
import { Token, TransactionState, WalletState } from './types';

type ActiveView = 'swap' | 'tasks' | 'airdrop' | 'profile' | 'referrals' | 'admin';

function normalizeAndSanitizeUserData(rawData: any) {
  if (!rawData || typeof rawData !== 'object') return { data: rawData, dirty: false, keysToRemove: [] };
  
  // Create a shallow clone to avoid mutating the original Firestore snapshot directly
  const data = { ...rawData };
  let dirty = false;
  const keysToRemove: string[] = [];

  Object.keys(rawData).forEach(key => {
    if (key.includes('.')) {
      dirty = true;
      keysToRemove.push(key);
      const parts = key.split('.');
      let target = data;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!target[p] || typeof target[p] !== 'object') {
          target[p] = {};
        }
        target = target[p];
      }
      const last = parts[parts.length - 1];
      const val = rawData[key];

      if (typeof val === 'number' && typeof target[last] === 'number') {
        target[last] += val;
      } else if (target[last] === undefined || target[last] === null) {
        target[last] = val;
      }
      delete data[key];
    }
  });

  return { data, dirty, keysToRemove };
}

function App() {
  const [tonConnectUI] = useTonConnectUI();
  // Initialize Telegram WebApp data immediately
  const tg = (window as any).Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;
  
  // Professional initialization
  useEffect(() => {
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        // Set header color to match app theme
        tg.setHeaderColor?.('#ffffff');
        // Enable closing confirmation to prevent accidental swipes
        tg.enableClosingConfirmation?.();
      } catch (e) {
        console.warn("Telegram WebApp initialization error:", e);
      }
    }
  }, [tg]);

  const [activeView, setActiveView] = useState<ActiveView>('swap');
  
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]); // GRMF (Top)
  const [toToken, setToToken] = useState<Token>(TOKENS[1]); // GRAM (Bottom)
  const [fromAmount, setFromAmount] = useState<string>('');
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
  const [selectingSide, setSelectingSide] = useState<'from' | 'to' | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [txState, setTxState] = useState<TransactionState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);

  // Derived Telegram User info for instant display
  const instantTgUsername = tgUser?.username || (
    tgUser?.first_name ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`.trim() : null
  );

  // Hydrate initial state from localStorage cache to prevent zero flash on restart
  const [userProfile, setUserProfile] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('grmf_cached_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          username: instantTgUsername || parsed.username,
          telegramUsername: instantTgUsername || parsed.telegramUsername
        };
      }
    } catch (e) {}
    return instantTgUsername ? {
      username: instantTgUsername,
      telegramUsername: instantTgUsername,
      photoUrl: tgUser?.photo_url || null,
      telegramId: tgUser?.id || null,
    } : null;
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
  const [isAppReady, setIsAppReady] = useState(true);

  // Rewards Configuration
  const WELCOME_REWARD = 5000;
  const DAILY_REWARD_REAL = 5;

  // Admin access check for sekanedr_is
  const rawTgUsername = tgUser?.username || userProfile?.telegramUsername || userProfile?.username || '';
  const sanitizedTgUsername = rawTgUsername.toLowerCase().replace(/^@/, '').trim();
  const isAdmin = sanitizedTgUsername === 'sekanedr_is' || auth.currentUser?.email === 'sekanedrmessaif@gmail.com';

  // Helper function: Resolve permanent, immutable user document ID across reloads
  const resolveUserDocId = async (user: any): Promise<string> => {
    const currentTgId = tgUser?.id ? String(tgUser.id) : null;
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

    const finalId = storedDocId || user.uid;
    localStorage.setItem('grmf_persistent_doc_id', finalId);
    return finalId;
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const detectedUsername = instantTgUsername;
        const userDocId = await resolveUserDocId(user);
        const userRef = doc(db, 'users', userDocId);

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

        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const rawData = docSnap.data();
            const { data, dirty, keysToRemove } = normalizeAndSanitizeUserData(rawData);
            const fullProfile = { id: userDocId, ...data };
            setUserProfile(fullProfile);
            setBalances(data.betaBalances || { GRMF: 0, GRAM: 0, USDT: 0, NOT: 0, DOGS: 0, HMSTR: 0 });
            setRealGrmf(data.realBalances?.GRMF || 0);

            // If corrupt/legacy dot keys were found in Firestore, repair document permanently
            if (dirty) {
              const cleanupPayload = keysToRemove.reduce((acc: any, k) => {
                acc[k] = deleteField();
                return acc;
              }, {});

              const repairPayload = {
                ...flattenObjectToDotNotation({
                  realBalances: data.realBalances || {},
                  betaBalances: data.betaBalances || {},
                  taskProgress: data.taskProgress || {}
                }),
                ...cleanupPayload
              };

              updateDoc(userRef, repairPayload).catch(err => console.warn("Auto-healing user doc failed:", err));
            }

            // Persist locally for instant loading upon re-entry
            try {
              localStorage.setItem('grmf_cached_profile', JSON.stringify(fullProfile));
              localStorage.setItem('grmf_cached_balances', JSON.stringify(data.betaBalances || {}));
              localStorage.setItem('grmf_cached_real_grmf', String(data.realBalances?.GRMF || 0));
            } catch (e) {}

            // 1. Activity Persistence: Track last active and Daily login bonus
            const now = Date.now();
            const lastActive = data.lastActiveTimestamp || 0;
            const lastLoginBonusAt = data.lastLoginBonusTimestamp || 0;
            
            const isNewDay = new Date(now).toDateString() !== new Date(lastLoginBonusAt).toDateString();
            
            if (isNewDay && data.hasCollectedWelcomeBonus) {
              grantReward({
                userId: userDocId,
                telegramId: tgUser?.id || data.telegramId,
                username: data.username || data.telegramUsername,
                firstName: tgUser?.first_name || data.firstName,
                source: 'daily_login',
                amount: DAILY_REWARD_REAL,
                balanceType: 'both',
                extraUserUpdates: {
                  lastLoginBonusTimestamp: now,
                  lastActiveAt: serverTimestamp(),
                  lastActiveTimestamp: now
                }
              });
              console.log("Daily reward credited for returning user!");
            } else if (now - lastActive > 5 * 60 * 1000) { 
              updateDoc(userRef, {
                lastActiveAt: serverTimestamp(),
                lastActiveTimestamp: now
              });
            }

            // Automatically update Telegram User Info (username, firstName, telegramId) if changed in Telegram
            const tgUsernameClean = tgUser?.username || null;
            const tgFirstNameClean = tgUser?.first_name || null;
            const tgIdClean = tgUser?.id || null;

            if (tgUser && (
              (tgUsernameClean && data.telegramUsername !== tgUsernameClean) ||
              (tgFirstNameClean && data.firstName !== tgFirstNameClean) ||
              (tgIdClean && data.telegramId !== tgIdClean)
            )) {
              setDoc(userRef, {
                ...(tgUsernameClean ? { username: tgUsernameClean, telegramUsername: tgUsernameClean } : {}),
                ...(tgFirstNameClean ? { firstName: tgFirstNameClean } : {}),
                ...(tgIdClean ? { telegramId: tgIdClean } : {})
              }, { merge: true });
            }
            
            // Process referral if pending
            if (!data.hasProcessedReferral) {
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
            } else if (
              data.referralBonusReceived && 
              !data.hasSeenReferralRewardModal && 
              !localStorage.getItem(`seen_ref_modal_${userDocId}`)
            ) {
              setReferralBonusModal({
                show: true,
                reward: data.referralBonusReceived,
                referrerName: data.referredByName || 'Friend',
                isPremium: Boolean(data.isPremium)
              });
            }

            // Sync referrals in background for referrer
            syncReferralsForUser(userDocId, data);

            // Welcome Bonus logic
            if (!data.hasCollectedWelcomeBonus && !localStorage.getItem(`bonus_collected_${userDocId}`)) {
              setShowWelcomeModal(true);
            } else {
              setShowWelcomeModal(false);
            }
          } else {
            // Create initial profile with Telegram data using persistent userDocId
            const finalUsername = detectedUsername || ('user_' + userDocId.slice(-6));
            const initialData = {
              username: finalUsername,
              telegramUsername: detectedUsername || null,
              telegramId: tgUser?.id || null,
              photoUrl: tgUser?.photo_url || null,
              points: 0,
              rank: 0,
              inviteCount: 0,
              createdAt: serverTimestamp(),
              lastActiveAt: serverTimestamp(),
              lastActiveTimestamp: Date.now(),
              betaBalances: { GRMF: 0, GRAM: 0, USDT: 0, NOT: 0, DOGS: 0, HMSTR: 0 },
              realBalances: { GRMF: 0 },
              openedChests: [],
              hasCollectedWelcomeBonus: false,
              hasProcessedReferral: false
            };
            setDoc(userRef, initialData).then(() => {
              processReferral(userDocId, initialData, tgUser).then((res) => {
                if (res && res.success && res.reward) {
                  setReferralBonusModal({
                    show: true,
                    reward: res.reward,
                    referrerName: res.referrerUsername || 'Friend',
                    isPremium: !!res.isPremium
                  });
                }
              });
            });
            if (!localStorage.getItem(`bonus_collected_${userDocId}`)) {
              setShowWelcomeModal(true);
            }
          }
        });
        return () => unsubProfile();
      } else {
        signInAnonymously(auth);
      }
    });

    return () => unsubAuth();
  }, []);

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
    setShowWelcomeModal(false);

    try {
      await grantReward({
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
    } catch (error) {
      console.error("Error collecting bonus:", error);
    }
  };

  const wallet: WalletState = {
    address: tonConnectUI.account?.address || null,
    isConnected: !!tonConnectUI.connected,
    balances: balances,
    walletName: tonConnectUI.account ? 'TON Wallet' : null,
  };

  const handleSwap = async () => {
    if (!wallet.isConnected) {
      setIsWalletOpen(true);
      return;
    }

    setTxState('submitting');
    setTxHash(null);

    setTimeout(async () => {
      setTxState('confirming');
      setTimeout(async () => {
        setTxState('success');
        setTxHash('0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6));
        
        // Update Firestore beta balances and give small REAL reward for activity
        const targetId = userProfile?.id || auth.currentUser?.uid;
        if (targetId) {
          const userRef = doc(db, 'users', targetId);
          const fAmt = parseFloat(fromAmount);
          const tAmt = parseFloat(toAmount);
          
          const newBetaBalances = {
            ...balances,
            [fromToken.symbol]: Math.max(0, (balances[fromToken.symbol] || 0) - fAmt),
            [toToken.symbol]: (balances[toToken.symbol] || 0) + tAmt
          };
          
          // Reward small real GRMF for every swap to make it feel real
          const REAL_SWAP_REWARD = 0.5;

          await grantReward({
            userId: targetId,
            telegramId: userProfile?.telegramId,
            username: userProfile?.username || userProfile?.telegramUsername,
            firstName: userProfile?.firstName,
            source: 'testnet_swap',
            amount: REAL_SWAP_REWARD,
            balanceType: 'real',
            extraUserUpdates: {
              betaBalances: newBetaBalances,
              lastActiveAt: serverTimestamp(),
              lastActiveTimestamp: Date.now()
            }
          });

          await awardXP(targetId, 30);
        }
      }, 2000);
    }, 1500);
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

  const toAmount = fromAmount ? (parseFloat(fromAmount) * (fromToken.priceUsd / toToken.priceUsd)).toFixed(2) : '';
  
  const handleOpenChest = async (chestId: string, rewards: { symbol: string, amount: number }) => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId) return;
    const userRef = doc(db, 'users', targetId);
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
  };

  const handleClaimUnclaimedReferrals = async () => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId) return;
    const userRef = doc(db, 'users', targetId);
    const unclaimed = userProfile?.unclaimedReferralRewards || 0;
    if (unclaimed <= 0) return;

    await updateDoc(userRef, {
      'realBalances.GRMF': increment(unclaimed),
      'betaBalances.GRMF': increment(unclaimed),
      unclaimedReferralRewards: 0
    });
  };

  return (
    <div className="h-[100dvh] bg-[#F0F2F5] text-slate-900 font-sans selection:bg-blue-500/30 flex flex-col overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 rounded-full blur-[120px]" />
      </div>

      <Header 
        onOpenWalletDrawer={() => setIsWalletOpen(true)} 
        onOpenSettings={() => {}} 
        onOpenAdmin={isAdmin ? () => setActiveView('admin') : undefined}
      />

      <main className={`flex-1 w-full mx-auto px-3 sm:px-4 pt-2 pb-[calc(5rem+env(safe-area-inset-bottom,20px))] flex flex-col overflow-hidden relative ${
        activeView === 'admin' && isAdmin ? 'max-w-5xl' : 'max-w-lg'
      }`}>
        <AnimatePresence mode="wait">
          {activeView === 'swap' && (
            <motion.div 
              key="swap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col items-center justify-center overflow-hidden"
            >
              <SwapCard 
                fromToken={fromToken} 
                toToken={toToken}
                fromAmount={fromAmount}
                setFromAmount={setFromAmount}
                toAmount={toAmount}
                onFlipTokens={handleFlipTokens}
                onOpenFromTokenSelect={() => {
                  setSelectingSide('from');
                  setIsTokenSelectOpen(true);
                }}
                onOpenToTokenSelect={() => {
                  setSelectingSide('to');
                  setIsTokenSelectOpen(true);
                }}
                onOpenSettings={() => {}}
                onSwap={handleSwap}
                wallet={wallet}
                onOpenConnectModal={() => setIsWalletOpen(true)}
                slippage={0.5}
              />
            </motion.div>
          )}

          {activeView === 'tasks' && (
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              <TasksView key="tasks" userProfile={userProfile} setActiveView={setActiveView} />
            </div>
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
              <ProfileView key="profile" balances={balances} userProfile={userProfile} />
            </div>
          )}
          {activeView === 'admin' && isAdmin && (
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              <AdminView key="admin" userProfile={userProfile} />
            </div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-200 px-2 sm:px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,16px))] z-50 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around gap-0.5">
          <NavButton 
            active={activeView === 'swap'} 
            onClick={() => setActiveView('swap')} 
            icon={<ArrowLeftRight className="w-5 h-5" />} 
            label="Swap" 
            badge="Beta"
          />
          <NavButton 
            active={activeView === 'tasks'} 
            onClick={() => setActiveView('tasks')} 
            icon={<ListTodo className="w-5 h-5" />} 
            label="Tasks" 
          />
          <NavButton 
            active={activeView === 'referrals'} 
            onClick={() => setActiveView('referrals')} 
            icon={<Users className="w-5 h-5" />} 
            label="Friends" 
          />
          <NavButton 
            active={activeView === 'airdrop'} 
            onClick={() => setActiveView('airdrop')} 
            icon={<Trophy className="w-5 h-5" />} 
            label="Airdrop" 
          />
          <NavButton 
            active={activeView === 'profile'} 
            onClick={() => setActiveView('profile')} 
            icon={<User className="w-5 h-5" />} 
            label="Profile" 
          />
          {isAdmin && (
            <NavButton 
              active={activeView === 'admin'} 
              onClick={() => setActiveView('admin')} 
              icon={<ShieldCheck className="w-5 h-5" />} 
              label="Admin" 
            />
          )}
        </div>
      </nav>

      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[40px] p-8 text-center shadow-2xl relative overflow-hidden border border-slate-100"
            >
              {/* Decorative background */}
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent -z-0" />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-blue-600 to-indigo-700 mb-6 flex items-center justify-center shadow-2xl shadow-blue-600/30 transform rotate-3">
                  <div className="relative">
                    <Trophy className="w-12 h-12 text-white fill-white/10" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center border-2 border-blue-600"
                    >
                      <Zap className="w-3 h-3 text-white fill-white" />
                    </motion.div>
                  </div>
                </div>
                
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight mb-3">Welcome Reward</h3>
                <p className="text-sm text-slate-500 font-medium px-4 mb-8">
                  Thanks for joining GRMF Fi. We've credited your account with a starter balance.
                </p>

                <div className="w-full bg-slate-50 border border-slate-100 p-8 rounded-[32px] mb-8 relative group">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Limited Gift</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">{WELCOME_REWARD.toLocaleString()}</span>
                    <span className="text-lg font-black text-blue-600 uppercase">GRMF</span>
                  </div>
                </div>

                <button
                  onClick={collectWelcomeBonus}
                  className="w-full py-5 rounded-[24px] bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-900/20 transition-all active:scale-[0.96] hover:bg-slate-800"
                >
                  Claim & Explore
                </button>
                
                <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Exclusive Telegram Member Bonus
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Referral Reward Modal Banner for Referred User */}
        {referralBonusModal?.show && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[40px] p-6 text-center shadow-2xl relative overflow-hidden border border-slate-100"
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-50 via-amber-50/50 to-transparent -z-0" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 rounded-[28px] bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-600 mb-4 flex items-center justify-center shadow-xl shadow-amber-500/30 transform -rotate-3">
                  <div className="relative">
                    <Trophy className="w-10 h-10 text-white fill-white/20" />
                    <motion.div
                      animate={{ scale: [1, 1.25, 1], rotate: [0, 15, -15, 0] }}
                      transition={{ repeat: Infinity, duration: 2.5 }}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                    </motion.div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/80 border border-amber-200 rounded-full text-amber-800 text-[10px] font-black uppercase tracking-wider mb-2">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Referral Bonus Unlocked</span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                  🎉 Referral Bonus!
                </h3>
                
                <p className="text-xs text-slate-600 font-medium px-2 mb-5 leading-relaxed">
                  You joined successfully via referral link from <strong className="text-slate-900 font-bold">@{referralBonusModal.referrerName}</strong>!
                </p>

                <div className="w-full bg-gradient-to-br from-slate-50 to-amber-50/40 border border-amber-200/60 p-5 rounded-[28px] mb-6 relative">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Bonus Received
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">
                      +{referralBonusModal.reward}
                    </span>
                    <span className="text-base font-black text-amber-600 uppercase">GRMF</span>
                  </div>
                  {referralBonusModal.isPremium && (
                    <span className="mt-1 inline-block text-[9px] font-black text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-md uppercase">
                      ⭐ Telegram Premium Bonus
                    </span>
                  )}
                  <span className="text-[10px] text-emerald-600 font-bold block mt-2">
                    ✓ Reward added to your balance successfully!
                  </span>
                </div>

                <button
                  onClick={dismissReferralModal}
                  className="w-full py-4 rounded-[22px] bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-amber-500/25 transition-all active:scale-[0.96]"
                >
                  Claim & Continue 🚀
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
        onClose={() => setTxState('idle')}
      />

      <TokenSelectModal 
        isOpen={isTokenSelectOpen}
        onClose={() => setIsTokenSelectOpen(false)}
        onSelect={handleSelectToken}
        selectedToken={selectingSide === 'from' ? fromToken : toToken}
        balances={balances}
      />
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: string }) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex flex-col items-center gap-1 transition-all relative py-0.5 px-0.5 ${active ? 'text-[#24A1DE]' : 'text-slate-400 hover:text-slate-600'}`}
  >
    {badge && (
      <span className="absolute -top-1 right-0 sm:right-1 bg-[#24A1DE] text-white text-[7px] font-black px-1 py-0.2 rounded-full border border-white shadow-xs z-10 animate-pulse">
        {badge}
      </span>
    )}
    {active && (
      <motion.div 
        layoutId="nav-glow"
        className="absolute -top-2 w-8 h-5 bg-blue-500/10 blur-md rounded-full"
      />
    )}
    <div className={`p-1.5 sm:p-2 rounded-xl transition-all ${active ? 'bg-blue-50/80 scale-105' : ''}`}>
      {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4 sm:w-5 sm:h-5', strokeWidth: active ? 2.5 : 2 })}
    </div>
    <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-tight ${active ? 'opacity-100' : 'opacity-60'} transition-all truncate max-w-full`}>
      {label}
    </span>
    {active && (
      <motion.div 
        layoutId="nav-dot"
        className="w-1 h-1 bg-[#24A1DE] rounded-full mt-0.5"
      />
    )}
  </button>
);

export default App;
