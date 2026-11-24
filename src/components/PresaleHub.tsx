import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Send,
  Zap,
  Minus,
  Plus,
  X,
  LineChart,
  Users,
  Copy,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ShieldCheck,
  ArrowUpRight,
  Check,
  RefreshCw,
  FileText
} from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toNano, Address } from '@ton/core';
import {
  doc,
  setDoc,
  increment,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { openTelegramLink, triggerHaptic } from '../lib/telegram';

interface PresaleHubProps {
  userProfile?: any;
}

const PRESALE_RATE_PER_TON = 500; // 1 TON = 500 GRMF
const ESTIMATED_TON_USD = 5.4; // Reference TON price for valuation preview

function formatWalletShort(addr?: string): string {
  if (!addr || typeof addr !== 'string') return '—';
  const clean = addr.trim();
  if (clean.length <= 12) return clean;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

function formatRequestTime(rawCreatedAt: any, rawTimestamp?: any): string {
  let ms = 0;
  if (typeof rawTimestamp === 'number' && rawTimestamp > 0) {
    ms = rawTimestamp;
  } else if (rawCreatedAt?.toMillis) {
    ms = rawCreatedAt.toMillis();
  } else if (typeof rawCreatedAt?.seconds === 'number') {
    ms = rawCreatedAt.seconds * 1000;
  } else if (typeof rawCreatedAt === 'number') {
    ms = rawCreatedAt;
  }
  if (!ms) return 'Just now';
  try {
    return new Date(ms).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Just now';
  }
}

export const PresaleHub: React.FC<PresaleHubProps> = ({ userProfile }) => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [timeLeft, setTimeLeft] = useState({ days: 14, hours: 8, minutes: 45 });
  const [balance, setBalance] = useState<number>(() => {
    const cached =
      Number(userProfile?.presaleBalances?.GRMF) ||
      Number(userProfile?.['presaleBalances.GRMF']) ||
      0;
    return cached > 0 ? cached : 0;
  });
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [amountToBuy, setAmountToBuy] = useState<number>(500);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);
  const [isDexModalOpen, setIsDexModalOpen] = useState(false);
  const [dexLang, setDexLang] = useState<'en' | 'ar' | 'ru' | 'fa'>('en');
  const [copied, setCopied] = useState(false);
  const [copiedWithdrawId, setCopiedWithdrawId] = useState<string | null>(null);
  const [soldTokens, setSoldTokens] = useState<number>(3425000);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const TOTAL_POOL = 5000000;

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    triggerHaptic(type === 'success' ? 'success' : 'error');
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const resolvedUserId =
    userProfile?.id ||
    localStorage.getItem('grmf_persistent_doc_id') ||
    auth.currentUser?.uid ||
    'guest_123';

  // Connected friendly TON wallet address if available
  const connectedTonAddress = (() => {
    const rawAddr = wallet?.account?.address;
    if (!rawAddr) return '';
    try {
      return Address.parse(rawAddr).toString({ bounceable: false });
    } catch {
      return rawAddr;
    }
  })();

  const DEX_TEXT = {
    en: {
      title: 'Exclusive Early Trading',
      text: 'Users who participate in the GRMF presale will gain exclusive early access to trade GRMF on the Ston.fi decentralized exchange (DEX). This allows you to trade freely before the official airdrop distribution and centralized exchange (CEX) listings, giving you a strategic advantage.'
    },
    ar: {
      title: 'تداول مبكر حصري',
      text: 'سيحصل المستخدمون الذين يشاركون في البيع المسبق لعملة GRMF على وصول مبكر وحصري لتداول العملة على منصة Ston.fi اللامركزية (DEX). يتيح لك ذلك التداول بحرية قبل التوزيع الرسمي للايردروب والإدراج في المنصات المركزية (CEX)، مما يمنحك ميزة استراتيجية.'
    },
    ru: {
      title: 'Эксклюзивная ранняя торговля',
      text: 'Пользователи, участвующие в пресейле GRMF, получат эксклюзивный ранний доступ к торговле на децентрализованной бирже Ston.fi (DEX). Это позволит вам свободно торговать до официального распределения аирдропа и листинга на централизованных биржах (CEX), давая вам стратегическое преимущество.'
    },
    fa: {
      title: 'معاملات زودهنگام انحصاری',
      text: 'کاربرانی که در پیش‌فروش GRMF شرکت می‌کنند، دسترسی زودهنگام و انحصاری برای معامله در صرافی غیرمتمرکز Ston.fi (DEX) خواهند داشت. این به شما امکان می‌دهد قبل از توزیع رسمی ایردراپ و لیست شدن در صرافی‌های متمرکز (CEX) آزادانه معامله کنید و به شما یک مزیت استراتژیک می‌دهد.'
    }
  };

  useEffect(() => {
    let unsubscribeBalance: (() => void) | undefined;
    let unsubscribeWithdrawals: (() => void) | undefined;

    const targetUid =
      userProfile?.id ||
      localStorage.getItem('grmf_persistent_doc_id') ||
      auth.currentUser?.uid;

    if (targetUid) {
      unsubscribeBalance = onSnapshot(
        doc(db, 'users', targetUid),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const nestedBal =
              data.presaleBalances && typeof data.presaleBalances.GRMF === 'number'
                ? data.presaleBalances.GRMF
                : 0;
            const flatBal =
              typeof data['presaleBalances.GRMF'] === 'number'
                ? data['presaleBalances.GRMF']
                : 0;
            setBalance(Math.max(0, nestedBal || flatBal));
          } else {
            setBalance(0);
          }
        },
        (error) => {
          console.error('Balance snapshot error:', error);
        }
      );

      // Query by userId without composite index dependence, then sort client-side by timestamp descending
      const q = query(
        collection(db, 'withdrawal_requests'),
        where('userId', '==', targetUid)
      );
      unsubscribeWithdrawals = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          items.sort((a: any, b: any) => {
            const tsA =
              a.createdTimestamp ||
              a.createdAt?.toMillis?.() ||
              (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const tsB =
              b.createdTimestamp ||
              b.createdAt?.toMillis?.() ||
              (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return tsB - tsA;
          });
          setWithdrawals(items);
        },
        (error) => {
          console.error('Withdrawals snapshot error:', error);
        }
      );
    }

    const targetDate = new Date('2026-12-31T00:00:00Z').getTime();
    const startDate = new Date('2026-10-01T00:00:00Z').getTime();

    const initialNow = Date.now();
    if (initialNow > startDate) {
      const progress = Math.min(
        Math.max(0.65, (initialNow - startDate) / (targetDate - startDate)),
        0.96
      );
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
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        });
      }

      if (difference > 0 && now > startDate) {
        setSoldTokens((prev) => {
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
    const tonAmount = (amountToBuy / PRESALE_RATE_PER_TON).toString();
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [
        {
          address: 'UQAJcp9v_CqgdqHmAjs8sZRs0UPkQgZBuWct2AfMBJfgP6QS',
          amount: toNano(tonAmount).toString()
        }
      ]
    };
    try {
      await tonConnectUI.sendTransaction(transaction);
      if (resolvedUserId && resolvedUserId !== 'guest_123') {
        await setDoc(
          doc(db, 'users', resolvedUserId),
          {
            presaleBalances: {
              GRMF: increment(amountToBuy)
            }
          },
          { merge: true }
        );
      }
      showNotice(`Successfully purchased ${amountToBuy.toLocaleString()} GRMF!`, 'success');
    } catch (e) {
      showNotice('Transaction cancelled or failed.', 'error');
    }
  };

  const handleWithdraw = async () => {
    triggerHaptic('medium');
    const parsedWithdrawAmt = Number(withdrawAmount);
    if (!parsedWithdrawAmt || isNaN(parsedWithdrawAmt) || parsedWithdrawAmt <= 0) {
      showNotice('Please enter a valid withdrawal amount.', 'error');
      return;
    }
    if (parsedWithdrawAmt > balance) {
      showNotice('Insufficient available presale balance.', 'error');
      return;
    }
    if (!withdrawAddress.trim() || withdrawAddress.trim().length < 15) {
      showNotice('Please enter a valid recipient TON wallet address.', 'error');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const nowTs = Date.now();
      await addDoc(collection(db, 'withdrawal_requests'), {
        userId: resolvedUserId,
        username: userProfile?.username || userProfile?.telegramUsername || null,
        telegramId: userProfile?.telegramId || null,
        amount: parsedWithdrawAmt,
        currency: 'GRMF',
        tonEquivalent: Number((parsedWithdrawAmt / PRESALE_RATE_PER_TON).toFixed(4)),
        recipientAddress: withdrawAddress.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        createdTimestamp: nowTs
      });

      if (resolvedUserId && resolvedUserId !== 'guest_123') {
        await setDoc(
          doc(db, 'users', resolvedUserId),
          {
            presaleBalances: {
              GRMF: increment(-parsedWithdrawAmt)
            }
          },
          { merge: true }
        );
      }
      showNotice('Withdrawal request submitted for on-chain settlement.', 'success');
      setWithdrawAmount('');
    } catch (e) {
      console.error(e);
      showNotice('Failed to submit withdrawal request.', 'error');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const handleCopyLink = () => {
    triggerHaptic('light');
    const link = `https://t.me/Grmfdex_bot?startapp=ref_${resolvedUserId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAddress = (id: string, addr: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(addr);
    setCopiedWithdrawId(id);
    setTimeout(() => setCopiedWithdrawId(null), 1800);
  };

  // Compute comprehensive Presale Vault metrics
  const pendingWithdrawals = withdrawals.filter(
    (w) => !w.status || w.status === 'pending' || w.status === 'processing'
  );
  const completedWithdrawals = withdrawals.filter(
    (w) => w.status === 'approved' || w.status === 'completed'
  );
  const pendingAmountTotal = pendingWithdrawals.reduce(
    (sum, w) => sum + (Number(w.amount) || 0),
    0
  );
  const completedAmountTotal = completedWithdrawals.reduce(
    (sum, w) => sum + (Number(w.amount) || 0),
    0
  );
  const totalPurchasedAllocation = balance + pendingAmountTotal + completedAmountTotal;
  const availableTonValue = balance / PRESALE_RATE_TON_SAFE();
  const availableUsdValue = availableTonValue * ESTIMATED_TON_USD;
  const ecosystemRewardBalance = Math.max(
    Number(userProfile?.realBalances?.GRMF) || 0,
    Number(userProfile?.betaBalances?.GRMF) || 0
  );

  function PRESALE_RATE_TON_SAFE() {
    return PRESALE_RATE_PER_TON > 0 ? PRESALE_RATE_PER_TON : 500;
  }

  const progressPercent = (soldTokens / TOTAL_POOL) * 100;
  const tonCost = (amountToBuy / PRESALE_RATE_PER_TON).toFixed(2);

  // Overall Vault Withdrawal Status summary
  const vaultOverallStatus =
    pendingWithdrawals.length > 0
      ? {
          label: `${pendingWithdrawals.length} Pending Settlement`,
          tone: 'amber' as const,
          subtext: 'Your withdrawal is queued for on-chain TON verification'
        }
      : balance > 0
        ? {
            label: 'Unlocked & Ready',
            tone: 'emerald' as const,
            subtext: 'Presale allocation is available for direct TON wallet withdrawal'
          }
        : completedWithdrawals.length > 0
          ? {
              label: 'Settled On-Chain',
              tone: 'sky' as const,
              subtext: 'All submitted presale withdrawals have been processed'
            }
          : {
              label: 'Awaiting Allocation',
              tone: 'slate' as const,
              subtext: 'Purchase presale tokens below to unlock instant DEX & wallet withdrawals'
            };

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
              <img
                src="https://i.suar.me/vAdG5/l"
                alt="GRMF"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-2xl object-cover"
              />
              <div>
                <h1 className="text-base font-extrabold tracking-tight">GRMF Presale</h1>
                <p className="text-xs text-slate-400">
                  Rate: <span className="font-mono tabular-nums text-white font-semibold">1 TON = 500 GRMF</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsDexModalOpen(true);
              }}
              className="min-h-[38px] bg-white/10 hover:bg-white/15 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LineChart className="w-3.5 h-3.5 text-sky-400" />
              <span>Ston.fi Info</span>
            </button>
          </div>

          {/* Allocation Progress */}
          <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/60">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-slate-300 font-medium">Pool Allocation</span>
              <span className="font-mono tabular-nums font-bold text-sky-400">
                {progressPercent.toFixed(1)}% Sold
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden mb-2.5">
              <div
                className="bg-gradient-to-r from-[#0088CC] to-sky-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
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
              <span className="bg-slate-800 px-2 py-1 rounded-lg">
                {String(timeLeft.days).padStart(2, '0')}d
              </span>
              <span>:</span>
              <span className="bg-slate-800 px-2 py-1 rounded-lg">
                {String(timeLeft.hours).padStart(2, '0')}h
              </span>
              <span>:</span>
              <span className="bg-slate-800 px-2 py-1 rounded-lg">
                {String(timeLeft.minutes).padStart(2, '0')}m
              </span>
            </div>
          </div>
        </div>

        {/* Buy Allocation Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Purchase Allocation</h2>
              <p className="text-xs text-slate-500">Instant credit to your Presale Vault</p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              Cost: <strong className="text-slate-900">{tonCost} TON</strong>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200/60 mb-3">
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

          {/* Quick Package Selector Buttons */}
          <div className="grid grid-cols-4 gap-1.5 mb-3.5">
            {[500, 2500, 5000, 10000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setAmountToBuy(preset);
                }}
                className={`min-h-[36px] py-1.5 px-2 rounded-xl text-xs font-mono tabular-nums font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  amountToBuy === preset
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset >= 1000 ? `${preset / 1000}K` : preset}
              </button>
            ))}
          </div>

          <button
            onClick={handleBuy}
            className="w-full min-h-[48px] py-3.5 bg-[#0088CC] hover:bg-[#0077B5] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white/20" />
            <span>
              Buy {amountToBuy.toLocaleString()} GRMF ({tonCost} TON)
            </span>
          </button>
        </div>

        {/* Unified Presale Vault: Balance, On-Chain Withdrawal & Settlement Status Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-4">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0088CC] flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Presale Vault & Withdrawal
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {vaultOverallStatus.subtext}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold ${
                  vaultOverallStatus.tone === 'emerald'
                    ? 'text-emerald-600'
                    : vaultOverallStatus.tone === 'amber'
                      ? 'text-amber-600'
                      : vaultOverallStatus.tone === 'sky'
                        ? 'text-[#0088CC]'
                        : 'text-slate-500'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{vaultOverallStatus.label}</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                Early Ston.fi Pool
              </span>
            </div>
          </div>

          {/* Primary Balance Display & 3-Metric Breakdown */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block mb-0.5">
                  Available Presale Balance
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight text-white">
                    {balance.toLocaleString()}
                  </span>
                  <span className="text-xs font-extrabold text-sky-400 font-mono">
                    GRMF
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-medium block mb-0.5">
                  Presale Valuation
                </span>
                <div className="text-xs font-mono tabular-nums font-bold text-slate-200">
                  <span>{availableTonValue.toFixed(2)} TON</span>
                  <span className="mx-1.5 text-slate-600">·</span>
                  <span className="text-emerald-400">≈ ${availableUsdValue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 3-Column Allocation Breakdown */}
            <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Total Purchased
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-white">
                  {totalPurchasedAllocation.toLocaleString()} GRMF
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">
                  In Withdrawal
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-amber-400">
                  {pendingAmountTotal.toLocaleString()} GRMF
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-medium block">
                  Settled Out
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-emerald-400">
                  {completedAmountTotal.toLocaleString()} GRMF
                </span>
              </div>
            </div>
          </div>

          {/* Ecosystem Reward Balance Reference Strip */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Ecosystem & Airdrop Balance</span>
            <span className="font-mono tabular-nums font-bold text-slate-700">
              {ecosystemRewardBalance.toLocaleString()} GRMF
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="text-slate-400 font-normal">Separate Vault</span>
            </span>
          </div>

          {/* Integrated Withdrawal Form Controls */}
          <div className="pt-3.5 border-t border-slate-100 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-900">
                Withdraw to TON Wallet
              </span>
              <span className="font-mono tabular-nums font-semibold text-slate-500">
                Withdrawable: <strong className="text-slate-900">{balance.toLocaleString()} GRMF</strong>
              </span>
            </div>

            <div className="relative flex items-center">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Withdrawal amount (GRMF)"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full min-h-[44px] pl-3.5 pr-16 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:border-[#0088CC]"
              />
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  if (balance > 0) setWithdrawAmount(String(balance));
                }}
                disabled={balance <= 0}
                className="absolute right-2 px-2.5 py-1 rounded-lg bg-slate-200/80 hover:bg-slate-300/80 disabled:opacity-40 text-[11px] font-extrabold text-slate-800 transition-colors cursor-pointer"
              >
                MAX
              </button>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Recipient TON Wallet Address (UQ... / EQ...)"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                className={`w-full min-h-[44px] pl-3.5 ${
                  connectedTonAddress ? 'pr-24' : 'pr-3.5'
                } py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0088CC]`}
              />
              {connectedTonAddress && withdrawAddress !== connectedTonAddress && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setWithdrawAddress(connectedTonAddress);
                  }}
                  className="absolute right-2 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[11px] font-bold text-[#0088CC] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Use Wallet
                </button>
              )}
            </div>

            <button
              onClick={handleWithdraw}
              disabled={isSubmittingWithdraw || balance <= 0}
              className="w-full min-h-[46px] py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSubmittingWithdraw
                  ? 'Submitting Request...'
                  : balance > 0
                    ? 'Submit Withdrawal Request'
                    : 'No Presale Balance Available to Withdraw'}
              </span>
            </button>
          </div>

          {/* Integrated Withdrawal Requests & Settlement Pipeline Tracker */}
          <div className="pt-3.5 border-t border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0088CC]" />
                <span>Withdrawal Status Ledger</span>
              </span>
              <span className="text-slate-400 font-mono tabular-nums">
                {withdrawals.length} {withdrawals.length === 1 ? 'Request' : 'Requests'}
              </span>
            </div>

            {withdrawals.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">No Active Withdrawal Requests</span>
                  <span className="text-slate-400 font-mono text-[11px]">Pipeline Ready</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Submitted withdrawals go through a 3-stage settlement process: Request Logged → Liquidity Verification → Direct TON Jetton Transfer.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/70 rounded-2xl overflow-hidden bg-slate-50/50">
                {withdrawals.map((w) => {
                  const rawStatus = String(w.status || 'pending').toLowerCase();
                  const isCompleted = rawStatus === 'approved' || rawStatus === 'completed';
                  const isRejected = rawStatus === 'rejected' || rawStatus === 'failed' || rawStatus === 'cancelled';
                  const isProcessing = rawStatus === 'processing';
                  const wAmt = Number(w.amount) || 0;
                  const wTon = (wAmt / PRESALE_RATE_PER_TON).toFixed(2);
                  const currentStep = isCompleted ? 3 : isRejected ? 0 : isProcessing ? 2 : 2;

                  return (
                    <div key={w.id} className="p-3.5 flex flex-col gap-2.5 bg-white">
                      {/* Top Row: Amount, Reference ID & Semantic Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-extrabold font-mono tabular-nums text-slate-900">
                              {wAmt.toLocaleString()} GRMF
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-slate-400">
                              · ≈ {wTon} TON
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
                            <span>Ref #{String(w.id).slice(0, 6).toUpperCase()}</span>
                            <span>·</span>
                            <span>{formatRequestTime(w.createdAt, w.createdTimestamp)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Completed</span>
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Declined</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                              <span>{isProcessing ? 'Processing' : 'Pending Audit'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3-Step Settlement Progress Bar */}
                      {!isRejected && (
                        <div className="flex flex-col gap-1.5 pt-0.5">
                          <div className="grid grid-cols-3 gap-1.5">
                            {[1, 2, 3].map((step) => (
                              <div
                                key={step}
                                className={`h-1.5 rounded-full transition-colors ${
                                  isCompleted
                                    ? 'bg-emerald-500'
                                    : step <= currentStep
                                      ? 'bg-[#0088CC]'
                                      : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
                            <span className="text-slate-800 font-semibold">1. Submitted</span>
                            <span className={currentStep >= 2 ? 'text-slate-800 font-semibold' : ''}>
                              2. Security Audit
                            </span>
                            <span className={isCompleted ? 'text-emerald-600 font-bold' : ''}>
                              3. Sent to Wallet
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Recipient TON Wallet Row */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                        <span className="truncate">
                          Destination:{' '}
                          <strong className="font-mono text-slate-700">
                            {formatWalletShort(w.recipientAddress)}
                          </strong>
                        </span>
                        {w.recipientAddress && (
                          <button
                            type="button"
                            onClick={() => handleCopyAddress(w.id, w.recipientAddress)}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 font-semibold transition-colors cursor-pointer shrink-0"
                          >
                            {copiedWithdrawId === w.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Presale Referral Commission Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">10% Presale Referral</h3>
              <p className="text-xs text-slate-500">
                Earn 10% bonus on every friend's presale purchase
              </p>
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
                const text = encodeURIComponent(
                  'Join the GRMF Presale and get exclusive early DEX trading access!'
                );
                openTelegramLink(
                  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`
                );
              }}
              aria-label="Share on Telegram"
              className="min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center bg-[#0088CC] text-white hover:bg-[#0077B5] transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
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
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
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

              <div
                className={`p-6 overflow-y-auto flex-1 ${
                  dexLang === 'ar' || dexLang === 'fa' ? 'text-right' : 'text-left'
                }`}
                dir={dexLang === 'ar' || dexLang === 'fa' ? 'rtl' : 'ltr'}
              >
                <div
                  className="flex gap-1.5 mb-5 bg-slate-100 p-1 rounded-xl overflow-x-auto"
                  dir="ltr"
                >
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
                        dexLang === lang.code
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-3">
                  {DEX_TEXT[dexLang].title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {DEX_TEXT[dexLang].text}
                </p>

                <div className="mt-6 bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex items-center gap-3.5">
                  <img
                    src="https://i.suar.me/rgZxz/l"
                    alt="Ston.fi"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full shadow-2xs shrink-0"
                  />
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
