import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gem, Clock, Send, Zap, Minus, Plus, X, LineChart, Users, Copy, CheckCircle2 } from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { doc, getDoc, setDoc, increment, addDoc, collection, serverTimestamp, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export const PresaleHub = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [balance, setBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [amountToBuy, setAmountToBuy] = useState<number>(500);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [isDexModalOpen, setIsDexModalOpen] = useState(false);
  const [dexLang, setDexLang] = useState<'en' | 'ar' | 'ru' | 'fa'>('en');
  const [copied, setCopied] = useState(false);
  const [soldTokens, setSoldTokens] = useState<number>(0);
  const TOTAL_POOL = 5000000;

  const DEX_TEXT = {
    en: { title: "Exclusive Early Trading", text: "Users who participate in the GRMF presale will gain exclusive early access to trade GRMF on the Ston.fi decentralized exchange (DEX). This allows you to trade freely before the official airdrop distribution and centralized exchange (CEX) listings, giving you a strategic advantage." },
    ar: { title: "تداول مبكر حصري", text: "سيحصل المستخدمون الذين يشاركون في البيع المسبق لعملة GRMF على وصول مبكر وحصري لتداول العملة على منصة Ston.fi اللامركزية (DEX). يتيح لك ذلك التداول بحرية قبل التوزيع الرسمي للايردروب والإدراج في المنصات المركزية (CEX)، مما يمنحك ميزة استراتيجية." },
    ru: { title: "Эксклюзивная ранняя торговля", text: "Пользователи, участвующие в пресейле GRMF, получат эксклюзивный ранний доступ к торговле на децентрализованной бирже Ston.fi (DEX). Это позволит вам свободно торговать до официального распределения аирдропа и листинга на централизованных биржах (CEX), давая вам стратегическое преимущество." },
    fa: { title: "معاملات زودهنگام انحصاری", text: "کاربرانی که در پیش‌فروش GRMF شرکت می‌کنند، دسترسی زودهنگام و انحصاری برای معامله در صرافی غیرمتمرکز Ston.fi (DEX) خواهند داشت. این به شما امکان می‌دهد قبل از توزیع رسمی ایردراپ و لیست شدن در صرافی‌های متمرکز (CEX) آزادانه معامله کنید و به شما یک مزیت استراتژیک می‌دهد." }
  };

  useEffect(() => {
    let unsubscribeBalance: () => void;
    let unsubscribeWithdrawals: () => void;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        if (!user) {
            setBalance(0);
            setWithdrawals([]);
            if (unsubscribeBalance) unsubscribeBalance();
            if (unsubscribeWithdrawals) unsubscribeWithdrawals();
            return;
        }

        // Listen for balance
        unsubscribeBalance = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const bal = data.presaleBalances && typeof data.presaleBalances.GRMF === 'number' ? data.presaleBalances.GRMF : 0;
                setBalance(bal);
            } else {
                setBalance(0);
            }
        }, (error) => {
            console.error("Balance snapshot error:", error);
        });

        // Listen for withdrawals
        const q = query(collection(db, 'withdrawal_requests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
        unsubscribeWithdrawals = onSnapshot(q, (snapshot) => {
            setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("Withdrawals snapshot error:", error);
        });
    });

    const targetDate = new Date('2026-08-21T00:00:00Z').getTime();
    const startDate = new Date('2026-08-01T00:00:00Z').getTime();
    
    // Initial dynamic pool calculation
    const initialNow = new Date().getTime();
    if (initialNow > startDate) {
      const progress = Math.min((initialNow - startDate) / (targetDate - startDate), 1);
      setSoldTokens(Math.floor(progress * TOTAL_POOL));
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      // Update Time
      if (difference <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        });
      }
      
      // Simulate live buying every second
      if (difference > 0 && now > startDate) {
        setSoldTokens(prev => {
            if (prev >= TOTAL_POOL) return TOTAL_POOL;
            // Add a small random burst to simulate live global buys
            const burst = Math.random() > 0.6 ? Math.floor(Math.random() * 450) + 50 : 0;
            return Math.min(prev + burst, TOTAL_POOL);
        });
      }
    }, 1000);

    return () => {
        unsubscribeAuth();
        if (unsubscribeBalance) unsubscribeBalance();
        if (unsubscribeWithdrawals) unsubscribeWithdrawals();
        clearInterval(timer);
    };
  }, []);

  const handleBuy = async () => {
    if (!wallet) {
      tonConnectUI.openModal();
      return;
    }
    const tonAmount = (amountToBuy / 500).toString();
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [{ address: "UQAJcp9v_CqgdqHmAjs8sZRs0UPkQgZBuWct2AfMBJfgP6QS", amount: toNano(tonAmount).toString() }]
    };
    try {
      await tonConnectUI.sendTransaction(transaction);
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
            presaleBalances: {
                GRMF: increment(amountToBuy)
            }
        }, { merge: true });
      }
      alert("Purchase successful!");
    } catch (e) {
      alert("Transaction failed.");
    }
  };

  const handleWithdraw = async () => {
      if (withdrawAmount > balance || !withdrawAddress) return;
      try {
          await addDoc(collection(db, 'withdrawal_requests'), {
              userId: auth.currentUser?.uid,
              amount: withdrawAmount,
              currency: 'GRMF',
              recipientAddress: withdrawAddress,
              status: 'pending',
              createdAt: serverTimestamp()
          });
          
          if (auth.currentUser) {
              await setDoc(doc(db, 'users', auth.currentUser.uid), {
                  presaleBalances: {
                      GRMF: increment(-withdrawAmount)
                  }
              }, { merge: true });
          }
          alert("Withdrawal request submitted successfully!");
          setWithdrawAmount(0);
          setWithdrawAddress('');
      } catch (e) {
          console.error(e);
          alert("Failed to submit request.");
      }
  };

  const handleCopyLink = () => {
      const userId = auth.currentUser?.uid || 'guest_123';
      const link = `https://t.me/Grmfdex_bot?startapp=ref_${userId}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const progressPercent = (soldTokens / TOTAL_POOL) * 100;

  return (
    <>
      <motion.div className="flex-1 flex flex-col p-2 gap-2 h-full overflow-y-auto pb-24">
        {/* Header/Logo */}
        <div className="bg-white rounded-2xl p-3 flex justify-between items-center shadow-sm shrink-0">
            <div className='flex items-center gap-2'>
                <img src="https://i.suar.me/vAdG5/l" alt="GRMF Logo" className="w-8 h-8 rounded-full" />
                <span className="font-black text-slate-900">GRMF Presale</span>
            </div>
            <button 
                onClick={() => setIsDexModalOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
            >
                <LineChart className="w-4 h-4" />
                DEX
            </button>
        </div>

        {/* Timer */}
        <div className="bg-slate-900 rounded-2xl p-3 flex items-center justify-between text-white shrink-0">
            <Clock className="w-5 h-5 text-sky-400" />
            <div className="flex gap-2">
                {Object.entries(timeLeft).map(([unit, value]) => (
                    <div key={unit} className="text-center">
                        <span className="text-lg font-black">{value.toString().padStart(2, '0')}</span>
                        <span className="text-[8px] block uppercase text-slate-400">{unit}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Pool Progress */}
        <div className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-2 shrink-0">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 uppercase">
                <span>Presale Pool</span>
                <span className="text-sky-600">{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-sky-500 h-3 rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                <span><motion.span>{soldTokens.toLocaleString()}</motion.span> GRMF Sold</span>
                <span>{TOTAL_POOL.toLocaleString()} Total</span>
            </div>
        </div>

        {/* Purchase */}
        <div className="bg-white rounded-2xl p-3 shadow-sm grid grid-cols-3 gap-2 items-center shrink-0">
            <button onClick={() => setAmountToBuy(Math.max(500, amountToBuy - 500))} className="p-2 bg-slate-100 rounded-xl flex items-center justify-center"><Minus className="w-4 h-4"/></button>
            <span className="font-black text-sm text-center">{amountToBuy}</span>
            <button onClick={() => setAmountToBuy(amountToBuy + 500)} className="p-2 bg-slate-100 rounded-xl flex items-center justify-center"><Plus className="w-4 h-4"/></button>
            <button onClick={handleBuy} className="col-span-3 py-2 bg-sky-600 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1">
                <Zap className='w-3 h-3'/> Buy {amountToBuy} GRMF
            </button>
        </div>

        {/* Withdrawal */}
        <div className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase">Withdraw</h3>
                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
                    <img src="https://i.suar.me/vAdG5/l" alt="GRMF Logo" className="w-4 h-4 rounded-full" />
                    <span className="text-xs font-bold text-slate-900">{balance.toLocaleString()}</span>
                </div>
            </div>
            <input type="number" placeholder="Amt" value={withdrawAmount || ''} onChange={(e) => setWithdrawAmount(Number(e.target.value))} className="p-2 bg-slate-50 rounded-xl text-xs" />
            <input type="text" placeholder="TON Address" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} className="p-2 bg-slate-50 rounded-xl text-xs" />
            <button onClick={handleWithdraw} className="py-2 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1">
                <Send className="w-3 h-3" /> Withdraw
            </button>
            <div className="text-[10px] space-y-1">
                {withdrawals.map((w) => (
                    <div key={w.id} className="flex justify-between bg-slate-50 p-2 rounded-lg">
                        <span>{w.amount} GRMF</span>
                        <span className={w.status === 'approved' || w.status === 'completed' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {w.status === 'pending' ? 'Pending' : (w.status === 'approved' || w.status === 'completed' ? 'Completed' : w.status)}
                        </span>
                    </div>
                ))}
            </div>
        </div>

        {/* Invite Friends */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3 shrink-0">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                    <Users className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-900">Invite Friends</h3>
                    <p className="text-[10px] font-medium text-slate-500">Earn 10% of their presale purchases</p>
                </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                <span className="flex-1 text-xs font-medium text-slate-600 px-2 truncate">
                    https://t.me/Grmfdex_bot?startapp=ref_{auth.currentUser?.uid || 'guest_123'}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopyLink}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => {
                            const url = `https://t.me/Grmfdex_bot?startapp=ref_${auth.currentUser?.uid || 'guest_123'}`;
                            const text = encodeURIComponent("Join the GRMF Presale and get exclusive early DEX trading access!");
                            window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
                        }}
                        className="p-2 rounded-lg flex items-center justify-center bg-[#2AABEE] text-white hover:bg-[#229ED9] transition-colors shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        <TonConnectButton className="!scale-75 origin-center" />
    </motion.div>

    {/* DEX Modal */}
    <AnimatePresence>
      {isDexModalOpen && (
          <>
              <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                  onClick={() => setIsDexModalOpen(false)}
              />
              <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl h-[75vh] flex flex-col overflow-hidden"
              >
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                              <LineChart className="w-5 h-5" />
                          </div>
                          <h2 className="font-black text-slate-900">Ston.fi DEX</h2>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => setIsDexModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-600">
                              <X className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
                  
                  <div className={`p-6 overflow-y-auto flex-1 ${dexLang === 'ar' || dexLang === 'fa' ? 'text-right' : 'text-left'}`} dir={dexLang === 'ar' || dexLang === 'fa' ? 'rtl' : 'ltr'}>
                      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl overflow-x-auto" dir="ltr">
                          {[
                              { code: 'en', label: 'English' },
                              { code: 'ar', label: 'العربية' },
                              { code: 'ru', label: 'Русский' },
                              { code: 'fa', label: 'فارسی' }
                          ].map((lang) => (
                              <button 
                                  key={lang.code}
                                  onClick={() => setDexLang(lang.code as any)}
                                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${dexLang === lang.code ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                  {lang.label}
                              </button>
                          ))}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-4">{DEX_TEXT[dexLang].title}</h3>
                      <p className="text-slate-600 leading-relaxed font-medium">
                          {DEX_TEXT[dexLang].text}
                      </p>

                      <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
                          <img src="https://i.suar.me/rgZxz/l" alt="Ston.fi" className="w-12 h-12 rounded-full shadow-sm" />
                          <span className="font-black text-indigo-900 text-center text-sm">Trade freely on Ston.fi before CEX listing</span>
                      </div>
                  </div>
              </motion.div>
          </>
      )}
    </AnimatePresence>
  </>
  );
};
