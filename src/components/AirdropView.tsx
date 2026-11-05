import React from 'react';
import { motion } from 'motion/react';
import { Rocket, Clock, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';

interface AirdropViewProps {
  userProfile?: any;
  wallet?: any;
  onOpenWalletModal?: () => void;
  setActiveView?: (view: any) => void;
}

export const AirdropView: React.FC<AirdropViewProps> = ({
  userProfile,
  wallet,
  onOpenWalletModal,
  setActiveView,
}) => {
  const realGrmf = userProfile?.realBalances?.GRMF || 0;
  const inviteCount = Math.max(userProfile?.referralsCount || 0, userProfile?.inviteCount || 0);
  const taskProgress = userProfile?.taskProgress || {};
  const completedTasksCount = Object.values(taskProgress).filter((t: any) => t?.status === 'completed' || t?.status === 'claimed').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 pb-8"
    >
      {/* Hero Allocation Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md text-center relative overflow-hidden">
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
          <Rocket className="w-7 h-7 text-sky-400" />
        </div>

        <p className="text-xs font-semibold text-sky-400 mb-1">
          GRMF Mainnet Token Generation Event
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">
          Airdrop Allocation
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mb-5">
          Your on-chain allocation is calculated from your accumulated GRMF balance, completed DEX swaps, and network referrals.
        </p>

        <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/60 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[11px] text-slate-400 font-medium block">Qualified Balance</span>
            <span className="text-xl font-mono tabular-nums font-extrabold text-white">
              {realGrmf.toLocaleString()} <span className="text-xs text-sky-400">GRMF</span>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 font-medium block">Snapshot Status</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active Tracking</span>
            </span>
          </div>
        </div>
      </div>

      {/* Eligibility Checklist */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
        <h2 className="text-sm font-extrabold text-slate-900 mb-3">
          Qualification Criteria
        </h2>

        <div className="divide-y divide-slate-100">
          <div className="py-3 first:pt-0 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 block">1. Connect TON Wallet</span>
              <span className="text-[11px] text-slate-500">Required to receive Mainnet jettons</span>
            </div>
            {wallet?.isConnected ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Connected
              </span>
            ) : (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenWalletModal?.();
                }}
                className="min-h-[36px] px-3.5 py-1.5 bg-[#0088CC] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Connect
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 block">2. Complete DEX Swap Missions</span>
              <span className="text-[11px] text-slate-500 font-mono tabular-nums">{completedTasksCount} missions completed</span>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveView?.('tasks');
              }}
              className="min-h-[36px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Missions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-3 last:pb-0 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 block">3. Invite Active Friends</span>
              <span className="text-[11px] text-slate-500 font-mono tabular-nums">{inviteCount} friends invited</span>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveView?.('referrals');
              }}
              className="min-h-[36px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Invite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Distribution Notice */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
        <div className="w-10 h-10 bg-amber-50 rounded-2xl text-amber-600 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <span className="text-xs font-bold text-slate-900 block">Snapshot & Claim Schedule</span>
          <span className="text-[11px] text-slate-500">Official claiming opens immediately after the Presale concludes.</span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>GRMF Fi Verified Distribution Contract</span>
      </div>
    </motion.div>
  );
};
