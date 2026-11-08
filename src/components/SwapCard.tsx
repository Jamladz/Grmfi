import React, { useState } from 'react';
import { Token, WalletState } from '../types';
import { ArrowUpDown, ChevronDown, RefreshCw, Zap, ShieldCheck, Layers, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SwapCardProps {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  setFromAmount: (val: string) => void;
  toAmount: string;
  onFlipTokens: () => void;
  onOpenFromTokenSelect: () => void;
  onOpenToTokenSelect: () => void;
  onOpenSettings: () => void;
  onSwap: () => void;
  wallet: WalletState;
  onOpenConnectModal: () => void;
  slippage: number;
}

export const SwapCard: React.FC<SwapCardProps> = ({
  fromToken,
  toToken,
  fromAmount,
  setFromAmount,
  toAmount,
  onFlipTokens,
  onOpenFromTokenSelect,
  onOpenToTokenSelect,
  onOpenSettings,
  onSwap,
  wallet,
  onOpenConnectModal,
  slippage,
}) => {
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [isInvertedRate, setIsInvertedRate] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const rate = fromToken.priceUsd / toToken.priceUsd;
  const invertedRate = toToken.priceUsd / fromToken.priceUsd;

  const numFrom = parseFloat(fromAmount) || 0;
  const fromUsdValue = numFrom * fromToken.priceUsd;
  const numTo = parseFloat(toAmount) || 0;
  const toUsdValue = numTo * toToken.priceUsd;

  const userBalance = wallet.balances[fromToken.symbol] || 0;

  const handlePercentClick = (percent: number) => {
    if (percent === 100) {
      setFromAmount(userBalance.toString());
    } else {
      const calculated = Number((userBalance * (percent / 100)).toFixed(4));
      setFromAmount(calculated > 0 ? calculated.toString() : '0');
    }
  };

  const handleFlip = () => {
    setIsRotating(true);
    onFlipTokens();
    setTimeout(() => setIsRotating(false), 250);
  };

  return (
    <div className="w-full max-w-[440px] mx-auto">
      {/* Main Swap Surface */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-[0_12px_36px_-12px_rgba(15,23,42,0.06)] text-slate-900">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              Token Swap
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Instant execution · Zero protocol fee
            </p>
          </div>

          <button
            onClick={onOpenSettings}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono tabular-nums">{slippage}%</span>
          </button>
        </div>

        {/* YOU PAY WELL */}
        <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/60 focus-within:border-[#0088CC] focus-within:bg-white transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-600">You Pay</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">
                Balance: <strong className="font-mono tabular-nums text-slate-800">{userBalance.toLocaleString()}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="w-full bg-transparent text-2xl sm:text-[28px] font-extrabold font-mono tabular-nums text-slate-900 placeholder-slate-300 focus:outline-none tracking-tight"
            />

            <button
              onClick={onOpenFromTokenSelect}
              className="min-h-[44px] flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 text-slate-900 font-bold transition-all shrink-0 shadow-2xs cursor-pointer active:scale-95"
            >
              <div className={`w-6 h-6 rounded-full ${fromToken.iconBg} flex items-center justify-center text-[10px] text-white font-bold overflow-hidden shrink-0`}>
                {fromToken.iconUrl ? (
                  <img src={fromToken.iconUrl} alt={fromToken.symbol} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  fromToken.symbol.slice(0, 3)
                )}
              </div>
              <span className="text-sm font-bold tracking-tight">{fromToken.symbol}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/50 text-xs">
            <span className="font-mono tabular-nums text-slate-400">
              ≈ ${fromUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentClick(pct)}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200/70 text-[10px] font-bold font-mono tabular-nums text-slate-600 hover:text-[#0088CC] transition-colors cursor-pointer"
                >
                  {pct === 100 ? 'MAX' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FLIP DIRECTION BUTTON */}
        <div className="relative h-3 flex items-center justify-center z-10">
          <button
            type="button"
            onClick={handleFlip}
            aria-label="Invert token direction"
            className={`w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-[#0088CC] hover:border-[#0088CC]/40 shadow-sm flex items-center justify-center transition-transform duration-200 cursor-pointer active:scale-90 ${
              isRotating ? 'rotate-180' : ''
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* YOU RECEIVE WELL */}
        <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/60">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-600">You Receive</span>
            <span className="text-[11px] text-slate-500">
              Balance: <strong className="font-mono tabular-nums text-slate-800">{(wallet.balances[toToken.symbol] || 0).toLocaleString()}</strong>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              readOnly
              placeholder="0.00"
              value={toAmount}
              className="w-full bg-transparent text-2xl sm:text-[28px] font-extrabold font-mono tabular-nums text-[#0088CC] placeholder-slate-300 focus:outline-none tracking-tight cursor-default"
            />

            <button
              onClick={onOpenToTokenSelect}
              className="min-h-[44px] flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 text-slate-900 font-bold transition-all shrink-0 shadow-2xs cursor-pointer active:scale-95"
            >
              <div className={`w-6 h-6 rounded-full ${toToken.iconBg} flex items-center justify-center text-[10px] text-white font-bold overflow-hidden shrink-0`}>
                {toToken.iconUrl ? (
                  <img src={toToken.iconUrl} alt={toToken.symbol} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  toToken.symbol.slice(0, 3)
                )}
              </div>
              <span className="text-sm font-bold tracking-tight">{toToken.symbol}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/50 text-xs text-slate-400">
            <span className="font-mono tabular-nums">
              ≈ ${toUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-emerald-600 font-semibold text-[11px]">
              Optimal pool route
            </span>
          </div>
        </div>

        {/* EXCHANGE RATE & ROUTE SUMMARY */}
        <div className="mt-3 px-3.5 py-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/50 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setIsInvertedRate((prev) => !prev)}
            className="flex items-center gap-1.5 font-mono tabular-nums font-semibold text-slate-700 hover:text-[#0088CC] transition-colors cursor-pointer"
          >
            {!isInvertedRate ? (
              <span>1 {fromToken.symbol} = {rate < 0.001 ? rate.toFixed(5) : rate.toFixed(3)} {toToken.symbol}</span>
            ) : (
              <span>1 {toToken.symbol} = {invertedRate < 0.001 ? invertedRate.toFixed(5) : invertedRate.toFixed(3)} {fromToken.symbol}</span>
            )}
            <RefreshCw className="w-3 h-3 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => setShowRouteDetails((prev) => !prev)}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-[#0088CC]" />
            <span>Details</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showRouteDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {showRouteDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Liquidity Route</span>
                  <span className="font-mono font-semibold text-slate-900">{fromToken.symbol} → {toToken.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Price Impact</span>
                  <span className="font-mono tabular-nums font-semibold text-emerald-600">&lt; 0.01%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Slippage</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">{slippage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Network Fee</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-700">~0.008 TON</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PRIMARY CTA */}
        <div className="mt-4">
          {numFrom <= 0 ? (
            <button
              type="button"
              onClick={() => handlePercentClick(25)}
              className="w-full min-h-[48px] py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-bold text-sm transition-colors cursor-pointer"
            >
              Enter an amount to swap
            </button>
          ) : numFrom > userBalance ? (
            <button
              disabled
              className="w-full min-h-[48px] py-3.5 rounded-2xl bg-rose-50 text-rose-500 border border-rose-200/60 font-bold text-sm cursor-not-allowed"
            >
              Insufficient {fromToken.symbol} Balance
            </button>
          ) : (
            <button
              onClick={onSwap}
              className="w-full min-h-[48px] py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-tight shadow-md shadow-slate-900/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Swap {fromToken.symbol} for {toToken.symbol}</span>
            </button>
          )}
        </div>

        {/* Quiet Security Footnote */}
        <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified TON Smart Contract Execution · Qualifies for Airdrop</span>
        </div>
      </div>
    </div>
  );
};
