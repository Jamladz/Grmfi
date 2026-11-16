import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Rocket,
  Clock,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Zap,
  Crown,
  Sparkles,
  Flame,
  LockOpen,
  Wallet,
  Award,
  PartyPopper,
  AlertCircle,
  TrendingUp,
  Layers,
  Check,
  ChevronRight,
  Globe
} from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { serverTimestamp } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { grantReward } from '../lib/rewardsEngine';
import { triggerHaptic } from '../lib/telegram';
import { TOKENS } from '../data/tokens';

interface AirdropViewProps {
  userProfile?: any;
  wallet?: any;
  onOpenWalletModal?: () => void;
  setActiveView?: (view: any) => void;
}

interface AirdropBooster {
  id: string;
  name: string;
  tierLabel: string;
  subtitle: string;
  priceTon: number;
  boostPct: number; // e.g. 25 means +25% (+0.25x)
  instantGrmf: number;
  xpBonus: number;
  badgeText: string;
  perks: string[];
  accent: 'sky' | 'indigo' | 'emerald' | 'amber';
  popular?: boolean;
}

const TREASURY_ADDRESS = 'UQAJcp9v_CqgdqHmAjs8sZRs0UPkQgZBuWct2AfMBJfgP6QS';
const GRMF_TOKEN = TOKENS.find((t) => t.symbol === 'GRMF') || TOKENS[0];
const GRMF_LISTING_PRICE_USD = GRMF_TOKEN?.priceUsd || 0.004;

const AIRDROP_BOOSTERS: AirdropBooster[] = [
  {
    id: 'verify_pass',
    name: 'On-Chain Verification Pass',
    tierLabel: 'NODE I · VERIFIED',
    subtitle: 'Anti-Sybil Badge & +25% Distribution Share',
    priceTon: 0.5,
    boostPct: 25,
    instantGrmf: 1500,
    xpBonus: 100,
    badgeText: '+25% Share',
    perks: [
      'Verified Priority Wallet status in snapshot',
      '+25% multiplier on total GRMF balance',
      '+1,500 GRMF credited immediately'
    ],
    accent: 'sky'
  },
  {
    id: 'turbo_2x',
    name: 'Turbo Allocation Booster',
    tierLabel: 'NODE II · TURBO',
    subtitle: '+75% Distribution Share & 100% TGE Unlock',
    priceTon: 1.5,
    boostPct: 75,
    instantGrmf: 5000,
    xpBonus: 300,
    badgeText: '+75% Share',
    perks: [
      'Removes vesting lock (100% unlocked at TGE)',
      '+75% multiplier on total GRMF balance',
      '+5,000 GRMF credited immediately'
    ],
    accent: 'indigo',
    popular: true
  },
  {
    id: 'whale_3x',
    name: 'Whale Pool Priority Pass',
    tierLabel: 'NODE III · WHALE',
    subtitle: '+150% Distribution Share & Priority Claim',
    priceTon: 3.0,
    boostPct: 150,
    instantGrmf: 12000,
    xpBonus: 750,
    badgeText: '+150% Share',
    perks: [
      'Direct entry into Tier-1 Whale Airdrop Pool',
      '+150% multiplier on total GRMF balance',
      '+12,000 GRMF credited immediately'
    ],
    accent: 'emerald'
  },
  {
    id: 'genesis_5x',
    name: 'Genesis VIP Multiplier Node',
    tierLabel: 'NODE IV · GENESIS VIP',
    subtitle: '+300% Max Distribution Share & Early DEX Claim',
    priceTon: 5.0,
    boostPct: 300,
    instantGrmf: 25000,
    xpBonus: 1500,
    badgeText: '+300% Share',
    perks: [
      'Maximum 4.0x+ distribution weight at snapshot',
      'Early claim 24h before public TGE window',
      '+25,000 GRMF credited immediately'
    ],
    accent: 'amber'
  }
];

