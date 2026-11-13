import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Plus,
  CheckCircle2,
  Loader2,
  Zap,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';
import { useHomeScreenShortcut } from '../hooks/useHomeScreenShortcut';

export const AddToHomeScreenSheet: React.FC = () => {
  const {
    isAdded,
    isVerifying,
    justVerified,
    verificationError,
    shouldShowPrompt,
    addToHomeScreen,
    checkStatusNow,
    dismissForSession
  } = useHomeScreenShortcut();

  // Automatically close the bottom sheet shortly after verification succeeds
  useEffect(() => {
    if (isAdded && justVerified) {
      const timer = window.setTimeout(() => {
        dismissForSession();
      }, 1500);
      return () => window.clearTimeout(timer);
    }
  }, [isAdded, justVerified, dismissForSession]);

  return (
    <AnimatePresence>
      {shouldShowPrompt && (
        <div className="fixed inset-0 z-[130] flex flex-col justify-end pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={dismissForSession}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Half-Page Bottom Sheet sliding from bottom to top */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-xl mx-auto bg-white rounded-t-[32px] pt-3 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,16px))] shadow-2xl border-t border-slate-200/80 z-10"
          >
            {/* Top Drag Handle Pill */}
            <div className="w-11 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

            {/* Close Button */}
            <button
              onClick={dismissForSession}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {isAdded ? (
              /* Verified Success State */
              <div className="py-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center mb-3.5 text-emerald-600">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Added to Home Screen
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Shortcut verified successfully. Enjoy 1-tap access to GRMF Fi!
                </p>
              </div>
            ) : (
              /* Standard Prompt & Verification State */
              <div className="flex flex-col items-center text-center">
                {/* Visual App Icon -> Home Screen Preview */}
                <div className="relative mb-4 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 p-1 shadow-lg border border-slate-200/80 relative">
                    <img
                      src="https://i.suar.me/vAdG5/l"
                      alt="GRMF Fi"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#0088CC] text-white flex items-center justify-center shadow-md border-2 border-white">
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Add GRMF Fi to Home Screen
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 max-w-xs leading-relaxed">
                  Add the official shortcut to your phone&apos;s Home Screen for instant 1-tap access and real-time reward tracking.
                </p>

                {/* Concise Value Rows */}
                <div className="w-full bg-slate-50 rounded-2xl p-3.5 mt-4 mb-4 border border-slate-200/70 flex flex-col gap-2.5 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0088CC] flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block">
                        Instant Fullscreen Launch
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block">
                        Open GRMF Fi directly from your phone dock in 1 tap
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200/60" />

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block">
                        Verified Home Screen Status
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block">
                        Automatically verifies shortcut presence on your device
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification Warning if user cancelled or OS didn't confirm yet */}
                {verificationError && (
                  <div className="w-full mb-3.5 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2 text-left">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-semibold text-amber-800 leading-snug">
                      {verificationError}
                    </span>
                  </div>
                )}

                {/* Primary CTA: Add & Verify */}
                <button
                  onClick={addToHomeScreen}
                  disabled={isVerifying}
                  className="w-full min-h-[48px] py-3.5 rounded-2xl bg-[#0088CC] hover:bg-[#0077B5] disabled:opacity-75 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#0088CC]/20 active:scale-[0.99] transition-all cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Home Screen Shortcut...</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      <span>Add to Home Screen</span>
                    </>
                  )}
                </button>

                {/* Secondary Row: Re-Verify Status / Later */}
                <div className="w-full flex items-center justify-between gap-2 mt-2.5 px-1">
                  <button
                    onClick={() => checkStatusNow()}
                    className="py-1.5 text-[11px] font-bold text-[#0088CC] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Verify Addition</span>
                  </button>

                  <button
                    onClick={dismissForSession}
                    className="py-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Later
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
