import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Zap,
  Clock,
  CheckCircle2,
  Coins,
  ShieldCheck,
  ArrowLeft,
  Trophy
} from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { TOKENS } from '../data/tokens';
import { triggerHaptic } from '../lib/telegram';

export interface SpinPrize {
  symbol: string;
  name: string;
  logo: string;
  amount: number;
  weight: number;
  xp: number;
  accentColor: string;
  badgeBg: string;
}

export const SPIN_PRIZES: SpinPrize[] = [
  {
    symbol: 'GRMF',
    name: TOKENS.find((t) => t.symbol === 'GRMF')?.name || 'GRMF Token',
    logo: TOKENS.find((t) => t.symbol === 'GRMF')?.iconUrl || 'https://i.suar.me/vAdG5/l',
    amount: 250,
    weight: 32,
    xp: 40,
    accentColor: 'text-[#0088CC]',
    badgeBg: 'bg-sky-50 border-sky-200/80'
  },
  {
    symbol: 'GRAM',
    name: TOKENS.find((t) => t.symbol === 'GRAM')?.name || 'Gram',
    logo: TOKENS.find((t) => t.symbol === 'GRAM')?.iconUrl || 'https://i.suar.me/zXrj0/l',
    amount: 1.5,
    weight: 9,
    xp: 60,
    accentColor: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 border-indigo-200/80'
  },
  {
    symbol: 'USDT',
    name: TOKENS.find((t) => t.symbol === 'USDT')?.name || 'Tether USD',
    logo: TOKENS.find((t) => t.symbol === 'USDT')?.iconUrl || 'https://i.suar.me/5PgrM/l',
    amount: 1,
    weight: 5,
    xp: 75,
    accentColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 border-emerald-200/80'
  },
  {
    symbol: 'NOT',
    name: TOKENS.find((t) => t.symbol === 'NOT')?.name || 'Notcoin',
    logo: TOKENS.find((t) => t.symbol === 'NOT')?.iconUrl || 'https://i.suar.me/ZzX70/l',
    amount: 40,
    weight: 14,
    xp: 45,
    accentColor: 'text-amber-600',
    badgeBg: 'bg-amber-50 border-amber-200/80'
  },
  {
    symbol: 'DOGS',
    name: TOKENS.find((t) => t.symbol === 'DOGS')?.name || 'Dogs',
    logo: TOKENS.find((t) => t.symbol === 'DOGS')?.iconUrl || 'https://i.suar.me/0poZZ/l',
    amount: 400,
    weight: 22,
    xp: 35,
    accentColor: 'text-slate-800',
    badgeBg: 'bg-slate-100 border-slate-200/90'
  },
  {
    symbol: 'HMSTR',
    name: TOKENS.find((t) => t.symbol === 'HMSTR')?.name || 'Hamster Kombat',
    logo: TOKENS.find((t) => t.symbol === 'HMSTR')?.iconUrl || 'https://i.suar.me/4z5Oo/l',
    amount: 120,
    weight: 18,
    xp: 40,
    accentColor: 'text-orange-600',
    badgeBg: 'bg-orange-50 border-orange-200/80'
  }
];

const CARD_WIDTH = 96;
const CARD_GAP = 10;
const CARD_STEP = CARD_WIDTH + CARD_GAP; // 106px per slot
const TOTAL_REEL_SLOTS = 46;
const START_CENTER_INDEX = 2;
const WINNING_SLOT_INDEX = 38; // Travels 36 cards right-to-left across the screen

function pickWeightedPrize(): SpinPrize {
  const totalWeight = SPIN_PRIZES.reduce((acc, p) => acc + p.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const prize of SPIN_PRIZES) {
    if (rand < prize.weight) {
      return prize;
    }
    rand -= prize.weight;
  }
  return SPIN_PRIZES[0];
}

