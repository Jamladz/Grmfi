import React, { useState } from 'react';
import { Token } from '../types';
import { TrendingUp, TrendingDown, RefreshCw, BarChart2, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface PriceChartProps {
  fromToken: Token;
  toToken: Token;
}

export const PriceChart: React.FC<PriceChartProps> = ({ fromToken, toToken }) => {
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '1W' | '1M' | 'ALL'>('24H');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate mock rate between fromToken and toToken
  const currentRate = fromToken.priceUsd / toToken.priceUsd;
  const isPositive = fromToken.change24h >= 0;

  // Generate SVG path points for chart simulation based on timeframe
  const generateChartPoints = () => {
    const base = 50;
    const points: number[] = [];
    const count = 24;
    let current = base;

    for (let i = 0; i < count; i++) {
      const delta = (Math.random() - 0.47) * 8;
      current = Math.max(20, Math.min(80, current + delta));
      points.push(current);
    }
    // End higher or lower based on change
    points[count - 1] = isPositive ? 25 : 75;

    const pathString = points
      .map((val, idx) => {
        const x = (idx / (count - 1)) * 300;
        const y = val;
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    const areaString = `${pathString} L 300 100 L 0 100 Z`;

    return { pathString, areaString };
  };

  const { pathString, areaString } = generateChartPoints();

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="w-full bg-[#0E1322] border border-[#1E293B] rounded-3xl p-5 shadow-2xl text-slate-100 flex flex-col justify-between">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2">
            <div className={`w-8 h-8 rounded-xl ${fromToken.iconBg} flex items-center justify-center font-bold text-[10px] text-white border-2 border-[#0E1322]`}>
              {fromToken.symbol.slice(0, 3)}
            </div>
            <div className={`w-8 h-8 rounded-xl ${toToken.iconBg} flex items-center justify-center font-bold text-[10px] text-white border-2 border-[#0E1322]`}>
              {toToken.symbol.slice(0, 3)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white">
                {fromToken.symbol} / {toToken.symbol}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-medium">
                STON.fi Route
              </span>
            </div>
            <p className="text-xs text-slate-400">
              1 {fromToken.symbol} = {currentRate < 0.001 ? currentRate.toFixed(6) : currentRate.toFixed(4)} {toToken.symbol}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-xl bg-[#141B2D] border border-slate-800 text-slate-400 hover:text-white transition-all ${
              isRefreshing ? 'animate-spin text-cyan-400' : ''
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Price Stats */}
      <div className="my-4 flex items-baseline justify-between">
        <div>
          <div className="text-2xl font-black text-white tracking-tight">
            ${(fromToken.priceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </div>
          <div className={`flex items-center gap-1 text-xs font-bold mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{isPositive ? '+' : ''}{fromToken.change24h}% (24h)</span>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex bg-[#141B2D] p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
          {(['1H', '24H', '1W', '1M', 'ALL'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                timeframe === tf
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas / SVG */}
      <div className="relative w-full h-44 my-2">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? '#00F5D4' : '#F43F5E'} stopOpacity="0.35" />
              <stop offset="100%" stopColor={isPositive ? '#00F5D4' : '#F43F5E'} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="25" x2="300" y2="25" stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="0" y1="50" x2="300" y2="50" stroke="#1E293B" strokeDasharray="3 3" />
          <line x1="0" y1="75" x2="300" y2="75" stroke="#1E293B" strokeDasharray="3 3" />

          {/* Fill Area */}
          <path d={areaString} fill="url(#chartGradient)" />

          {/* Line Path */}
          <path
            d={pathString}
            fill="none"
            stroke={isPositive ? '#00F5D4' : '#F43F5E'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Live Indicator pulse point */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/80 text-[10px] text-slate-300">
          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>Live Stream</span>
        </div>
      </div>

      {/* Footer Stats Grid */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center text-xs">
        <div className="p-2 rounded-xl bg-[#141B2D]/60 border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block">24h Volume</span>
          <span className="font-bold text-white">$1,420,500</span>
        </div>
        <div className="p-2 rounded-xl bg-[#141B2D]/60 border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block">24h High</span>
          <span className="font-bold text-emerald-400">${(fromToken.priceUsd * 1.08).toFixed(4)}</span>
        </div>
        <div className="p-2 rounded-xl bg-[#141B2D]/60 border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block">24h Low</span>
          <span className="font-bold text-rose-400">${(fromToken.priceUsd * 0.93).toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
};
