import React, { useState } from 'react';
import { X, Search, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { Token } from '../types';
import { TOKENS } from '../data/tokens';
import { motion, AnimatePresence } from 'motion/react';

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  selectedToken: Token;
  balances: Record<string, number>;
}

export const TokenSelectModal: React.FC<TokenSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedToken,
  balances,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  if (!isOpen) return null;

  const filteredTokens = TOKENS.filter((token) => {
    const matchesSearch =
      token.symbol.toLowerCase().includes(search.toLowerCase()) ||
      token.name.toLowerCase().includes(search.toLowerCase()) ||
      token.contractAddress.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || token.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const popularTokens = TOKENS.filter((t) => t.isPopular);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            className="relative w-full max-w-md bg-white rounded-t-[40px] shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col h-[75dvh] z-50"
          >
            {/* Minimal Handle */}
            <div className="absolute top-0 left-0 right-0 h-10 flex items-start justify-center pt-4 pointer-events-none z-30">
              <div className="w-10 h-1 bg-slate-100 rounded-full" />
            </div>

            {/* Header */}
            <div className="p-4 px-6 pt-8 flex items-center justify-between border-b border-slate-50">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tighter">
                <Sparkles className="w-5 h-5 text-[#24A1DE]" />
                Select Token
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-900 transition-all active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar & Filters */}
            <div className="p-5 pb-2 space-y-4">
              <div className="relative">
                <Search className="absolute top-3.5 right-4 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name or symbol..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full py-3 pr-12 pl-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#24A1DE] transition-all"
                />
              </div>

              {/* Popular Tokens Horizontal Scroll */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap px-1">
                  Popular:
                </span>
                {popularTokens.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => {
                      onSelect(token);
                      onClose();
                    }}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tighter flex items-center gap-2 border transition-all ${
                      selectedToken.id === token.id
                        ? 'bg-blue-50 border-blue-100 text-[#24A1DE] shadow-sm'
                        : 'bg-white border-slate-100 hover:border-blue-200 text-slate-600 shadow-sm'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${token.iconBg} ring-2 ring-white shadow-sm`} />
                    {token.symbol}
                  </button>
                ))}
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-50">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'popular', label: 'Featured' },
                  { id: 'meme', label: 'Meme' },
                  { id: 'defi', label: 'DeFi' },
                  { id: 'stable', label: 'Stable' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`py-2 px-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                      categoryFilter === cat.id
                        ? 'border-[#24A1DE] text-[#24A1DE]'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Token List */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2 space-y-2 no-scrollbar bg-slate-50/50">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((token) => {
                  const isSelected = selectedToken.id === token.id;

                  return (
                    <button
                      key={token.id}
                      onClick={() => {
                        onSelect(token);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all group ${
                        isSelected
                          ? 'bg-blue-50/80 border border-blue-100 ring-4 ring-blue-50/50'
                          : 'bg-white hover:bg-slate-50 border border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl ${token.iconBg} flex items-center justify-center font-black text-white shadow-lg text-[10px] tracking-wider overflow-hidden ring-4 ring-white`}>
                          {token.iconUrl ? (
                            <img src={token.iconUrl} alt={token.symbol} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          ) : (
                            token.symbol.slice(0, 3)
                          )}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-slate-900 tracking-tighter">{token.symbol}</span>
                            {token.isVerified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-[#24A1DE] fill-[#24A1DE]/10" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter block mt-0.5">{token.name}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-slate-900 tracking-tighter block">
                          ${token.priceUsd < 0.01 ? token.priceUsd.toFixed(6) : token.priceUsd.toFixed(2)}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-tighter block mt-0.5 ${
                            token.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {token.change24h >= 0 ? '+' : ''}
                          {token.change24h}%
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No tokens found</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
