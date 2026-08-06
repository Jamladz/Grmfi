import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Shield, Award, Wallet, ChevronRight, Trophy } from 'lucide-react';
import { TOKENS } from '../data/tokens';
import { AchievementsModal } from './AchievementsModal';

interface ProfileViewProps {
  balances: Record<string, number>;
  userProfile: any;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ balances, userProfile }) => {
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);

  const rawUsername = userProfile?.username || userProfile?.telegramUsername || 'user';
  const displayUsername = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;

  const displayedTokens = ['GRMF', 'GRAM', 'USDT']
    .map(symbol => TOKENS.find(t => t.symbol === symbol))
    .filter(Boolean) as typeof TOKENS;

  const realBalances = userProfile?.realBalances || { GRMF: 0 };

  // Calculate unclaimed achievements count for badge
  const inviteCount = userProfile?.inviteCount || (userProfile?.invitedUsers?.length || 0);
  const realGrmf = userProfile?.realBalances?.GRMF || 0;
  const taskProgress = userProfile?.taskProgress || {};
  const completedTasksCount = Object.values(taskProgress).filter((t: any) => t?.status === 'completed').length;
  const claimedMap = userProfile?.claimedAchievements || {};

  const checkUnlocked = [
    { id: 'welcome', unlocked: true },
    { id: 'wallet_connected', unlocked: !!userProfile?.walletAddress },
    { id: 'invite_1', unlocked: inviteCount >= 1 },
    { id: 'invite_5', unlocked: inviteCount >= 5 },
    { id: 'invite_10', unlocked: inviteCount >= 10 },
    { id: 'task_master', unlocked: completedTasksCount >= 1 },
    { id: 'grmf_50', unlocked: realGrmf >= 50 },
    { id: 'grmf_200', unlocked: realGrmf >= 200 },
  ];

  const readyCount = checkUnlocked.filter(item => item.unlocked && !claimedMap[item.id]).length;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center px-4">
        <div className="relative group">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#24A1DE] to-blue-600 p-1 shadow-xl shadow-blue-500/10">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-slate-50">
              {userProfile?.photoUrl ? (
                <img src={userProfile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-[#24A1DE]" />
              )}
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1.5 rounded-full border-2 border-white shadow-lg">
            <Shield className="w-3 h-3 text-white" />
          </div>
        </div>

        <h2 className="mt-4 text-xl font-black text-slate-900 tracking-tight">
          {displayUsername}
        </h2>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
            Verified User
          </span>
          <span className="text-[10px] font-bold text-[#24A1DE] bg-blue-50 px-2 py-0.5 rounded-full">
            Level 12
          </span>
        </div>
      </div>

      {/* Assets Section */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-400" />
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Assets</h3>
          </div>
          <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-blue-100">Mainnet Enabled</span>
        </div>

        <div className="grid gap-3">
          {displayedTokens.map(token => {
            const isGrmf = token.symbol === 'GRMF';
            const balance = isGrmf ? realBalances.GRMF : (balances[token.symbol] || 0);
            const value = (balance * (token.priceUsd || 0)).toFixed(2);

            return (
              <div key={token.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 ${token.iconBg}`}>
                    {token.iconUrl ? (
                      <img src={token.iconUrl} alt={token.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-[10px]">{token.symbol[0]}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-900 font-bold text-xs">{token.name}</span>
                    <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">{token.symbol}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-slate-900 font-black text-xs">{balance.toLocaleString()}</span>
                  <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                    ${value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Menu Options */}
      <div className="flex flex-col gap-2">
        <MenuButton 
          icon={<Trophy className="w-4 h-4 text-amber-500" />} 
          label="Achievements" 
          badge={readyCount > 0 ? `${readyCount} Ready` : undefined}
          onClick={() => setIsAchievementsOpen(true)}
        />
      </div>

      {/* Achievements Modal */}
      <AchievementsModal 
        isOpen={isAchievementsOpen} 
        onClose={() => setIsAchievementsOpen(false)} 
        userProfile={userProfile} 
      />
    </motion.div>
  );
};

const MenuButton = ({ icon, label, badge, onClick }: { icon: React.ReactNode, label: string, badge?: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition-colors active:scale-[0.98] shadow-sm cursor-pointer w-full text-left"
  >
    <div className="flex items-center gap-3">
      <div className="text-slate-400">{icon}</div>
      <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {badge && (
        <span className="text-[9px] font-black text-white bg-amber-500 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-slate-300" />
    </div>
  </button>
);