export const AirdropView: React.FC<AirdropViewProps> = ({
  userProfile,
  wallet,
  onOpenWalletModal,
  setActiveView,
}) => {
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'boosters' | 'criteria' | 'roadmap'>('boosters');
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [successBoostModal, setSuccessBoostModal] = useState<AirdropBooster | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    triggerHaptic(type === 'success' ? 'success' : 'error');
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const realGrmf = userProfile?.realBalances?.GRMF || 0;
  const presaleGrmf = userProfile?.presaleBalances?.GRMF || 0;
  const inviteCount = Math.max(userProfile?.referralsCount || 0, userProfile?.inviteCount || 0);
  const taskProgress = userProfile?.taskProgress || {};
  const completedTasksCount = Object.values(taskProgress).filter(
    (t: any) => t?.status === 'completed' || t?.status === 'claimed'
  ).length;
  const totalSpinsCount = Number(taskProgress?.daily_spin?.totalSpins || 0);

  const isWalletConnected = Boolean(wallet?.isConnected || tonWallet);
  const purchasedBoosters = userProfile?.airdropBoosters || {};

  // Calculate Free Organic Boost %
  const walletBoostPct = isWalletConnected ? 10 : 0;
  const tasksBoostPct = completedTasksCount >= 3 ? 10 : completedTasksCount > 0 ? 5 : 0;
  const referralsBoostPct = inviteCount >= 10 ? 25 : inviteCount >= 3 ? 15 : inviteCount >= 1 ? 5 : 0;
  const organicBoostPct = walletBoostPct + tasksBoostPct + referralsBoostPct;

  // Calculate Paid Boosters %
  const paidBoostPct = AIRDROP_BOOSTERS.reduce((sum, b) => {
    const entry = purchasedBoosters[b.id];
    const isPurchased = entry === true || (typeof entry === 'object' && entry?.active);
    return sum + (isPurchased ? b.boostPct : 0);
  }, 0);

  const activeBoostersCount = AIRDROP_BOOSTERS.filter((b) => {
    const entry = purchasedBoosters[b.id];
    return entry === true || (typeof entry === 'object' && entry?.active);
  }).length;

  const totalBoostPct = organicBoostPct + paidBoostPct;
  const totalMultiplier = 1 + totalBoostPct / 100;
  const baseEligibleTokens = realGrmf + presaleGrmf;
  const bonusAllocationTokens = Math.round(baseEligibleTokens * (totalBoostPct / 100));
  const finalEstimatedAllocation = baseEligibleTokens + bonusAllocationTokens;
  const estimatedUsdValue = finalEstimatedAllocation * GRMF_LISTING_PRICE_USD;

  const hasAnyPaidBooster = paidBoostPct > 0;
  const tgeUnlockPct = hasAnyPaidBooster ? 100 : isWalletConnected ? 60 : 40;

  // Calculate Eligibility Readiness Score (0 - 100%)
  const readinessScore = useMemo(() => {
    let score = 20; // Base active account
    if (isWalletConnected) score += 30;
    if (completedTasksCount >= 3) score += 20;
    else if (completedTasksCount >= 1) score += 10;
    if (inviteCount >= 3) score += 15;
    else if (inviteCount >= 1) score += 8;
    if (hasAnyPaidBooster) score += 15;
    return Math.min(100, score);
  }, [isWalletConnected, completedTasksCount, inviteCount, hasAnyPaidBooster]);

  // Determine User Tier
  const allocationTier =
    totalBoostPct >= 250 || finalEstimatedAllocation >= 50000
      ? { name: 'Genesis Whale', level: 4, color: 'text-amber-400', border: 'border-amber-400/30', bg: 'bg-amber-400/10' }
      : totalBoostPct >= 100 || finalEstimatedAllocation >= 20000
        ? { name: 'Diamond Node', level: 3, color: 'text-sky-400', border: 'border-sky-400/30', bg: 'bg-sky-400/10' }
        : totalBoostPct >= 30 || finalEstimatedAllocation >= 8000
          ? { name: 'Gold Holder', level: 2, color: 'text-emerald-400', border: 'border-emerald-400/30', bg: 'bg-emerald-400/10' }
          : { name: 'Standard Explorer', level: 1, color: 'text-slate-300', border: 'border-white/15', bg: 'bg-white/5' };

  const tierSteps = [
    { level: 1, label: 'Standard', minMult: '1.0x' },
    { level: 2, label: 'Gold', minMult: '1.3x' },
    { level: 3, label: 'Diamond', minMult: '2.0x' },
    { level: 4, label: 'Genesis', minMult: '3.5x+' }
  ];

  const handleBuyBooster = async (booster: AirdropBooster) => {
    triggerHaptic('medium');

    const entry = purchasedBoosters[booster.id];
    const alreadyOwned = entry === true || (typeof entry === 'object' && entry?.active);
    if (alreadyOwned) {
      showToast(`${booster.name} is already active on your account!`, 'success');
      return;
    }

    if (!tonWallet) {
      tonConnectUI.openModal();
      return;
    }

    setPurchasingId(booster.id);
    try {
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: TREASURY_ADDRESS,
            amount: toNano(booster.priceTon.toString()).toString()
          }
        ]
      };

      await tonConnectUI.sendTransaction(transaction);

      const targetId =
        userProfile?.id ||
        localStorage.getItem('grmf_persistent_doc_id') ||
        auth.currentUser?.uid;

      if (targetId) {
        const now = Date.now();
        await grantReward({
          userId: targetId,
          telegramId: userProfile?.telegramId,
          username: userProfile?.username || userProfile?.telegramUsername,
          firstName: userProfile?.firstName,
          source: `airdrop_booster_${booster.id}`,
          amount: booster.instantGrmf,
          symbol: 'GRMF',
          xp: booster.xpBonus,
          balanceType: 'both',
          extraUserUpdates: {
            [`airdropBoosters.${booster.id}.active`]: true,
            [`airdropBoosters.${booster.id}.purchasedAt`]: now,
            [`airdropBoosters.${booster.id}.priceTon`]: booster.priceTon,
            [`airdropBoosters.${booster.id}.boostPct`]: booster.boostPct,
            lastActiveAt: serverTimestamp()
          }
        });
      }

      triggerHaptic('success');
      setSuccessBoostModal(booster);
    } catch (err) {
      console.warn('Booster purchase cancelled or failed:', err);
      showToast('TON transaction was cancelled or not completed.', 'error');
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 pb-10"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 border shadow-sm ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notice.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mainnet Allocation Command Vault (Hero Card) */}
      <div className="relative bg-gradient-to-br from-slate-950 via-[#0A1428] to-slate-900 text-white rounded-3xl p-5 shadow-xl border border-slate-800/80 overflow-hidden">
        {/* Ambient Lighting Accents */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#0088CC]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Status Header */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative w-11 h-11 rounded-2xl bg-white/10 p-1.5 border border-white/15 flex items-center justify-center shrink-0">
              <img
                src={GRMF_TOKEN.iconUrl}
                alt="GRMF"
                className="w-full h-full rounded-full object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Mainnet TGE Vault
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs font-extrabold ${allocationTier.color}`}>
                  {allocationTier.name}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[11px] font-mono tabular-nums text-emerald-400 font-bold">
                  {tgeUnlockPct}% TGE Unlock
                </span>
              </div>
            </div>
          </div>

          <div className="text-right bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl px-3 py-1.5">
            <span className="text-[10px] text-slate-400 font-semibold block">Active Boost</span>
            <span className="text-sm font-extrabold font-mono tabular-nums text-amber-400">
              {totalMultiplier.toFixed(2)}x (+{totalBoostPct}%)
            </span>
          </div>
        </div>

        {/* Center Allocation Display Panel */}
        <div className="relative z-10 bg-white/[0.05] backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-300">
              Estimated Final Airdrop
            </span>
            <span className="text-[11px] font-mono tabular-nums text-emerald-400 font-bold">
              +{bonusAllocationTokens.toLocaleString()} Bonus GRMF
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div className="flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {finalEstimatedAllocation.toLocaleString()}
              </span>
              <span className="text-xs font-extrabold text-sky-400">GRMF</span>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono tabular-nums font-bold text-slate-300">
                ≈ ${estimatedUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                @ ${GRMF_LISTING_PRICE_USD} TGE
              </span>
            </div>
          </div>

          {/* Dual-Segment Allocation Bar (Base vs Multiplier Bonus) */}
          <div className="w-full h-2 bg-slate-950/90 rounded-full overflow-hidden mt-3.5 flex p-0.5 border border-white/5">
            <div
              className="h-full bg-sky-500 rounded-l-full transition-all duration-500"
              style={{
                width: `${Math.min(75, Math.max(25, (baseEligibleTokens / Math.max(1, finalEstimatedAllocation)) * 100))}%`
              }}
            />
            <div
              className="h-full bg-amber-400 rounded-r-full transition-all duration-500"
              style={{
                width: `${Math.min(75, (bonusAllocationTokens / Math.max(1, finalEstimatedAllocation)) * 100)}%`
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mt-2 font-mono tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
              Base: {baseEligibleTokens.toLocaleString()} GRMF
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Boost: +{totalBoostPct}%
            </span>
          </div>
        </div>

        {/* Tier Progression Strip */}
        <div className="relative z-10 mb-4">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-0.5">
            <span>Airdrop Tier Progression</span>
            <span className="font-mono text-sky-400">Readiness {readinessScore}%</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {tierSteps.map((step) => {
              const isReached = allocationTier.level >= step.level;
              const isCurrent = allocationTier.level === step.level;
              return (
                <div
                  key={step.level}
                  className={`rounded-xl py-2 px-2 border text-center transition-all ${
                    isCurrent
                      ? 'bg-sky-500/20 border-sky-400/60 text-white'
                      : isReached
                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                        : 'bg-white/[0.03] border-white/10 text-slate-500'
                  }`}
                >
                  <span className="text-[10px] font-extrabold block truncate">{step.label}</span>
                  <span className="text-[9px] font-mono tabular-nums opacity-80 block mt-0.5">
                    {step.minMult}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3-Column Snapshot Metrics */}
        <div className="relative z-10 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl py-2.5 px-2">
            <span className="text-[10px] text-slate-400 font-semibold block">Organic Boost</span>
            <span className="text-xs font-extrabold font-mono tabular-nums text-white mt-0.5 block">
              +{organicBoostPct}%
            </span>
          </div>
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl py-2.5 px-2">
            <span className="text-[10px] text-slate-400 font-semibold block">Node Boost</span>
            <span className="text-xs font-extrabold font-mono tabular-nums text-amber-400 mt-0.5 block">
              +{paidBoostPct}% ({activeBoostersCount}/4)
            </span>
          </div>
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl py-2.5 px-2">
            <span className="text-[10px] text-slate-400 font-semibold block">TGE Vesting</span>
            <span className="text-xs font-extrabold font-mono tabular-nums text-emerald-400 mt-0.5 block">
              {hasAnyPaidBooster ? '0% Lock' : `${tgeUnlockPct}% TGE`}
            </span>
          </div>
        </div>
      </div>

      {/* 3-Tab Segmented Switcher */}
      <div className="flex bg-slate-200/75 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveSubTab('boosters');
          }}
          className={`flex-1 min-h-[38px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'boosters'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Boosters</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveSubTab('criteria');
          }}
          className={`flex-1 min-h-[38px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'criteria'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#0088CC]" />
          <span>Eligibility</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveSubTab('roadmap');
          }}
          className={`flex-1 min-h-[38px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'roadmap'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>TGE Roadmap</span>
        </button>
      </div>

      {/* TAB 1: PAID ALLOCATION MULTIPLIERS */}
      {activeSubTab === 'boosters' && (
        <div className="flex flex-col gap-3">
          {/* Section Banner */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  On-Chain Allocation Multipliers
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Stack TON nodes to boost your TGE share & unlock 100% with zero vesting
                </p>
              </div>
            </div>
          </div>

          {/* Booster Cards */}
          <div className="flex flex-col gap-3">
            {AIRDROP_BOOSTERS.map((booster) => {
              const entry = purchasedBoosters[booster.id];
              const isOwned = entry === true || (typeof entry === 'object' && entry?.active);
              const isBuying = purchasingId === booster.id;

              const accentStyles =
                booster.accent === 'amber'
                  ? {
                      iconBox: 'bg-amber-50 text-amber-600 border-amber-200/70',
                      cardBorder: isOwned ? 'border-emerald-300' : 'border-amber-200/90',
                      tierText: 'text-amber-600',
                      btn: 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    }
                  : booster.accent === 'emerald'
                    ? {
                        iconBox: 'bg-emerald-50 text-emerald-600 border-emerald-200/70',
                        cardBorder: isOwned ? 'border-emerald-300' : 'border-slate-200/80',
                        tierText: 'text-emerald-600',
                        btn: 'bg-slate-900 hover:bg-slate-800 text-white'
                      }
                    : booster.accent === 'indigo'
                      ? {
                          iconBox: 'bg-indigo-50 text-indigo-600 border-indigo-200/70',
                          cardBorder: isOwned ? 'border-emerald-300' : 'border-indigo-200/90',
                          tierText: 'text-indigo-600',
                          btn: 'bg-[#0088CC] hover:bg-[#0077B5] text-white'
                        }
                      : {
                          iconBox: 'bg-sky-50 text-[#0088CC] border-sky-200/70',
                          cardBorder: isOwned ? 'border-emerald-300' : 'border-slate-200/80',
                          tierText: 'text-[#0088CC]',
                          btn: 'bg-slate-900 hover:bg-slate-800 text-white'
                        };

              return (
                <div
                  key={booster.id}
                  className={`bg-white rounded-3xl p-4 border ${accentStyles.cardBorder} shadow-2xs flex flex-col gap-3 transition-all`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${accentStyles.iconBox}`}
                      >
                        {booster.accent === 'amber' ? (
                          <Crown className="w-6 h-6" />
                        ) : booster.accent === 'emerald' ? (
                          <Flame className="w-6 h-6" />
                        ) : booster.accent === 'indigo' ? (
                          <LockOpen className="w-6 h-6" />
                        ) : (
                          <ShieldCheck className="w-6 h-6" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-extrabold font-mono uppercase tracking-wider ${accentStyles.tierText}`}>
                            {booster.tierLabel}
                          </span>
                          {booster.popular && !isOwned && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                              Most Popular
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-extrabold text-slate-900 truncate mt-0.5">
                          {booster.name}
                        </h3>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-mono tabular-nums font-extrabold text-emerald-600">
                            +{booster.boostPct}% Share
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs font-mono tabular-nums font-extrabold text-[#0088CC]">
                            +{booster.instantGrmf.toLocaleString()} GRMF
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isOwned ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-3 py-2 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBuyBooster(booster)}
                          disabled={isBuying}
                          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-extrabold font-mono tabular-nums flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-2xs ${accentStyles.btn}`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{isBuying ? 'Confirming...' : `${booster.priceTon} TON`}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Perks List */}
                  <div className="bg-slate-50/90 rounded-2xl px-3.5 py-2.5 border border-slate-200/60 flex flex-col gap-1.5">
                    {booster.perks.map((perk, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ELIGIBILITY & QUALIFICATION CHECKLIST */}
      {activeSubTab === 'criteria' && (
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Organic Qualification Checklist
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Complete ecosystem milestones to earn up to +45% free allocation boost
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono tabular-nums font-extrabold text-emerald-600 block">
                  +{organicBoostPct}% / 45%
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Organic Share</span>
              </div>
            </div>

            {/* Readiness Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(8, (organicBoostPct / 45) * 100))}%` }}
              />
            </div>

            <div className="divide-y divide-slate-100">
              {/* Step 1: Wallet */}
              <div className="py-3.5 first:pt-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0088CC] border border-sky-100 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      1. Connect TON Wallet
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      <span className="font-mono tabular-nums font-bold text-emerald-600">+10% Share</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span>Required for Mainnet Jetton claim</span>
                    </span>
                  </div>
                </div>
                {isWalletConnected ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-4 h-4" /> Connected
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onOpenWalletModal?.();
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 bg-[#0088CC] text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* Step 2: Missions & Token Spin */}
              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      2. Complete 3+ Missions & Spins
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      <span className="font-mono tabular-nums font-bold text-emerald-600">+10% Share</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-mono tabular-nums">
                        {completedTasksCount} tasks · {totalSpinsCount} spins
                      </span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveView?.('tasks');
                  }}
                  className="min-h-[38px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Missions</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Step 3: Referrals */}
              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      3. Invite Friends to GRMF Fi
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      <span className="font-mono tabular-nums font-bold text-emerald-600">Up to +25% Share</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-mono tabular-nums">{inviteCount} invited</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveView?.('referrals');
                  }}
                  className="min-h-[38px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Invite</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Step 4: DEX Swap Activity */}
              <div className="py-3.5 last:pb-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      4. Multi-Token DEX Liquidity Swaps
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      <span>Swap GRMF across GRAM, USDT, NOT, DOGS & HMSTR</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveView?.('swap');
                  }}
                  className="min-h-[38px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Swap</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TGE & LISTING ROADMAP */}
      {activeSubTab === 'roadmap' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Mainnet Snapshot & DEX Listing Roadmap
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Official distribution schedule for GRMF Jetton holders
              </p>
            </div>
          </div>

          <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {[
              {
                phase: 'PHASE 1 · ACTIVE NOW',
                title: 'Ecosystem Points, Swaps & Token Spin',
                desc: 'Accumulate GRMF, spin for ecosystem tokens, complete daily check-ins, and activate TON multiplier nodes.',
                status: 'active'
              },
              {
                phase: 'PHASE 2 · SNAPSHOT WINDOW',
                title: 'Anti-Sybil Verification & Multiplier Lock',
                desc: 'Final balance snapshot is recorded on-chain. All active Paid Boosters (+25% to +300%) are permanently applied.',
                status: 'upcoming'
              },
              {
                phase: 'PHASE 3 · PRIORITY TGE CLAIM',
                title: 'On-Chain TON Jetton Distribution',
                desc: 'Booster Node holders unlock 100% of their GRMF allocation at TGE with zero vesting delay.',
                status: 'upcoming'
              },
              {
                phase: 'PHASE 4 · PUBLIC LIQUIDITY',
                title: 'Ston.fi & DeDust Mainnet DEX Listing',
                desc: 'Official GRMF/TON and GRMF/USDT liquidity pools go live for instant decentralized trading.',
                status: 'upcoming'
              }
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <span
                  className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                    item.status === 'active'
                      ? 'bg-emerald-500 border-emerald-200 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]'
                      : 'bg-white border-slate-300'
                  }`}
                />
                <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/60">
                  <span
                    className={`text-[10px] font-extrabold font-mono uppercase tracking-wider block ${
                      item.status === 'active' ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {item.phase}
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-900 mt-0.5">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot & Claim Notice Footer */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-amber-50 rounded-2xl text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-extrabold text-slate-900 block truncate">
              Pre-Listing Token Presale Live
            </span>
            <span className="text-[11px] text-slate-500 block truncate">
              Acquire extra GRMF before the Mainnet TGE snapshot locks.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveView?.('presale');
          }}
          className="min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all"
        >
          <span>Presale</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Booster Purchase Success Modal */}
      <AnimatePresence>
        {successBoostModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 12 }}
              className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl border border-slate-100"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <PartyPopper className="w-7 h-7" />
              </div>

              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                Multiplier Node Activated!
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                <strong>{successBoostModal.name}</strong> is now permanently active on your Airdrop profile.
              </p>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 mb-5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Allocation Boost</span>
                  <span className="font-mono tabular-nums font-extrabold text-emerald-600">
                    +{successBoostModal.boostPct}% Share
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Instant Bonus</span>
                  <span className="font-mono tabular-nums font-extrabold text-[#0088CC]">
                    +{successBoostModal.instantGrmf.toLocaleString()} GRMF
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">TGE Vesting Lock</span>
                  <span className="font-mono tabular-nums font-extrabold text-slate-900">
                    100% Unlocked
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSuccessBoostModal(null)}
                className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Awesome
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
