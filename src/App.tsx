import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { 
  ArrowLeftRight, 
  Wallet as WalletIcon, 
  Trophy, 
  ListTodo,
  User,
  Zap
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
  getDoc
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';

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
  const [activeView, setActiveView] = useState<ActiveView>('swap');
  
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]); // GRMF (Top)
  const [toToken, setToToken] = useState<Token>(TOKENS[1]); // GRAM (Bottom)
  const [fromAmount, setFromAmount] = useState<string>('');
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
  const [selectingSide, setSelectingSide] = useState<'from' | 'to' | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [txState, setTxState] = useState<TransactionState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<any>(null);
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

  // Admin access check for sekanedr_is
  const tgWebApp = (window as any).Telegram?.WebApp;
  const tgUser = tgWebApp?.initDataUnsafe?.user;
  const rawTgUsername = tgUser?.username || userProfile?.telegramUsername || userProfile?.username || '';
  const sanitizedTgUsername = rawTgUsername.toLowerCase().replace(/^@/, '').trim();
  const isAdmin = sanitizedTgUsername === 'sekanedr_is' || auth.currentUser?.email === 'sekanedrmessaif@gmail.com';

  const processReferralIfAny = async (user: any, userDocData: any) => {
    if (!user || userDocData?.hasProcessedReferral || userDocData?.referredBy) return;

    const tg = (window as any).Telegram?.WebApp;
    const urlParams = new URLSearchParams(window.location.search);
    const rawParam = tg?.initDataUnsafe?.start_param 
      || urlParams.get('startapp') 
      || urlParams.get('tgWebAppStartParam')
      || urlParams.get('start');

    if (!rawParam) return;

    // Clean ref_tg_1368899842 -> 1368899842
    const referrerCode = rawParam.replace(/^ref_tg_/, '').replace(/^ref_/, '').trim();
    if (!referrerCode) return;

    const currentTgId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
    const currentUid = user.uid;

    if (referrerCode === currentTgId || referrerCode === currentUid) {
      console.log("Self referral ignored");
      return;
    }

    try {
      let referrerDocRef: any = null;
      let referrerData: any = null;

      const numCode = Number(referrerCode);
      const usersRef = collection(db, 'users');
      
      // Try searching telegramId
      let q = query(usersRef, where('telegramId', '==', isNaN(numCode) ? referrerCode : numCode));
      let qSnap = await getDocs(q);

      if (qSnap.empty) {
        q = query(usersRef, where('telegramId', '==', String(referrerCode)));
        qSnap = await getDocs(q);
      }

      if (!qSnap.empty) {
        referrerDocRef = qSnap.docs[0].ref;
        referrerData = qSnap.docs[0].data();
      } else {
        const docDirect = doc(db, 'users', referrerCode);
        const docDirectSnap = await getDoc(docDirect);
        if (docDirectSnap.exists()) {
          referrerDocRef = docDirect;
          referrerData = docDirectSnap.data();
        }
      }

      if (!referrerDocRef || !referrerData || referrerDocRef.id === currentUid) {
        await updateDoc(doc(db, 'users', currentUid), { hasProcessedReferral: true });
        return;
      }

      const userRef = doc(db, 'users', currentUid);
      const newUsername = userDocData?.username || tg?.initDataUnsafe?.user?.username || `user_${currentUid.slice(0, 5)}`;

      await runTransaction(db, async (transaction) => {
        const refSnap = await transaction.get(referrerDocRef);
        if (!refSnap.exists()) return;
        const rData: any = refSnap.data() || {};

        const refOldBeta = rData.betaBalances?.GRMF || 0;
        const refOldReal = rData.realBalances?.GRMF || 0;
        const refOldEarned = rData.referralEarnings?.GRMF || 0;
        const refInvites = rData.inviteCount || 0;

        const newInvitedUser = {
          uid: currentUid,
          username: newUsername,
          telegramId: currentTgId || null,
          joinedAt: new Date().toISOString(),
          reward: 30
        };

        transaction.update(referrerDocRef, {
          'betaBalances.GRMF': refOldBeta + 30,
          'realBalances.GRMF': refOldReal + 30,
          'referralEarnings.GRMF': refOldEarned + 30,
          inviteCount: refInvites + 1,
          invitedUsers: arrayUnion(newInvitedUser)
        });

        const uSnap = await transaction.get(userRef);
        const uData: any = uSnap.exists() ? uSnap.data() : {};
        const uOldBeta = uData.betaBalances?.GRMF || 0;
        const uOldReal = uData.realBalances?.GRMF || 0;

        transaction.set(userRef, {
          referredBy: referrerCode,
          hasProcessedReferral: true,
          referralBonusReceived: 10,
          'betaBalances.GRMF': uOldBeta + 10,
          'realBalances.GRMF': uOldReal + 10
        }, { merge: true });
      });

      console.log(`Referral credited! Referrer +30 GRMF, Referred User +10 GRMF`);
    } catch (err) {
      console.error("Error processing referral:", err);
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Initialize Telegram WebApp if available
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          try {
            tg.ready?.();
            tg.expand?.();
          } catch (e) {
            console.warn("Telegram WebApp initialization error:", e);
          }
        }

        const tgUser = tg?.initDataUnsafe?.user;
        const detectedUsername = tgUser?.username || (
          tgUser?.first_name ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`.trim() : null
        );

        // Fetch profile
        const userRef = doc(db, 'users', user.uid);
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            setBalances(data.betaBalances || { GRMF: 0, GRAM: 0, USDT: 0, NOT: 0, DOGS: 0, HMSTR: 0 });
            setRealGrmf(data.realBalances?.GRMF || 0);

            // Periodically or on load update lastActiveAt for 24h active user tracking
            const lastActive = data.lastActiveTimestamp || 0;
            if (Date.now() - lastActive > 5 * 60 * 1000) { // Update every 5 minutes
              setDoc(userRef, {
                lastActiveAt: serverTimestamp(),
                lastActiveTimestamp: Date.now()
              }, { merge: true });
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
            
            if (!data.hasProcessedReferral) {
              processReferralIfAny(user, data);
            }

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
              processReferralIfAny(user, initialData);
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
    const updatedBeta = { ...balances, GRMF: (balances.GRMF || 0) + 5000 };
    const updatedReal = (realGrmf || 0) + 5000;
    setBalances(updatedBeta);
    setRealGrmf(updatedReal);
    setShowWelcomeModal(false);

    try {
      await setDoc(userRef, {
        betaBalances: updatedBeta,
        realBalances: { GRMF: updatedReal },
        hasCollectedWelcomeBonus: true
      }, { merge: true });
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
        
        // Update Firestore beta balances
        if (auth.currentUser) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const fAmt = parseFloat(fromAmount);
          const tAmt = parseFloat(toAmount);
          
          const newBetaBalances = {
            ...balances,
            [fromToken.symbol]: Math.max(0, (balances[fromToken.symbol] || 0) - fAmt),
            [toToken.symbol]: (balances[toToken.symbol] || 0) + tAmt
          };
          
          // Reward 0.1 real GRMF for every swap? Or just rely on tasks?
          // The user mentioned "tasks for swapping", so I'll handle rewards there.
          await updateDoc(userRef, { betaBalances: newBetaBalances });
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
    const currentBalance = balances[rewards.symbol] || 0;
    const newBalances = { 
      ...balances, 
      [rewards.symbol]: currentBalance + rewards.amount 
    };
    await updateDoc(userRef, {
      balances: newBalances,
      openedChests: arrayUnion(chestId)
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

      <main className={`flex-1 w-full mx-auto px-4 pt-2 pb-24 flex flex-col overflow-hidden relative ${
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

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-200 px-3 pt-2.5 pb-7 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
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
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-[48px] p-8 pb-12 text-center shadow-2xl relative overflow-hidden border-t border-slate-100"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
              
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#24A1DE] to-[#1e88ba] mx-auto mb-6 flex items-center justify-center shadow-xl">
                  <Zap className="w-10 h-10 text-white fill-white/20" />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight mb-2">Beta Access Bonus</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mb-8">
                  Get started with your <span className="text-[#24A1DE]">Testnet Starter Pack</span>
                </p>

                <div className="bg-slate-50 border border-slate-100 p-8 rounded-[32px] mb-8">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">5,000</span>
                    <span className="text-sm font-black text-[#24A1DE] uppercase">GRMF</span>
                  </div>
                  <p className="text-[8px] text-amber-600 font-black uppercase tracking-tighter mt-3 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 inline-block">Beta Phase Currency Only</p>
                </div>

                <button
                  onClick={collectWelcomeBonus}
                  className="w-full py-5 rounded-3xl bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] shadow-xl transition-all active:scale-[0.97]"
                >
                  Collect & Start Swapping
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
    className={`flex flex-col items-center gap-1.5 transition-all relative ${active ? 'text-[#24A1DE]' : 'text-slate-400'}`}
  >
    {badge && (
      <span className="absolute -top-1 -right-2 bg-[#24A1DE] text-white text-[7px] font-black px-1 py-0.5 rounded-full border border-white shadow-sm z-10 animate-pulse">
        {badge}
      </span>
    )}
    {active && (
      <motion.div 
        layoutId="nav-glow"
        className="absolute -top-3 w-10 h-6 bg-blue-500/10 blur-xl rounded-full"
      />
    )}
    <div className={`p-2 rounded-xl transition-all ${active ? 'bg-blue-50' : ''}`}>
      {React.cloneElement(icon as React.ReactElement, { strokeWidth: active ? 2.5 : 2 })}
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'opacity-100' : 'opacity-60'} transition-all`}>
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
