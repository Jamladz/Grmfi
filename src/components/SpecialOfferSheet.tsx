import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Users, Clock, ArrowRight, X, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';

interface SpecialOfferSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToMission: () => void;
  userProfile: any;
}

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FLASH_OFFER_END_KEY = 'grmf_flash_offer_10d_end_ts';
const SPECIAL_OFFER_LAST_SHOWN_KEY = 'grmf_special_offer_last_shown_ts';

export function shouldOpenSpecialOffer24h(userId?: string, userProfile?: any): boolean {
  try {
    if (userProfile?.taskProgress?.flash_invite_5_60k?.status === 'claimed') {
      return false;
    }
    const now = Date.now();
    const globalSaved = parseInt(localStorage.getItem(SPECIAL_OFFER_LAST_SHOWN_KEY) || '0', 10) || 0;
    const userSaved = userId
      ? parseInt(localStorage.getItem(`${SPECIAL_OFFER_LAST_SHOWN_KEY}_${userId}`) || '0', 10) || 0
      : 0;
    const profileSaved = Number(userProfile?.lastSpecialOfferShownAt) || 0;

    const lastShown = Math.max(globalSaved, userSaved, profileSaved);
    if (lastShown > 0 && now - lastShown < TWENTY_FOUR_HOURS_MS) {
      return false;
    }
    return true;
  } catch (e) {
    return true;
  }
}

export function markSpecialOfferShown24h(userId?: string): void {
  try {
    const nowStr = String(Date.now());
    localStorage.setItem(SPECIAL_OFFER_LAST_SHOWN_KEY, nowStr);
    if (userId) {
      localStorage.setItem(`${SPECIAL_OFFER_LAST_SHOWN_KEY}_${userId}`, nowStr);
    }
  } catch (e) {}
}

export function getTenDayOfferCountdown(now = Date.now()): string {
  let endTs = 0;
  try {
    const saved = localStorage.getItem(FLASH_OFFER_END_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > now) {
        endTs = parsed;
      }
    }
    if (!endTs) {
      endTs = now + TEN_DAYS_MS;
      localStorage.setItem(FLASH_OFFER_END_KEY, String(endTs));
    }
  } catch (e) {
    endTs = now + TEN_DAYS_MS;
  }

  const remainingMs = Math.max(0, endTs - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export const SpecialOfferSheet: React.FC<SpecialOfferSheetProps> = ({
  isOpen,
  onClose,
  onGoToMission,
  userProfile,
}) => {
  const [countdownText, setCountdownText] = useState<string>(() => getTenDayOfferCountdown());

  useEffect(() => {
    if (!isOpen) return;
    markSpecialOfferShown24h(userProfile?.id);
    setCountdownText(getTenDayOfferCountdown());
    const timer = setInterval(() => {
      setCountdownText(getTenDayOfferCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, userProfile?.id]);

  const existingReferrals = Math.max(
    Number(userProfile?.referralsCount) || 0,
    Number(userProfile?.inviteCount) || 0,
    Array.isArray(userProfile?.invitedUsers) ? userProfile.invitedUsers.length : 0
  );
  const newMissionInvites = Math.min(5, Math.max(0, Number(userProfile?.flashInvite5NewCount) || 0));
  const isClaimed = userProfile?.taskProgress?.flash_invite_5_60k?.status === 'claimed';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="absolute inset-0 bg-slate-900/65 backdrop-blur-xs"
          />

          {/* Bottom-to-Top Sheet Surface */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340, mass: 0.8 }}
            className="relative z-10 w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl border-t sm:border border-slate-200/80 shadow-2xl overflow-hidden pb-[calc(1.25rem+env(safe-area-inset-bottom,12px))]"
          >
            {/* Dark Hero Header Banner */}
            <div className="bg-slate-900 text-white px-5 pt-3.5 pb-5 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-[#0088CC]/25 rounded-full blur-2xl pointer-events-none" />

              {/* Mobile Drag Handle */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3.5 sm:hidden" />

              {/* Top Urgency Row */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span>Special Offer • Ending Soon</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/30 text-rose-200 text-[11px] font-mono tabular-nums font-bold">
                    <Clock className="w-3 h-3 text-rose-400" />
                    <span>{countdownText}</span>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onClose();
                    }}
                    className="p-1.5 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Offer Title & Mega Reward */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 block mb-0.5">
                    Limited-Time Flash Mission
                  </span>
                  <h2 className="text-lg font-extrabold text-white tracking-tight leading-snug">
                    Invite 5 Friends • Get 60K
                  </h2>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    This special offer will disappear soon — claim +60,000 GRMF!
                  </p>
                </div>

                <div className="shrink-0 bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 rounded-2xl px-3.5 py-2.5 text-center shadow-lg shadow-amber-500/20">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-80">
                    Mega Reward
                  </span>
                  <span className="text-lg font-black font-mono tabular-nums leading-none block mt-0.5">
                    +60,000
                  </span>
                  <span className="text-[10px] font-extrabold block mt-0.5">
                    GRMF + 500 XP
                  </span>
                </div>
              </div>
            </div>

            {/* Body Content */}
            <div className="px-5 pt-4 space-y-3.5">
              {/* Progress & Strict Rule Card */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#0088CC]" />
                    <span>New Mission Invites</span>
                  </span>
                  <span className="font-mono tabular-nums font-extrabold text-[#0088CC]">
                    {newMissionInvites} / 5 Friends
                  </span>
                </div>

                {/* 5-Step Progress Bar */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((step) => {
                    const active = newMissionInvites >= step;
                    return (
                      <div
                        key={step}
                        className={`h-2 rounded-full transition-all ${
                          active ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Explicit Rule Notice: Existing referrals do not count */}
                <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-600 leading-relaxed border-t border-slate-200/60">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Mission Rule: </span>
                    <span>
                      Pre-existing referrals are <strong>not counted</strong> toward this task. Only{' '}
                      <strong className="text-slate-900">5 new friends</strong> invited during this flash offer qualify.
                    </span>
                    {existingReferrals > 0 && newMissionInvites === 0 && (
                      <span className="block mt-1 font-semibold text-amber-700">
                        • Your {existingReferrals} previous referral{existingReferrals === 1 ? '' : 's'} are excluded — mission starts at 0/5.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Urgency Banner */}
              <div className="rounded-2xl bg-amber-50/90 border border-amber-200/80 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-amber-950 truncate">
                    Hurry! This special 60,000 GRMF offer will disappear soon!
                  </span>
                </div>
                {isClaimed && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Claimed</span>
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onGoToMission();
                  }}
                  className="w-full min-h-[46px] py-3 px-4 rounded-2xl bg-[#0088CC] hover:bg-[#0077B5] text-white font-extrabold text-xs shadow-md shadow-[#0088CC]/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span>Open 60,000 GRMF Mission</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onClose();
                  }}
                  className="w-full min-h-[40px] py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                >
                  Remind Me Later (Disappearing Soon)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
