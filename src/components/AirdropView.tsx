import React from 'react';
import { motion } from 'motion/react';
import { Rocket, Sparkles, Clock, ShieldCheck } from 'lucide-react';

interface AirdropViewProps {
  userProfile?: any;
  wallet?: any;
  onOpenWalletModal?: () => void;
  setActiveView?: (view: any) => void;
}

export const AirdropView: React.FC<AirdropViewProps> = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center my-auto"
    >
      {/* Sleek Outer Glow Container */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[#24A1DE]/20 rounded-full blur-2xl animate-pulse pointer-events-none" />
        
        <div className="w-24 h-24 bg-gradient-to-tr from-[#24A1DE] via-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/30 border border-white/20 relative z-10 mx-auto">
          <Rocket className="w-12 h-12 text-white animate-bounce" />
        </div>
      </div>

      {/* Status Badge */}
      <div className="inline-flex items-center gap-2 bg-blue-50 text-[#24A1DE] border border-blue-100 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 shadow-sm">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Airdrop Portal</span>
      </div>

      {/* Main Heading */}
      <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
        Coming Soon
      </h2>

      {/* Description */}
      <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-6 font-medium">
        We are preparing the official GRMF Mainnet Airdrop platform. Distribution details and snapshot allocations will be launched very soon.
      </p>

      {/* Notification Card */}
      <div className="w-full max-w-xs bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 text-left">
        <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500 shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <span className="text-xs font-bold text-slate-800 block">Stay Tuned for Official Launch</span>
          <span className="text-[10px] text-slate-400">Keep up your daily activity to maximize your future allocation</span>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>GRMF Fi Verified System</span>
      </div>
    </motion.div>
  );
};