function buildReelSequence(winningPrize?: SpinPrize): SpinPrize[] {
  const sequence: SpinPrize[] = [];
  for (let i = 0; i < TOTAL_REEL_SLOTS; i++) {
    const basePrize = SPIN_PRIZES[(i + Math.floor(i / SPIN_PRIZES.length)) % SPIN_PRIZES.length];
    sequence.push(basePrize);
  }
  if (winningPrize) {
    sequence[WINNING_SLOT_INDEX] = winningPrize;
    const prevIdx = (SPIN_PRIZES.findIndex((p) => p.symbol === winningPrize.symbol) + 1) % SPIN_PRIZES.length;
    const nextIdx = (SPIN_PRIZES.findIndex((p) => p.symbol === winningPrize.symbol) + 2) % SPIN_PRIZES.length;
    sequence[WINNING_SLOT_INDEX - 1] = SPIN_PRIZES[prevIdx];
    sequence[WINNING_SLOT_INDEX + 1] = SPIN_PRIZES[nextIdx];
  }
  return sequence;
}

interface TokenSpinReelProps {
  spinCooldown: {
    isCooldown: boolean;
    remainingMs: number;
    progressPct: number;
    formatted: string;
  };
  totalSpinsCount: number;
  treasuryAddress: string;
  userBalances?: Record<string, number>;
  onBack: () => void;
  onSpinComplete: (prize: SpinPrize, mode: 'free_24h' | 'paid_ton') => Promise<void>;
}

