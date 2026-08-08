import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Trophy, CheckCircle2, Lock } from 'lucide-react';
import { LEVEL_RANKS, getUserLevelInfo, getUserTotalXp } from '../lib/levelSystem';

interface RanksModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
}

export const RanksModal: React.FC<RanksModalProps> = ({ isOpen, onClose, userProfile }) => {
  if (!isOpen) return null;

  const totalXp = getUserTotalXp(userProfile);
  const { currentRank } = getUserLevelInfo(totalXp);

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/75 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full max-w-md bg-white rounded-t-[36px] sm:rounded-[36px] p-5 pb-6 text-slate-900 shadow-2xl relative overflow-hidden border-t sm:border border-amber-200/60 h-[75vh] max-h-[75vh] flex flex-col justify-between"
        >
          {/* Top Pull Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2 shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                  Wealth Tiers & Ranks
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Earn XP from activities to advance your rank
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Ranks List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 my-1">
            {LEVEL_RANKS.map((rank) => {
              const isCurrent = currentRank.level === rank.level;
              const isUnlocked = totalXp >= rank.minXp;

              return (
                <div
                  key={rank.level}
                  className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden ${
                    isCurrent
                      ? 'bg-gradient-to-br from-amber-50/90 via-yellow-50/50 to-orange-50/40 border-amber-300 shadow-sm ring-2 ring-amber-400/30'
                      : isUnlocked
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {rank.imageUrl ? (
                        <div className="w-11 h-11 shrink-0 flex items-center justify-center drop-shadow-md">
                          <img src={rank.imageUrl} alt={rank.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs border shrink-0 ${rank.badgeBg}`}>
                          {rank.badgeIcon}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Lvl {rank.level}
                          </span>
                          <span className={`text-xs font-black tracking-tight ${rank.textColor}`}>
                            {rank.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-amber-500 text-white px-1.5 py-0.5 rounded-full shadow-xs">
                              Current
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                          {rank.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-800 block">
                        {rank.minXp.toLocaleString()} XP
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {isUnlocked ? (
                          <span className="text-emerald-600 flex items-center justify-end gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Unlocked
                          </span>
                        ) : (
                          <span className="flex items-center justify-end gap-0.5">
                            <Lock className="w-3 h-3 text-slate-400" /> Locked
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest transition-all shrink-0 active:scale-[0.98]"
          >
            Close
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
