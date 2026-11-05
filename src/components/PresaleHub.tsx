import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Send, Zap, Minus, Plus, X, LineChart, Users, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { doc, setDoc, increment, addDoc, collection, serverTimestamp, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { openTelegramLink, triggerHaptic } from '../lib/telegram';

interface PresaleHubProps {
  userProfile?: any;
}

export const PresaleHub: React.FC<PresaleHubProps> = ({ userProfile }) => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [timeLeft, setTimeLeft] = useState({ days: 14, hours: 8, minutes: 45 });
  const [balance, setBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [amountToBuy, setAmountToBuy] = useState<number>(500);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [isDexModalOpen, setIsDexModalOpen] = useState(false);
  const [dexLang, setDexLang] = useState<'en' | 'ar' | 'ru' | 'fa'>('en');
  const [copied, setCopied] = useState(false);
  const [soldTokens, setSoldTokens] = useState<number>(3425000);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const TOTAL_POOL = 5000000;

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    triggerHaptic(type === 'success' ? 'success' : 'error');
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const resolvedUserId = userProfile?.id || localStorage.getItem('grmf_persistent_doc_id') || auth.currentUser?.uid || 'guest_123';

  const DEX_TEXT = {
    en: { title: "Exclusive Early Trading", text: "Users who participate in the GRMF presale will gain exclusive early access to trade GRMF on the Ston.fi decentralized exchange (DEX). This allows you to trade freely before the official airdrop distribution and centralized exchange (CEX) listings, giving you a strategic advantage." },
    ar: { title: "تداول مبكر حصري", text: "سيحصل المستخدمون الذين يشاركون في البيع المسبق لعملة GRMF على وصول مبكر وحصري لتداول العملة على منصة Ston.fi اللامركزية (DEX). يتيح لك ذلك التداول بحرية قبل التوزيع الرسمي للايردروب والإدراج في المنصات المركزية (CEX)، مما يمنحك ميزة استراتيجية." },
    ru: { title: "Эксклюзивная ранняя торговля", text: "Пользователи, участвующие в пресейле GRMF, получат эксклюзивный ранний доступ к торговле на децентрализованной бирже Ston.fi (DEX). Это позволит вам свободно торговать до официального распределения аирдропа и листинга на централизованных биржах (CEX), давая вам стратегическое преимущество." },
    fa: { title: "معاملات زودهنگام انحصاری", text: "کاربرانی که در پیش‌فروش GRMF شرکت می‌کنند، دسترسی زودهنگام و انحصاری برای معامله در صرافی غیرمتمرکز Ston.fi (DEX) خواهند داشت. این به شما امکان می‌دهد قبل از توزیع رسمی ایردراپ و لیست شدن در صرافی‌های متمرکز (CEX) آزادانه معامله کنید و به شما یک مزیت استراتژیک می‌دهد." }
  };

  useEffect(() => {
    let unsubscribeBalance: () => void;
    let unsubscribeWithdrawals: () => void;

    const targetUid = userProfile?.id || localStorage.getItem('grmf_persistent_doc_id') || auth.currentUser?.uid;

    if (targetUid) {
      unsubscribeBalance = onSnapshot(doc(db, 'users', targetUid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const bal = data.presaleBalances && typeof data.presaleBalances.GRMF === 'number' ? data.presaleBalances.GRMF : 0;
          setBalance(bal);
        } else {
          setBalance(0);
        }
      }, (error) => {
        console.error("Balance snapshot error:", error);
      });

      const q = query(collection(db, 'withdrawal_requests'), where('userId', '==', targetUid), orderBy('createdAt', 'desc'));
      unsubscribeWithdrawals = onSnapshot(q, (snapshot) => {
        setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Withdrawals snapshot error:", error);
      });
    }

    const targetDate = new Date('2026-12-31T00:00:00Z').getTime();
    const startDate = new Date('2026-10-01T00:00:00Z').getTime();
    
    const initialNow = Date.now();
    if (initialNow > startDate) {
      const progress = Math.min(Math.max(0.65, (initialNow - startDate) / (targetDate - startDate)), 0.96);
      setSoldTokens(Math.floor(progress * TOTAL_POOL));
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const difference = targetDate - now;

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
      
      if (difference > 0 && now > startDate) {
        setSoldTokens(prev => {
          if (prev >= TOTAL_POOL) return TOTAL_POOL;
          const burst = Math.random() > 0.7 ? Math.floor(Math.random() * 150) + 25 : 0;
          return Math.min(prev + burst, TOTAL_POOL);
        });
      }
    }, 1000);

    return () => {
      if (unsubscribeBalance) unsubscribeBalance();
      if (unsubscribeWithdrawals) unsubscribeWithdrawals();
      clearInterval(timer);
    };
  }, [userProfile?.id]);

  const handleBuy = async () => {
    triggerHaptic('medium');
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
      if (resolvedUserId && resolvedUserId !== 'guest_123') {
        await setDoc(doc(db, 'users', resolvedUserId), {
          presaleBalances: {
            GRMF: increment(amountToBuy)
          }
        }, { merge: true });
      }
      showNotice(`Successfully purchased ${amountToBuy.toLocaleString()} GRMF!`, 'success');
    } catch (e) {
      showNotice("Transaction cancelled or failed.", 'error');
    }
  };

  const handleWithdraw = async () => {
    triggerHaptic('medium');
    if (withdrawAmount <= 0 || withdrawAmount > balance) {
      showNotice("Please enter a valid withdrawal amount within your balance.", 'error');
      return;
    }
    if (!withdrawAddress.trim()) {
      showNotice("Please enter your TON wallet address.", 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'withdrawal_requests'), {
        userId: resolvedUserId,
        amount: withdrawAmount,
        currency: 'GRMF',
        recipientAddress: withdrawAddress.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      if (resolvedUserId && resolvedUserId !== 'guest_123') {
        await setDoc(doc(db, 'users', resolvedUserId), {
          presaleBalances: {
            GRMF: increment(-withdrawAmount)
          }
        }, { merge: true });
      }
      showNotice("Withdrawal request submitted! Status: Pending.", 'success');
      setWithdrawAmount(0);
      setWithdrawAddress('');
    } catch (e) {
      console.error(e);
      showNotice("Failed to submit withdrawal request.", 'error');
    }
  };

  const handleCopyLink = () => {
    triggerHaptic('light');
    const link = `https://t.me/Grmfdex_bot?startapp=ref_${resolvedUserId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPercent = (soldTokens / TOTAL_POOL) * 100;
  const tonCost = (amountToBuy / 500).toFixed(2);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 pb-8"
      >
        {/* Top Presale Banner & Countdown */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="https://i.suar.me/vAdG5/l" alt="GRMF" referrerPolicy="no-referrer" className="w-10 h-10 rounded-2xl object-cover" />
              <div>
                <h1 className="text-base font-extrabold tracking-tight">GRMF Presale</h1>
                <p className="text-xs text-slate-400">Rate: <span className="font-mono tabular-nums text-white font-semibold">1 TON = 500 GRMF</span></p>
              </div>
            </div>
            <button 
              onClick={() => {
                triggerHaptic('light');
                setIsDexModalOpen(true);
              }}
              className="min-h-[38px] bg-white/10 hover:bg-white/15 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LineChart className="w-3.5 h-3.5 text-sky-400" />
              <span>Ston.fi Info</span>
            </button>
          </div>

          {/* Allocation Progress */}
          <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/60">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-slate-300 font-medium">Pool Allocation</span>
              <span className="font-mono tabular-nums font-bold text-sky-400">{progressPercent.toFixed(1)}% Sold</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden mb-2.5">
              <div className="bg-gradient-to-r from-[#0088CC] to-sky-400 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex justify-between items-center text-[11px] font-mono tabular-nums text-slate-400">
              <span>{soldTokens.toLocaleString()} GRMF</span>
              <span>{TOTAL_POOL.toLocaleString()} Total</span>
            </div>
          </div>

          {/* Countdown Strip */}
          <div className="mt-4 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Phase Ends In</span>
            </span>
            <div className="flex items-center gap-2 font-mono tabular-nums font-bold text-white">
              <span className="bg-slate-800 px-2 py-1 rounded-lg">{String(timeLeft.days).padStart(2, '0')}d</span>
              <span>:</span>
              <span className="bg-slate-800 px-2 py-1 rounded-lg">{String(timeLeft.hours).padStart(2, '0')}h</span>
              <span>:</span>
              <span className="bg-slate-800 px-2 py-1 rounded-lg">{String(timeLeft.minutes).padStart(2, '0')}m</span>
            </div>
          </div>
        </div>

        {/* Buy Allocation Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold text-slate-900">Purchase Allocation</h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              Cost: <strong className="text-slate-900">{tonCost} TON</strong>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200/60 mb-3.5">
            <button
              onClick={() => {
                triggerHaptic('light');
                setAmountToBuy(Math.max(500, amountToBuy - 500));
              }}
              aria-label="Decrease amount"
              className="min-h-[44px] min-w-[44px] bg-white hover:bg-slate-100 rounded-xl border border-slate-200/80 flex items-center justify-center text-slate-700 transition-colors cursor-pointer active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center">
              <span className="font-mono tabular-nums font-extrabold text-xl text-slate-900 block">
                {amountToBuy.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-400">GRMF TOKENS</span>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                setAmountToBuy(amountToBuy + 500);
              }}
              aria-label="Increase amount"
              className="min-h-[44px] min-w-[44px] bg-white hover:bg-slate-100 rounded-xl border border-slate-200/80 flex items-center justify-center text-slate-700 transition-colors cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleBuy}
            className="w-full min-h-[48px] py-3.5 bg-[#0088CC] hover:bg-[#0077B5] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white/20" />
            <span>Buy {amountToBuy.toLocaleString()} GRMF ({tonCost} TON)</span>
          </button>
        </div>

        {/* Presale Balance & Withdrawal Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Presale Vault</h2>
              <p className="text-xs text-slate-500">Withdraw purchased tokens to your TON wallet</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 font-semibold block">Purchased</span>
              <span className="text-sm font-mono tabular-nums font-extrabold text-slate-900">{balance.toLocaleString()} GRMF</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Amount to withdraw"
              value={withdrawAmount || ''}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              className="min-h-[44px] px-3.5 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:border-[#0088CC]"
            />
            <input
              type="text"
              placeholder="Recipient TON Wallet Address"
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              className="min-h-[44px] px-3.5 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0088CC]"
            />
          </div>

          <button
            onClick={handleWithdraw}
            className="w-full min-h-[44px] py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Withdrawal Request</span>
          </button>

          {withdrawals.length > 0 && (
            <div className="pt-3 border-t border-slate-100 divide-y divide-slate-100">
              {withdrawals.map((w) => (
                <div key={w.id} className="py-2 flex justify-between items-center text-xs">
                  <span className="font-mono tabular-nums font-bold text-slate-800">{w.amount.toLocaleString()} GRMF</span>
                  <span className={`font-semibold ${
                    w.status === 'approved' || w.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {w.status === 'pending' ? 'Pending Review' : (w.status === 'approved' || w.status === 'completed' ? 'Completed' : w.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Presale Referral Commission Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">10% Presale Referral</h3>
              <p className="text-xs text-slate-500">Earn 10% bonus on every friend's presale purchase</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60">
            <span className="flex-1 text-xs font-mono text-slate-600 px-2.5 truncate">
              https://t.me/Grmfdex_bot?startapp=ref_{resolvedUserId}
            </span>
            <button
              onClick={handleCopyLink}
              aria-label="Copy referral link"
              className={`min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                const url = `https://t.me/Grmfdex_bot?startapp=ref_${resolvedUserId}`;
                const text = encodeURIComponent("Join the GRMF Presale and get exclusive early DEX trading access!");
                openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`);
              }}
              aria-label="Share on Telegram"
              className="min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center bg-[#0088CC] text-white hover:bg-[#0077B5] transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-16 left-4 right-4 z-[130] max-w-sm mx-auto p-3.5 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ston.fi DEX Info Bottom Sheet */}
      <AnimatePresence>
        {isDexModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-sm"
              onClick={() => setIsDexModalOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col overflow-hidden max-w-lg mx-auto"
            >
              <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mt-3" />
              <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-sky-50 rounded-xl text-[#0088CC]">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <h2 className="font-extrabold text-slate-900">Ston.fi DEX Integration</h2>
                </div>
                <button
                  onClick={() => setIsDexModalOpen(false)}
                  className="p-2 bg-slate-100 rounded-full text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className={`p-6 overflow-y-auto flex-1 ${dexLang === 'ar' || dexLang === 'fa' ? 'text-right' : 'text-left'}`} dir={dexLang === 'ar' || dexLang === 'fa' ? 'rtl' : 'ltr'}>
                <div className="flex gap-1.5 mb-5 bg-slate-100 p-1 rounded-xl overflow-x-auto" dir="ltr">
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'ar', label: 'العربية' },
                    { code: 'ru', label: 'Русский' },
                    { code: 'fa', label: 'فارسی' }
                  ].map((lang) => (
                    <button 
                      key={lang.code}
                      onClick={() => setDexLang(lang.code as any)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        dexLang === lang.code ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-3">{DEX_TEXT[dexLang].title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {DEX_TEXT[dexLang].text}
                </p>

                <div className="mt-6 bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex items-center gap-3.5">
                  <img src="https://i.suar.me/rgZxz/l" alt="Ston.fi" referrerPolicy="no-referrer" className="w-11 h-11 rounded-full shadow-2xs shrink-0" />
                  <span className="font-bold text-slate-800 text-xs leading-snug">
                    Early liquidity pool access on Ston.fi prior to centralized exchange listings.
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
