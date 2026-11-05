import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { serverTimestamp } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { grantReward } from '../lib/rewardsEngine';
import { triggerHaptic } from '../lib/telegram';

interface AirdropViewProps {
  userProfile?: any;
  wallet?: any;
  onOpenWalletModal?: () => void;
  setActiveView?: (view: any) => void;
}

interface AirdropBooster {
  id: string;
  name: string;
  subtitle: string;
  priceTon: number;
  boostPct: number; // e.g. 25 means +25% (+0.25x)
  instantGrmf: number;
  xpBonus: number;
  badgeText: string;
  perks: string[];
  accent: 'sky' | 'indigo' | 'amber' | 'emerald';
}

const TREASURY_ADDRESS = 'UQAJcp9v_CqgdqHmAjs8sZRs0UPkQgZBuWct2AfMBJfgP6QS';

const AIRDROP_BOOSTERS: AirdropBooster[] = [
  {
    id: 'verify_pass',
    name: 'On-Chain Verification Pass',
    subtitle: 'Anti-Sybil Badge & +25% Distribution Share',
    priceTon: 0.5,
    boostPct: 25,
    instantGrmf: 1500,
    xpBonus: 100,
    badgeText: '+25% Allocation',
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
    subtitle: '+75% Distribution Share & 100% TGE Unlock',
    priceTon: 1.5,
    boostPct: 75,
    instantGrmf: 5000,
    xpBonus: 300,
    badgeText: '+75% Allocation',
    perks: [
      'Removes vesting lock (100% unlocked at TGE)',
      '+75% multiplier on total GRMF balance',
      '+5,000 GRMF credited immediately'
    ],
    accent: 'indigo'
  },
  {
    id: 'whale_3x',
    name: 'Whale Pool Priority Pass',
    subtitle: '+150% Distribution Share & Priority Claim',
    priceTon: 3.0,
    boostPct: 150,
    instantGrmf: 12000,
    xpBonus: 750,
    badgeText: '+150% Allocation',
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
    subtitle: '+300% Max Distribution Share & Early DEX Claim',
    priceTon: 5.0,
    boostPct: 300,
    instantGrmf: 25000,
    xpBonus: 1500,
    badgeText: '+300% Allocation',
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
  const [activeSubTab, setActiveSubTab] = useState<'boosters' | 'criteria'>('boosters');
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

  const totalBoostPct = organicBoostPct + paidBoostPct;
  const totalMultiplier = 1 + totalBoostPct / 100;
  const baseEligibleTokens = realGrmf + presaleGrmf;
  const bonusAllocationTokens = Math.round(baseEligibleTokens * (totalBoostPct / 100));
  const finalEstimatedAllocation = baseEligibleTokens + bonusAllocationTokens;

  const hasAnyPaidBooster = paidBoostPct > 0;
  const tgeUnlockPct = hasAnyPaidBooster ? 100 : isWalletConnected ? 60 : 40;

  // Determine User Tier
  const allocationTier =
    totalBoostPct >= 250 || finalEstimatedAllocation >= 50000
      ? { name: 'Genesis Whale', color: 'text-amber-400' }
      : totalBoostPct >= 100 || finalEstimatedAllocation >= 20000
        ? { name: 'Diamond Tier', color: 'text-sky-400' }
        : totalBoostPct >= 30 || finalEstimatedAllocation >= 8000
          ? { name: 'Gold Tier', color: 'text-emerald-400' }
          : { name: 'Standard Tier', color: 'text-slate-300' };

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

      {/* Mainnet Allocation & Multiplier Hero Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
              <Rocket className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">
                Mainnet TGE Allocation
              </span>
              <span className={`text-xs font-extrabold ${allocationTier.color}`}>
                {allocationTier.name} · {tgeUnlockPct}% TGE Unlock
              </span>
            </div>
          </div>

          <div className="text-right bg-white/10 border border-white/10 rounded-2xl px-3 py-1.5">
            <span className="text-[10px] text-slate-400 font-semibold block">Multiplier</span>
            <span className="text-sm font-extrabold font-mono tabular-nums text-amber-400">
              {totalMultiplier.toFixed(2)}x (+{totalBoostPct}%)
            </span>
          </div>
        </div>

        {/* Estimated Final Allocation Readout */}
        <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/70 mb-3.5">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400">
              Estimated Final Airdrop
            </span>
            <span className="text-[11px] font-mono tabular-nums text-emerald-400 font-bold">
              +{bonusAllocationTokens.toLocaleString()} Bonus GRMF
            </span>
          </div>

          <div className="flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {finalEstimatedAllocation.toLocaleString()}
            </span>
            <span className="text-xs font-extrabold text-sky-400">GRMF</span>
          </div>

          {/* Allocation Share Progress Bar */}
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mt-3 flex">
            <div
              className="h-full bg-sky-500 transition-all duration-500"
              style={{ width: `${Math.min(70, Math.max(25, (baseEligibleTokens / Math.max(1, finalEstimatedAllocation)) * 100))}%` }}
            />
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${Math.min(75, (bonusAllocationTokens / Math.max(1, finalEstimatedAllocation)) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mt-2 font-mono tabular-nums">
            <span>Base: {baseEligibleTokens.toLocaleString()} GRMF</span>
            <span>Boost Share: +{totalBoostPct}%</span>
          </div>
        </div>

        {/* 3-Column Snapshot Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl py-2.5 px-2">
            <span className="text-[10px] text-slate-400 font-semibold block">Organic Boost</span>
            <span className="text-xs font-extrabold font-mono tabular-nums text-white mt-0.5 block">
              +{organicBoostPct}%
            </span>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl py-2.5 px-2">
            <span className="text-[10px] text-slate-400 font-semibold block">Paid Boost</span>
            <span className="text-xs font-extrabold font-mono tabular-nums text-amber-400 mt-0.5 block">
              +{paidBoostPct}%
            </span>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl py-2.5 px-2">
            <span className="text-[10px] text-slate-400 font-semibold block">TGE Vesting</span>
            <span className="text-xs font-extrabold font-mono tabular-nums text-emerald-400 mt-0.5 block">
              {hasAnyPaidBooster ? '0% Lock' : `${tgeUnlockPct}% TGE`}
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Switcher: Paid Boosters vs Qualification Tasks */}
      <div className="flex bg-slate-200/70 p-1 rounded-2xl">
        <button
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
          <span>Distribution Boosters</span>
        </button>
        <button
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
          <span>Eligibility Checklist</span>
        </button>
      </div>

      {activeSubTab === 'boosters' ? (
        <div className="flex flex-col gap-3">
          {/* Paid Boosters Section Header */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Paid Allocation Multipliers
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Stack TON boosters to permanently increase your TGE airdrop share & unlock 100% at listing
                </p>
              </div>
            </div>
          </div>

          {/* Booster Cards List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {AIRDROP_BOOSTERS.map((booster) => {
              const entry = purchasedBoosters[booster.id];
              const isOwned = entry === true || (typeof entry === 'object' && entry?.active);
              const isBuying = purchasingId === booster.id;

              const iconBoxStyle =
                booster.accent === 'amber'
                  ? 'bg-amber-50 text-amber-600'
                  : booster.accent === 'emerald'
                    ? 'bg-emerald-50 text-emerald-600'
                    : booster.accent === 'indigo'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-sky-50 text-[#0088CC]';

              return (
                <div key={booster.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconBoxStyle}`}>
                        {booster.accent === 'amber' ? (
                          <Crown className="w-5 h-5" />
                        ) : booster.accent === 'emerald' ? (
                          <Flame className="w-5 h-5" />
                        ) : booster.accent === 'indigo' ? (
                          <LockOpen className="w-5 h-5" />
                        ) : (
                          <ShieldCheck className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-extrabold text-slate-900">
                            {booster.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          <span className="font-mono tabular-nums font-bold text-emerald-600">
                            +{booster.boostPct}% Share
                          </span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span className="font-mono tabular-nums font-bold text-[#0088CC]">
                            +{booster.instantGrmf.toLocaleString()} GRMF
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isOwned ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold px-2.5 py-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBuyBooster(booster)}
                          disabled={isBuying}
                          className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold font-mono tabular-nums flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isBuying ? 'Confirming...' : `${booster.priceTon} TON`}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Perks List */}
                  <div className="bg-slate-50 rounded-2xl px-3.5 py-2.5 border border-slate-200/60 flex flex-col gap-1">
                    {booster.perks.map((perk, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                        <Sparkles className="w-3 h-3 text-[#0088CC] shrink-0" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Qualification Criteria Checklist */
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Free Qualification Boosts
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Complete on-chain & ecosystem tasks to earn up to +45% organic boost
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums font-extrabold text-emerald-600">
              +{organicBoostPct}% Active
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="py-3.5 first:pt-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0088CC] flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block">
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

            <div className="py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block">
                    2. Complete 3+ Daily DEX Missions
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    <span className="font-mono tabular-nums font-bold text-emerald-600">+10% Share</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="font-mono tabular-nums">{completedTasksCount} completed</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveView?.('tasks');
                }}
                className="min-h-[38px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Missions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="py-3.5 last:pb-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Rocket className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block">
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
                onClick={() => {
                  triggerHaptic('light');
                  setActiveView?.('referrals');
                }}
                className="min-h-[38px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Invite</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot & Claim Notice */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
        <div className="w-10 h-10 bg-amber-50 rounded-2xl text-amber-600 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <span className="text-xs font-bold text-slate-900 block">
            Snapshot & Ston.fi Listing Schedule
          </span>
          <span className="text-[11px] text-slate-500">
            Boosted allocations & 0% vesting passes are locked on-chain automatically when the Presale concludes.
          </span>
        </div>
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
                Booster Activated!
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
