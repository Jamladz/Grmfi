import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, CheckCircle2, Clock, Loader2, Gift } from 'lucide-react';

interface DailyBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  isClaimed: boolean;
  timeLeft?: string;
  onClaim: () => Promise<void>;
  rewardValue?: number;
}

export const DailyBoxModal: React.FC<DailyBoxModalProps> = ({
  isOpen,
  onClose,
  isClaimed,
  timeLeft,
  onClaim,
  rewardValue = 1,
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedSuccess, setClaimedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClaimClick = async () => {
    if (isClaimed || isClaiming || claimedSuccess) return;
    setIsClaiming(true);
    try {
      await onClaim();
      setClaimedSuccess(true);
      // Trigger haptic feedback if available in Telegram WebApp
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      }
    } catch (err) {
      console.error("Error claiming daily box:", err);
    } finally {
      setIsClaiming(false);
    }
  };

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
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="w-full max-w-md bg-white rounded-t-[36px] sm:rounded-[36px] p-6 pb-8 text-center shadow-2xl relative overflow-hidden border-t sm:border border-amber-200/80 min-h-[50vh] max-h-[85vh] flex flex-col justify-between"
        >
          {/* Decorative ambient top glow */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-100/80 via-yellow-50/40 to-transparent -z-0 pointer-events-none" />

          {/* Pull handle for bottom sheet effect */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2 relative z-10 shrink-0" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100/80 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all border border-slate-200/60 shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10 flex flex-col items-center my-auto py-2">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-100/90 border border-amber-300/80 rounded-full text-amber-900 text-[11px] font-black uppercase tracking-wider mb-2 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Daily Box Portal</span>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-1">
              🎉 Daily Reward Box
            </h3>

            <p className="text-xs text-slate-500 font-medium px-4 mb-2 leading-relaxed">
              Open the box and claim your free daily reward!
            </p>

            {/* Chest Image with Pulsing Glow */}
            <div className="relative my-2 flex items-center justify-center">
              <div className="absolute w-36 h-36 bg-gradient-to-tr from-amber-400/30 via-yellow-400/30 to-orange-400/30 rounded-full blur-2xl animate-pulse" />
              <motion.img
                src="https://i.suar.me/8zY5E/l"
                alt="Daily Box Chest"
                className="w-36 h-36 sm:w-44 sm:h-44 object-contain relative z-10 drop-shadow-2xl"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              />
            </div>

            {/* Reward Info Box */}
            <div className="w-full bg-gradient-to-br from-amber-50/90 via-yellow-50/50 to-orange-50/70 border border-amber-200/80 p-3.5 rounded-3xl mb-4 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white p-1 shadow-md border-2 border-amber-300 shrink-0 overflow-hidden flex items-center justify-center ring-2 ring-amber-400/20">
                  <img
                    src="https://i.suar.me/vAdG5/l"
                    alt="GRMF Token Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="text-left">
                  <span className="font-black text-slate-900 text-sm block tracking-tight">
                    GRMF Token
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    ✓ Instant Balance Credit
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-amber-600 tracking-tight">
                  +{rewardValue}
                </span>
                <span className="text-[10px] font-black text-amber-700/80 uppercase">
                  GRMF
                </span>
              </div>
            </div>

            {/* Action Button / Success State */}
            {isClaimed || claimedSuccess ? (
              <div className="w-full space-y-2.5">
                <div className="w-full py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-emerald-700 font-black text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Daily Box Reward Claimed Successfully!</span>
                </div>

                {timeLeft && (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50/80 border border-amber-200/60 py-2.5 px-4 rounded-2xl">
                    <Clock className="w-4 h-4 text-amber-500 animate-spin shrink-0" style={{ animationDuration: '6s' }} />
                    <span>Next box available in: {timeLeft}</span>
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  Close
                </button>
              </div>
            ) : (
              <button
                disabled={isClaiming}
                onClick={handleClaimClick}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-amber-500/30 transition-all active:scale-[0.97] flex items-center justify-center gap-2"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Claiming Reward...</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5 animate-bounce" />
                    <span>Claim Reward Now 🎁</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

