import React, { useState } from 'react';
import { POOLS } from '../data/tokens';
import { Pool, WalletState } from '../types';
import { Plus, TrendingUp, ShieldCheck, Flame, Droplets, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

interface PoolCardProps {
  pool: Pool;
  wallet: WalletState;
  onOpenConnectModal: () => void;
}

export const PoolCard: React.FC<PoolCardProps> = ({ pool, wallet, onOpenConnectModal }) => {
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [depositAmountA, setDepositAmountA] = useState('');
  const [depositAmountB, setDepositAmountB] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const handleOpenDeposit = () => {
    setSelectedPool(pool);
    setShowAddModal(true);
  };

  const handleAddLiquidity = () => {
    alert('Liquidity added successfully!');
    setShowAddModal(false);
  };

  return (
    <>
      <div
        className="p-5 rounded-3xl bg-[#0E1322] border border-[#1E293B] hover:border-cyan-500/40 transition-all shadow-xl flex flex-col justify-between"
      >
        <div>
          {/* Pool Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-2">
                <div className={`w-9 h-9 rounded-2xl ${pool.tokenA.iconBg} flex items-center justify-center font-bold text-xs text-white border-2 border-[#0E1322] overflow-hidden`}>
                  {pool.tokenA.iconUrl ? (
                    <img src={pool.tokenA.iconUrl} alt={pool.tokenA.symbol} className="w-full h-full object-cover" />
                  ) : (
                    pool.tokenA.symbol.slice(0, 3)
                  )}
                </div>
                <div className={`w-9 h-9 rounded-2xl ${pool.tokenB.iconBg} flex items-center justify-center font-bold text-xs text-white border-2 border-[#0E1322] overflow-hidden`}>
                  {pool.tokenB.iconUrl ? (
                    <img src={pool.tokenB.iconUrl} alt={pool.tokenB.symbol} className="w-full h-full object-cover" />
                  ) : (
                    pool.tokenB.symbol.slice(0, 3)
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">
                  {pool.tokenA.symbol} / {pool.tokenB.symbol}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs font-black">
              <Flame className="w-3.5 h-3.5" />
              <span>{pool.apr}% APR</span>
            </div>
          </div>

          {/* Pool Stats */}
          <div className="grid grid-cols-2 gap-3 my-4 text-xs">
            <div className="p-3 rounded-2xl bg-[#141B2D]">
              <span className="text-slate-400 text-[11px] block">TVL</span>
              <span className="font-bold text-white text-sm">${(pool.tvlUsd / 1000000).toFixed(2)}M</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#141B2D]">
              <span className="text-slate-400 text-[11px] block">24h Volume</span>
              <span className="font-bold text-cyan-300 text-sm">${(pool.volume24hUsd / 1000000).toFixed(2)}M</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {!wallet.isConnected ? (
          <button
            onClick={onOpenConnectModal}
            className="w-full py-3 rounded-2xl bg-[#141B2D] border border-cyan-500/30 text-cyan-400 font-bold text-xs hover:bg-cyan-500/10 transition-all flex items-center justify-center gap-2"
          >
            <span>Connect Wallet to Deposit</span>
          </button>
        ) : (
          <button
            onClick={handleOpenDeposit}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs hover:shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Liquidity</span>
          </button>
        )}
      </div>

      {/* Add Liquidity Modal */}
      {showAddModal && selectedPool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0E1322] border border-[#1E293B] rounded-3xl p-6 text-white space-y-4">
            <h3 className="font-bold text-lg text-white">
              Add Liquidity
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#141B2D] rounded-2xl border border-slate-800 space-y-1">
                <label className="text-slate-400 block">{selectedPool.tokenA.symbol} Amount</label>
                <input
                  type="number"
                  placeholder="0.0"
                  value={depositAmountA}
                  onChange={(e) => {
                    setDepositAmountA(e.target.value);
                    setDepositAmountB((parseFloat(e.target.value) * (selectedPool.tokenA.priceUsd / selectedPool.tokenB.priceUsd) || 0).toString());
                  }}
                  className="w-full bg-transparent text-lg font-bold text-white focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#141B2D] rounded-2xl border border-slate-800 space-y-1">
                <label className="text-slate-400 block">{selectedPool.tokenB.symbol} Amount</label>
                <input
                  type="number"
                  placeholder="0.0"
                  value={depositAmountB}
                  onChange={(e) => setDepositAmountB(e.target.value)}
                  className="w-full bg-transparent text-lg font-bold text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-2xl bg-[#141B2D] text-slate-400 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLiquidity}
                className="flex-1 py-3 rounded-2xl bg-cyan-500 text-slate-950 font-black text-xs"
              >
                Confirm Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