export const TokenSpinReel: React.FC<TokenSpinReelProps> = ({
  spinCooldown,
  totalSpinsCount,
  treasuryAddress,
  userBalances = {},
  onBack,
  onSpinComplete
}) => {
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(320);

  const [reelItems, setReelItems] = useState<SpinPrize[]>(() => buildReelSequence());
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isConfirmingTon, setIsConfirmingTon] = useState<boolean>(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(START_CENTER_INDEX);
  const [useSmoothTransition, setUseSmoothTransition] = useState<boolean>(false);
  const [translateX, setTranslateX] = useState<number>(0);
  const [lastWonPrize, setLastWonPrize] = useState<SpinPrize | null>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (viewportRef.current) {
        const w = viewportRef.current.clientWidth;
        if (w > 0) setViewportWidth(w);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getCenterTranslateX = (slotIndex: number, width = viewportWidth) => {
    const cardCenter = slotIndex * CARD_STEP + CARD_WIDTH / 2;
    const viewportCenter = width / 2;
    return -(cardCenter - viewportCenter);
  };

  useEffect(() => {
    if (!isSpinning) {
      setUseSmoothTransition(false);
      setTranslateX(getCenterTranslateX(activeSlotIndex, viewportWidth));
    }
  }, [viewportWidth]);

  const runReelAnimation = (prize: SpinPrize, mode: 'free_24h' | 'paid_ton') => {
    const width = viewportRef.current?.clientWidth || viewportWidth;
    const nextSequence = buildReelSequence(prize);

    nextSequence[START_CENTER_INDEX] = reelItems[activeSlotIndex] || SPIN_PRIZES[0];

    // 1. Snap instantaneously to START_CENTER_INDEX on the left so tokens stream from RIGHT to LEFT
    setUseSmoothTransition(false);
    setReelItems(nextSequence);
    setActiveSlotIndex(START_CENTER_INDEX);
    setTranslateX(getCenterTranslateX(START_CENTER_INDEX, width));
    setIsSpinning(true);
    setLastWonPrize(null);

    const tickDelays = [120, 260, 420, 600, 800, 1020, 1270, 1550, 1870, 2240, 2670, 3160, 3720];
    const timers: number[] = [];
    tickDelays.forEach((ms) => {
      const id = window.setTimeout(() => {
        triggerHaptic('light');
      }, ms);
      timers.push(id);
    });

    // 2. Next frame: engage smooth cubic-bezier transition toward WINNING_SLOT_INDEX (moves right -> left)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setUseSmoothTransition(true);
        setActiveSlotIndex(WINNING_SLOT_INDEX);
        setTranslateX(getCenterTranslateX(WINNING_SLOT_INDEX, width));
      });
    });

    // 3. Complete spin after transition finishes
    window.setTimeout(async () => {
      timers.forEach((id) => clearTimeout(id));
      triggerHaptic('success');
      setLastWonPrize(prize);
      try {
        await onSpinComplete(prize, mode);
      } finally {
        setIsSpinning(false);
      }
    }, 4350);
  };

  // Handler 1: Free Spin (1 every 24 hours)
  const handleFreeSpin = () => {
    if (isSpinning || isConfirmingTon || spinCooldown.isCooldown) return;
    triggerHaptic('medium');
    const prize = pickWeightedPrize();
    runReelAnimation(prize, 'free_24h');
  };

  // Handler 2: Paid Spin (0.1 TON per spin, available anytime)
  const handlePaidTonSpin = async () => {
    if (isSpinning || isConfirmingTon) return;
    triggerHaptic('medium');

    if (!tonWallet) {
      tonConnectUI.openModal();
      return;
    }

    setIsConfirmingTon(true);
    try {
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: treasuryAddress,
            amount: toNano('0.1').toString()
          }
        ]
      };

      await tonConnectUI.sendTransaction(transaction);
      setIsConfirmingTon(false);

      const prize = pickWeightedPrize();
      runReelAnimation(prize, 'paid_ton');
    } catch (err) {
      console.warn('0.1 TON Spin transaction cancelled or failed:', err);
      triggerHaptic('error');
      setIsConfirmingTon(false);
    }
  };

  const formattedAmount = (amt: number) =>
    amt >= 100 ? amt.toLocaleString() : amt.toString();

  const tokenPoolSummary = useMemo(() => SPIN_PRIZES, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col gap-4 pb-8"
    >
      {/* Dedicated Spin Page Navigation Header */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (isSpinning) return;
            triggerHaptic('light');
            onBack();
          }}
          disabled={isSpinning}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-extrabold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Missions</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-400 block">Total Spins</span>
            <span className="text-xs font-extrabold font-mono tabular-nums text-slate-900">
              {totalSpinsCount} Spins
            </span>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-sky-50 text-[#0088CC] flex items-center justify-center border border-sky-100">
            <Trophy className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Right-to-Left Sliding Reel Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0088CC] flex items-center justify-center shrink-0 border border-sky-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight truncate">
                  Ecosystem Token Spin
                </h1>
                <span className="text-[10px] font-extrabold font-mono uppercase px-1.5 py-0.5 rounded-md bg-sky-50 text-[#0088CC] border border-sky-200/60">
                  6 Tokens
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                1 Free spin every 24h · Extra spins 0.1 TON anytime
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal Sliding Reel Viewport (Tokens stream from RIGHT -> LEFT) */}
        <div
          ref={viewportRef}
          dir="ltr"
          className="relative w-full h-[138px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden select-none shadow-inner flex items-center"
        >
          {/* Subtle ambient glow behind center selector */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-28 bg-sky-500/15 blur-xl pointer-events-none z-0" />

          {/* Left & Right Edge Vignette Gradients so tokens emerge from right and exit left */}
          <div className="absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-slate-950 via-slate-900/80 to-transparent z-20 pointer-events-none" />

          {/* Center Top & Bottom Pointer Needles + Highlight Frame */}
          <div className="absolute inset-y-1.5 left-1/2 -translate-x-1/2 w-[100px] rounded-2xl border-2 border-[#0088CC] bg-sky-400/5 z-20 pointer-events-none shadow-[0_0_20px_rgba(0,136,204,0.35)]">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#0088CC] rounded-[2px]" />
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#0088CC] rounded-[2px]" />
          </div>

          {/* Sliding Track (Right to Left movement via negative translateX) */}
          <div
            className="flex items-center will-change-transform z-10"
            style={{
              gap: `${CARD_GAP}px`,
              transform: `translate3d(${translateX}px, 0, 0)`,
              transition: useSmoothTransition
                ? 'transform 4.25s cubic-bezier(0.10, 0.85, 0.14, 1)'
                : 'none'
            }}
          >
            {reelItems.map((item, idx) => {
              const isWinnerLanded = !isSpinning && idx === activeSlotIndex;
              return (
                <div
                  key={`${item.symbol}_${idx}`}
                  style={{ width: `${CARD_WIDTH}px` }}
                  className={`h-[112px] shrink-0 rounded-xl p-2.5 flex flex-col items-center justify-between transition-transform duration-300 ${
                    isWinnerLanded
                      ? 'bg-slate-800/95 border border-sky-400/60 scale-[1.03]'
                      : 'bg-slate-800/75 border border-slate-700/70'
                  }`}
                >
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">
                    {item.symbol}
                  </span>

                  <div className="relative w-11 h-11 rounded-full bg-slate-900/90 p-1 border border-slate-700 flex items-center justify-center">
                    <img
                      src={item.logo}
                      alt={item.symbol}
                      className="w-full h-full rounded-full object-cover"
                      loading="eager"
                    />
                  </div>

                  <div className="text-center leading-none">
                    <span className="text-xs font-extrabold font-mono tabular-nums text-white block">
                      +{formattedAmount(item.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cooldown Progress & Status Bar */}
        <div className="flex items-center justify-between mt-3 mb-4 px-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            {spinCooldown.isCooldown ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  Free spin renews in{' '}
                  <strong className="font-mono tabular-nums text-slate-800">
                    {spinCooldown.formatted}
                  </strong>
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-emerald-700 font-bold">
                  Daily Free Spin is ready to claim!
                </span>
              </>
            )}
          </div>

          {lastWonPrize && !isSpinning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-emerald-600 font-extrabold font-mono text-xs"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>
                +{formattedAmount(lastWonPrize.amount)} {lastWonPrize.symbol}
              </span>
            </motion.div>
          )}
        </div>

        {/* Dual Action Controls: 1 Free Spin / 24h + Unlimited 0.1 TON Paid Spins */}
        <div className="grid grid-cols-2 gap-3">
          {/* Button 1: Free Spin (1 every 24h) */}
          <button
            type="button"
            onClick={handleFreeSpin}
            disabled={isSpinning || isConfirmingTon || spinCooldown.isCooldown}
            className={`min-h-[48px] px-3 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 ${
              spinCooldown.isCooldown
                ? 'bg-slate-100 text-slate-500 border border-slate-200/80 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-60'
            }`}
          >
            {spinCooldown.isCooldown ? (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono tabular-nums">{spinCooldown.formatted}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{isSpinning ? 'Spinning...' : 'Free Spin (24h)'}</span>
              </>
            )}
          </button>

          {/* Button 2: Paid Spin (0.1 TON per Spin - Always Available) */}
          <button
            type="button"
            onClick={handlePaidTonSpin}
            disabled={isSpinning || isConfirmingTon}
            className="min-h-[48px] px-3 py-3 rounded-2xl bg-[#0088CC] hover:bg-[#0077B5] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs disabled:opacity-60 font-mono tabular-nums"
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>
              {isConfirmingTon
                ? 'Confirming...'
                : isSpinning
                  ? 'Spinning...'
                  : 'Spin · 0.1 TON'}
            </span>
          </button>
        </div>

        {/* On-chain verification footer note */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0088CC]" />
            Instant reward credit to Global Assets
          </span>
          <span className="font-mono">0.1 TON / Extra Spin</span>
        </div>
      </div>

      {/* All 6 Ecosystem Tokens Prize Pool & User Balance Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Available Spin Rewards (All 6 Tokens)
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Every spin lands on one of the official ecosystem tokens below
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {tokenPoolSummary.map((token) => {
            const currentBal = Number(userBalances[token.symbol] || 0);
            return (
              <div
                key={token.symbol}
                className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/70 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={token.logo}
                    alt={token.symbol}
                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 block truncate">
                      {token.symbol}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block truncate">
                      {token.name}
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-xs font-extrabold font-mono tabular-nums text-emerald-600">
                    +{formattedAmount(token.amount)} {token.symbol}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-slate-400">
                    Bal: {currentBal >= 100 ? Math.floor(currentBal).toLocaleString() : currentBal.toFixed(currentBal > 0 && currentBal < 1 ? 2 : 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
