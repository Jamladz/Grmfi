import React, { useState } from 'react';
import { Token, WalletState } from '../types';
import { ArrowDown, ArrowUpDown, ChevronDown, RefreshCw, Info, Zap, ShieldCheck, Sparkles, Layers, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

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

  // Calculate rate
  const rate = fromToken.priceUsd / toToken.priceUsd;
  const invertedRate = toToken.priceUsd / fromToken.priceUsd;

  // From USD value
  const numFrom = parseFloat(fromAmount) || 0;
  const fromUsdValue = numFrom * fromToken.priceUsd;
  const numTo = parseFloat(toAmount) || 0;
  const toUsdValue = numTo * toToken.priceUsd;

  const userBalance = wallet.balances[fromToken.symbol] || 0;

  const handleMaxClick = () => {
    if (userBalance > 0) {
      setFromAmount(userBalance.toString());
    } else {
      setFromAmount('100');
    }
  };

  const handlePercentClick = (percent: number) => {
    const base = userBalance > 0 ? userBalance : 1000;
    const calculated = (base * (percent / 100)).toFixed(4);
    setFromAmount(calculated);
  };

  const handleFlip = () => {
    setIsRotating(true);
    onFlipTokens();
    setTimeout(() => setIsRotating(false), 300);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-xl text-slate-900 relative overflow-hidden">
      {/* Soft ambient background */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#24A1DE] fill-[#24A1DE]/20" />
            Swap Tokens
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-[8px] font-black text-amber-600 uppercase tracking-widest">
            Beta
          </span>
        </div>

        <button
          onClick={onOpenSettings}
          className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-200 text-slate-500 hover:text-[#24A1DE] transition-all flex items-center gap-1"
        >
          <span>{slippage}%</span>
          <span className="text-[9px] text-slate-400">Slip</span>
        </button>
      </div>

      {/* Airdrop Event Notice */}
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/30 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center border border-blue-100/50">
           <Trophy className="w-4 h-4 text-[#24A1DE]" />
        </div>
        <div className="flex-1">
           <p className="text-[10px] text-slate-600 font-bold leading-tight">
              Official <span className="text-[#24A1DE]">Airdrop Distribution</span> before launch. 
           </p>
           <p className="text-[8px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">Swap to qualify • Beta exclusive</p>
        </div>
      </div>

      {/* YOU PAY SECTION */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 focus-within:border-[#24A1DE]/60 transition-all space-y-1 sm:space-y-2">
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <span>You Pay</span>
            <span className="text-[7px] font-black bg-amber-100 text-amber-600 px-1 rounded uppercase tracking-tighter">Testnet Swap</span>
          </div>
          <div className="flex items-center gap-2">
            <span>
              Test Bal: <strong className="text-slate-900">{userBalance.toLocaleString()}</strong>
            </span>
            <button
              onClick={handleMaxClick}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-[#24A1DE] border border-blue-500/20 hover:bg-blue-500/20 transition-all"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <input
            type="number"
            placeholder="0.0"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            className="w-full bg-transparent text-xl sm:text-2xl font-black text-slate-900 placeholder-slate-300 focus:outline-none tracking-tight"
          />

          <button
            onClick={onOpenFromTokenSelect}
            className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl bg-white border border-slate-100 hover:border-[#24A1DE] text-slate-900 font-bold transition-all shrink-0 shadow-sm"
          >
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg sm:rounded-xl ${fromToken.iconBg} flex items-center justify-center text-[8px] sm:text-[10px] text-white font-extrabold overflow-hidden`}>
              {fromToken.iconUrl ? (
                <img src={fromToken.iconUrl} alt={fromToken.symbol} className="w-full h-full object-cover" />
              ) : (
                fromToken.symbol.slice(0, 3)
              )}
            </div>
            <span className="text-xs sm:text-sm">{fromToken.symbol}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>≈ ${fromUsdValue.toFixed(2)}</span>
          <div className="flex items-center gap-1">
            {[25, 50, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentClick(pct)}
                className="text-[9px] px-1 py-0.5 rounded bg-white border border-slate-100 hover:bg-slate-50 text-slate-500 transition-colors shadow-sm"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SWAP DIRECTION FLIP BUTTON */}
      <div className="relative my-[-8px] sm:my-[-10px] z-10 flex justify-center">
        <button
          onClick={handleFlip}
          className={`p-2 rounded-xl sm:p-2.5 sm:rounded-2xl bg-white border-2 border-slate-50 text-[#24A1DE] shadow-lg hover:bg-blue-500 hover:text-white transition-all ${
            isRotating ? 'rotate-180 scale-110' : ''
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* YOU RECEIVE SECTION */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 space-y-1 sm:space-y-2">
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <span>You Receive</span>
            <span className="text-[7px] font-black bg-amber-100 text-amber-600 px-1 rounded uppercase tracking-tighter">Testnet Swap</span>
          </div>
          <span>
            Test Bal: <strong className="text-slate-900">{(wallet.balances[toToken.symbol] || 0).toLocaleString()}</strong>
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <input
            type="text"
            readOnly
            placeholder="0.0"
            value={toAmount}
            className="w-full bg-transparent text-xl sm:text-2xl font-black text-blue-600 placeholder-slate-300 focus:outline-none tracking-tight cursor-default"
          />

          <button
            onClick={onOpenToTokenSelect}
            className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl bg-white border border-slate-100 hover:border-[#24A1DE] text-slate-900 font-bold transition-all shrink-0 shadow-sm"
          >
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg sm:rounded-xl ${toToken.iconBg} flex items-center justify-center text-[8px] sm:text-[10px] text-white font-extrabold overflow-hidden`}>
              {toToken.iconUrl ? (
                <img src={toToken.iconUrl} alt={toToken.symbol} className="w-full h-full object-cover" />
              ) : (
                toToken.symbol.slice(0, 3)
              )}
            </div>
            <span className="text-xs sm:text-sm">{toToken.symbol}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>≈ ${toUsdValue.toFixed(2)}</span>
          <span className="text-emerald-500 font-medium text-[9px] sm:text-[10px]">
            Best Rate
          </span>
        </div>
      </div>

      {/* LIVE RATE BAR */}
      <div className="my-2 px-2 py-1.5 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[10px] sm:text-xs text-slate-600">
        <span className="text-slate-500">Rate:</span>
        <button
          onClick={() => setIsInvertedRate((prev) => !prev)}
          className="flex items-center gap-1 font-mono font-semibold text-[#24A1DE] hover:underline"
        >
          {!isInvertedRate ? (
            <span>1 {fromToken.symbol.slice(0,4)} ≈ {rate < 0.001 ? rate.toFixed(5) : rate.toFixed(3)} {toToken.symbol.slice(0,4)}</span>
          ) : (
            <span>1 {toToken.symbol.slice(0,4)} ≈ {invertedRate < 0.001 ? invertedRate.toFixed(5) : invertedRate.toFixed(3)} {fromToken.symbol.slice(0,4)}</span>
          )}
          <RefreshCw className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
        </button>
      </div>

      {/* EXPANDABLE TRADE ROUTE DETAILS */}
      <div className="mb-2 sm:mb-3">
        <button
          onClick={() => setShowRouteDetails((prev) => !prev)}
          className="w-full flex items-center justify-between text-[10px] text-slate-500 hover:text-slate-700 transition-colors py-0.5 px-0.5"
        >
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#24A1DE]" />
            Fee Details
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showRouteDetails ? 'rotate-180' : ''}`} />
        </button>

        {showRouteDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] space-y-1.5 text-slate-500 shadow-inner"
          >
            <div className="flex justify-between">
              <span>Route:</span>
              <span className="font-semibold text-slate-900">{fromToken.symbol} ➔ {toToken.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>Impact:</span>
              <span className="font-semibold text-emerald-600">&lt; 0.01%</span>
            </div>
            <div className="flex justify-between">
              <span>Gas Fee:</span>
              <span className="font-semibold text-blue-600">~0.008 GRAM</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* SWAP ACTION BUTTON */}
      {!wallet.isConnected ? (
        <button
          onClick={onOpenConnectModal}
          className="w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-[#24A1DE] text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 fill-white/20" />
          <span>Connect Wallet</span>
        </button>
      ) : numFrom <= 0 ? (
        <button
          disabled
          className="w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs sm:text-sm cursor-not-allowed"
        >
          Enter Amount
        </button>
      ) : (
        <button
          onClick={onSwap}
          className="w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-[#24A1DE] text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 hover:bg-[#2094cc]"
        >
          <Zap className="w-4 h-4 fill-white/20" />
          <span>Swap Now</span>
        </button>
      )}

      {/* Trust Footer Badge */}
      <div className="mt-2 text-center text-[9px] text-slate-400 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3 h-3 text-emerald-500" />
        <span>Secured Transaction</span>
      </div>
    </div>
  );
};
