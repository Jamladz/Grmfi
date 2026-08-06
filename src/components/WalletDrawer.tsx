import React, { useState } from 'react';
import { X, Copy, ExternalLink, LogOut, Check, Wallet, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { WalletState } from '../types';
import { TOKENS } from '../data/tokens';
import { motion, AnimatePresence } from 'motion/react';

interface WalletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletState;
  onDisconnect: () => void;
}

export const WalletDrawer: React.FC<WalletDrawerProps> = ({
  isOpen,
  onClose,
  wallet,
  onDisconnect,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate total balance in USD
  const totalUsdBalance = TOKENS.reduce((acc, token) => {
    const bal = wallet.balances[token.symbol] || 0;
    return acc + bal * token.priceUsd;
  }, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm h-full bg-white border-l border-slate-100 shadow-2xl text-slate-900 flex flex-col justify-between"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-400 to-blue-600 p-0.5 shadow-md">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-[#24A1DE]" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{wallet.walletName || 'TON Wallet'}</h3>
                <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected via TON Connect
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-slate-50">
            {/* Total Balance Card */}
            <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-sm">
              <span className="text-xs text-slate-500 block font-medium">
                Total Portfolio Value
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ${totalUsdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* Address Bar */}
              <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500">
                  {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-[#24A1DE] transition-colors"
                    title="Copy address"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={`https://tonscan.org/address/${wallet.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-[#24A1DE] transition-colors"
                    title="Open in Tonscan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Asset List */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                Assets
              </h4>
              <div className="space-y-2">
                {TOKENS.map((token) => {
                  const bal = wallet.balances[token.symbol] || 0;
                  const usdVal = bal * token.priceUsd;

                  return (
                    <div
                      key={token.id}
                      className="p-3 rounded-2xl bg-white border border-slate-100 flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl ${token.iconBg} flex items-center justify-center font-bold text-[10px] text-white shadow-sm overflow-hidden`}>
                          {token.iconUrl ? (
                            <img src={token.iconUrl} alt={token.symbol} className="w-full h-full object-cover" />
                          ) : (
                            token.symbol.slice(0, 3)
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{token.symbol}</span>
                          <span className="text-[10px] text-slate-400 block">{token.name}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 block">
                          {bal.toLocaleString()} {token.symbol}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ${usdVal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer - Disconnect */}
          <div className="p-5 border-t border-slate-100 bg-white">
            <button
              onClick={() => {
                onDisconnect();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
