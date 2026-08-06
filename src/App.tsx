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
  Award
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
  increment
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { extractAndStoreReferralCode, processReferral, syncReferralsForUser } from './lib/referrals';

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

  const [userProfile, setUserProfile] = useState<any>(instantTgUsername ? {
    username: instantTgUsername,
    telegramUsername: instantTgUsername,
    photoUrl: tgUser?.photo_url || null,
    telegramId: tgUser?.id || null,
  } : null);
  const [balances, setBalances] = useState<Record<string, number>>({
    GRAM: 0,
    GRMF: 0,
    USDT: 0,
    NOT: 0,
    DOGS: 0,
    HMSTR: 0
  });
  const [realGrmf, setRealGrmf] = useState<number>(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isAppReady, setIsAppReady] = useState(true);

  // Rewards Configuration
  const WELCOME_REWARD = 5000;
  const DAILY_REWARD_REAL = 5;

  // Admin access check for sekanedr_is
  const rawTgUsername = tgUser?.username || userProfile?.telegramUsername || userProfile?.username || '';
  const sanitizedTgUsername = rawTgUsername.toLowerCase().replace(/^@/, '').trim();
  const isAdmin = sanitizedTgUsername === 'sekanedr_is' || auth.currentUser?.email === 'sekanedrmessaif@gmail.com';

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const detectedUsername = instantTgUsername;
        const userRef = doc(db, 'users', user.uid);

        // IMMEDIATE CHECK: Fast path for Welcome Bonus
        try {
          const fastSnap = await getDoc(userRef);
          if (fastSnap.exists()) {
            const data = fastSnap.data();
            if (!data.hasCollectedWelcomeBonus && !localStorage.getItem(`bonus_collected_${user.uid}`)) {
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
            const data = docSnap.data();
            setUserProfile((prev: any) => ({ ...prev, ...data }));
            setBalances(data.betaBalances || { GRMF: 0, GRAM: 0, USDT: 0, NOT: 0, DOGS: 0, HMSTR: 0 });
            setRealGrmf(data.realBalances?.GRMF || 0);

            // 1. Activity Persistence: Track last active and Daily login bonus
            const now = Date.now();
            const lastActive = data.lastActiveTimestamp || 0;
            const lastLoginBonusAt = data.lastLoginBonusTimestamp || 0;
            
            // Check if it's a new day for Daily Login Reward (Activity saving)
            const isNewDay = new Date(now).toDateString() !== new Date(lastLoginBonusAt).toDateString();
            
            if (isNewDay && data.hasCollectedWelcomeBonus) {
              // Automatically award daily login reward if user is returning
              updateDoc(userRef, {
                'realBalances.GRMF': increment(DAILY_REWARD_REAL),
                lastLoginBonusTimestamp: now,
                lastActiveAt: serverTimestamp(),
                lastActiveTimestamp: now
              });
              console.log("Daily reward credited for returning user!");
            } else if (now - lastActive > 5 * 60 * 1000) { 
              // Periodically update lastActiveAt every 5 minutes
              updateDoc(userRef, {
                lastActiveAt: serverTimestamp(),
                lastActiveTimestamp: now
              });
            }

            // Automatically update username in Firestore if detected from Telegram and missing/placeholder
            if (detectedUsername && (!data.username || data.username.startsWith('user_') || data.telegramUsername !== detectedUsername)) {
              setDoc(userRef, {
                username: detectedUsername,
                telegramUsername: detectedUsername,
                telegramId: tgUser?.id || null,
                photoUrl: tgUser?.photo_url || data.photoUrl || null
              }, { merge: true });
            }
            
            // Process referral if pending
            if (!data.hasProcessedReferral) {
              processReferral(user.uid, data, tgUser);
            }

            // Sync referrals in background for referrer
            syncReferralsForUser(user.uid, data);

            // Welcome Bonus logic (taken once upon registration)
            if (!data.hasCollectedWelcomeBonus && !localStorage.getItem(`bonus_collected_${user.uid}`)) {
              setShowWelcomeModal(true);
            } else {
              setShowWelcomeModal(false);
            }
          } else {
            // Create initial profile with Telegram data
            const finalUsername = detectedUsername || ('user_' + user.uid.slice(0, 5));
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
              processReferral(user.uid, initialData, tgUser);
            });
            if (!localStorage.getItem(`bonus_collected_${user.uid}`)) {
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

  const collectWelcomeBonus = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const userRef = doc(db, 'users', uid);
    
    // Save locally immediately to avoid any re-trigger
    localStorage.setItem(`bonus_collected_${uid}`, 'true');

    // Optimistic UI updates
    const updatedBeta = { ...balances, GRMF: (balances.GRMF || 0) + WELCOME_REWARD };
    
    setBalances(updatedBeta);
    setShowWelcomeModal(false);

    try {
      await updateDoc(userRef, {
        'betaBalances.GRMF': increment(WELCOME_REWARD),
        hasCollectedWelcomeBonus: true,
        lastLoginBonusTimestamp: Date.now()
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
        if (auth.currentUser) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const fAmt = parseFloat(fromAmount);
          const tAmt = parseFloat(toAmount);
          
          const newBetaBalances = {
            ...balances,
            [fromToken.symbol]: Math.max(0, (balances[fromToken.symbol] || 0) - fAmt),
            [toToken.symbol]: (balances[toToken.symbol] || 0) + tAmt
          };
          
          // Reward small real GRMF for every swap to make it feel real
          const REAL_SWAP_REWARD = 0.5;

          await updateDoc(userRef, { 
            betaBalances: newBetaBalances,
            'realBalances.GRMF': increment(REAL_SWAP_REWARD),
            lastActiveAt: serverTimestamp(),
            lastActiveTimestamp: Date.now()
          });
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
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
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
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
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
