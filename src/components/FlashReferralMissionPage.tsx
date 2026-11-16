import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Flame,
  Clock,
  Users,
  Share2,
  Copy,
  Check,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Lock,
  UserPlus,
  Gift
} from 'lucide-react';
import { openTelegramLink, triggerHaptic } from '../lib/telegram';

interface FlashReferralMissionPageProps {
  newMissionInvites: number;
  existingReferralsCount: number;
  isClaimed: boolean;
  isClaiming: boolean;
  offerFormatted: string;
  personalInviteLink: string;
  onBack: () => void;
  onClaim: () => void;
}

export const FlashReferralMissionPage: React.FC<FlashReferralMissionPageProps> = ({
  newMissionInvites,
  existingReferralsCount,
  isClaimed,
  isClaiming,
  offerFormatted,
  personalInviteLink,
  onBack,
  onClaim,
}) => {
  const [copied, setCopied] = useState(false);
  const isReadyToClaim = newMissionInvites >= 5 && !isClaimed;
  const remainingFriends = Math.max(0, 5 - newMissionInvites);

  const handleShareTelegram = () => {
    triggerHaptic('medium');
    const shareText = `🔥 Join GRMF Fi via my invite link and claim up to +2,500 GRMF instant welcome bonus!`;
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(personalInviteLink)}&text=${encodeURIComponent(shareText)}`;
    openTelegramLink(tgShareUrl);
  };

  const handleCopyLink = async () => {
    triggerHaptic('light');
    try {
      await navigator.clipboard.writeText(personalInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-4 pb-6"
    >
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onBack();
          }}
          className="min-h-[40px] px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 text-slate-800 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
          <span>Back to Missions</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 text-xs font-mono tabular-nums font-extrabold">
          <Clock className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span>Ends in {offerFormatted}</span>
        </div>
      </div>

      {/* Hero Special Offer Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#0088CC]/25 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider mb-3">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span>Special Offer • Disappearing Soon</span>
          </div>

          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Invite 5 Friends Mission
              </h1>
              <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
                Invite 5 new friends to open the Mini App during this limited-time event and claim an instant 60,000 GRMF mega reward.
              </p>
            </div>
          </div>

          {/* Mega Reward Showcase Box */}
          <div className="bg-gradient-to-r from-amber-400/15 via-amber-500/10 to-sky-500/15 border border-amber-400/30 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block">
                  Mission Mega Pool
                </span>
                <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                  <span className="text-2xl font-black text-white">+60,000</span>
                  <span className="text-xs font-extrabold text-amber-400">GRMF</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Bonus XP
              </span>
              <span className="text-sm font-extrabold font-mono tabular-nums text-sky-400">
                +500 XP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Friends Progress Tracker Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0088CC]" />
            <h2 className="text-sm font-extrabold text-slate-900">
              Mission Progress (New Referrals)
            </h2>
          </div>
          <span className="text-xs font-mono tabular-nums font-extrabold px-2.5 py-1 rounded-lg bg-sky-50 text-[#0088CC] border border-sky-200/60">
            {newMissionInvites} / 5 Joined
          </span>
        </div>

        {/* 5 Visual Slots */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((slot) => {
            const completed = newMissionInvites >= slot;
            return (
              <div
                key={slot}
                className={`rounded-2xl p-2.5 border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  completed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-50 border-slate-200/70 text-slate-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-extrabold ${
                    completed
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-white border border-slate-200/80 text-slate-400'
                  }`}
                >
                  {completed ? <Check className="w-4 h-4" /> : <UserPlus className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[10px] font-bold tracking-tight">
                  Friend #{slot}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0088CC] to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (newMissionInvites / 5) * 100)}%` }}
          />
        </div>

        {/* Strict Rule Box: Existing referrals do NOT count */}
        <div className="rounded-2xl bg-amber-50/90 border border-amber-200/80 p-3.5 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 leading-relaxed space-y-1">
            <p className="font-extrabold">
              Strict Mission Rule — New Referrals Only:
            </p>
            <p className="text-[11px] text-amber-900/90 font-medium">
              If you already own previous referrals, the mission is <strong>not counted</strong> from them. You must invite <strong>5 new friends</strong> starting from 0/5 to unlock the 60,000 GRMF reward.
            </p>
            {existingReferralsCount > 0 && newMissionInvites === 0 && (
              <p className="text-[11px] font-bold text-amber-800 pt-0.5">
                • Your {existingReferralsCount} pre-existing referral{existingReferralsCount === 1 ? '' : 's'} are excluded (Current Mission Progress: 0/5).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Share & Invite Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-3.5">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            Your Personal Invite Link
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Share your link on Telegram. Each new friend who opens the app counts toward your 5/5 goal.
          </p>
        </div>

        {/* Link Preview Row */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-slate-600 truncate">
            {personalInviteLink}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Share CTA */}
        <button
          type="button"
          onClick={handleShareTelegram}
          className="w-full min-h-[46px] py-3 px-4 rounded-2xl bg-[#0088CC] hover:bg-[#0077B5] text-white font-extrabold text-xs shadow-md shadow-[#0088CC]/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Invite Link on Telegram</span>
        </button>

        {/* Claim 60,000 GRMF Button */}
        {isClaimed ? (
          <div className="w-full min-h-[46px] py-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>+60,000 GRMF Mission Claimed</span>
          </div>
        ) : isReadyToClaim ? (
          <button
            type="button"
            onClick={onClaim}
            disabled={isClaiming}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isClaiming ? 'Claiming +60,000 GRMF...' : 'Claim +60,000 GRMF Reward Now'}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full min-h-[46px] py-3 px-4 rounded-2xl bg-slate-100 border border-slate-200/80 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>
              Invite {remainingFriends} More New Friend{remainingFriends === 1 ? '' : 's'} to Claim 60,000 GRMF
            </span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
