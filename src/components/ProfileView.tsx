import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Shield, Award, Wallet, ChevronRight, Trophy, Zap, Star, FileText } from 'lucide-react';
import { TOKENS } from '../data/tokens';
import { AchievementsModal } from './AchievementsModal';
import { RanksModal } from './RanksModal';
import { WhitepaperModal } from './WhitepaperModal';
import { HomeScreenShortcutMenuItem } from './HomeScreenShortcutMenuItem';
import { getUserTotalXp, getUserLevelInfo } from '../lib/levelSystem';

interface ProfileViewProps {
  balances: Record<string, number>;
  userProfile: any;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ balances, userProfile }) => {
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isRanksOpen, setIsRanksOpen] = useState(false);
  const [isWhitepaperOpen, setIsWhitepaperOpen] = useState(false);

  const rawUsername = userProfile?.username || userProfile?.telegramUsername || 'user';
  const displayUsername = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;

  const displayedTokens = ['GRMF', 'GRAM', 'USDT', 'NOT', 'DOGS', 'HMSTR']
    .map(symbol => TOKENS.find(t => t.symbol === symbol))
    .filter(Boolean) as typeof TOKENS;

  const realBalances = userProfile?.realBalances || { GRMF: 0 };

  // Calculate user total XP and level details
  const totalXp = getUserTotalXp(userProfile);
  const levelInfo = getUserLevelInfo(totalXp);
  const { currentRank, nextRank, isMaxLevel, progressPercentage, xpCurrentLevel, xpNeededForNext } = levelInfo;

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
      className="flex flex-col gap-5"
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
          <div className="absolute -bottom-1 -right-1">
            {currentRank.imageUrl ? (
              <div className="w-8 h-8 flex items-center justify-center drop-shadow-md">
                <img src={currentRank.imageUrl} alt={currentRank.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="bg-amber-500 p-1.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs">
                <span>{currentRank.badgeIcon}</span>
              </div>
            )}
          </div>
        </div>

        <h2 className="mt-3 text-xl font-black text-slate-900 tracking-tight">
          {displayUsername}
        </h2>

        {/* Dynamic Level & Rank Badge */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[11px] font-black px-3 py-0.5 rounded-full border shadow-sm flex items-center gap-1.5 ${currentRank.badgeBg}`}>
            {currentRank.imageUrl ? (
              <img src={currentRank.imageUrl} alt={currentRank.name} className="w-4 h-4 object-contain drop-shadow-sm" />
            ) : (
              <span>{currentRank.badgeIcon}</span>
            )}
            <span>Level {currentRank.level} • {currentRank.name}</span>
          </span>
        </div>
      </div>

      {/* Level XP Progress Card */}
      <div 
        onClick={() => setIsRanksOpen(true)}
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-3.5 sm:p-4 border border-slate-800 shadow-lg cursor-pointer hover:border-amber-400/50 transition-all group relative overflow-hidden active:scale-[0.99]"
      >
        <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2.5 relative z-10">
          <div className="flex items-center gap-2">
            {currentRank.imageUrl ? (
              <div className="w-9 h-9 shrink-0 flex items-center justify-center drop-shadow-md">
                <img src={currentRank.imageUrl} alt={currentRank.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-base shrink-0 shadow-inner">
                {currentRank.badgeIcon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                  Level {currentRank.level}
                </span>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/80">
                  {currentRank.name}
                </span>
              </div>
              <p className="text-[9.5px] text-slate-400 font-medium line-clamp-1">
                {currentRank.description}
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Compact Progress Bar */}
        <div className="space-y-1 relative z-10">
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-slate-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{totalXp.toLocaleString()} XP</span>
            </span>
            <span className="text-amber-400">
              {isMaxLevel ? 'MAX' : `${Math.round(progressPercentage)}%`}
            </span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full p-0.5 border border-slate-700/70 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${currentRank.color} shadow-sm`}
            />
          </div>

          <div className="flex justify-between items-center text-[9px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">Next: {nextRank.name} {nextRank.imageUrl ? <img src={nextRank.imageUrl} className="w-3 h-3 object-contain drop-shadow-sm" alt="" /> : `(${nextRank.badgeIcon})`}</span>
            <span>
              {isMaxLevel ? 'Max Rank' : `${xpCurrentLevel}/${xpNeededForNext} XP`}
            </span>
          </div>
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
            const realVal = realBalances[token.symbol] || 0;
            const betaVal = balances[token.symbol] || 0;
            const balance = Math.max(realVal, betaVal);
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
        <HomeScreenShortcutMenuItem />
        <MenuButton 
          icon={<Star className="w-4 h-4 text-amber-500" />} 
          label="Wealth Tiers & Ranks" 
          badge={`Level ${currentRank.level}`}
          onClick={() => setIsRanksOpen(true)}
        />
        <MenuButton 
          icon={<Trophy className="w-4 h-4 text-amber-500" />} 
          label="Achievements" 
          badge={readyCount > 0 ? `${readyCount} Ready` : undefined}
          onClick={() => setIsAchievementsOpen(true)}
        />
        <MenuButton 
          icon={<FileText className="w-4 h-4 text-indigo-500" />} 
          label="Project Whitepaper" 
          badge="v2.4"
          onClick={() => setIsWhitepaperOpen(true)}
        />
      </div>

      {/* Ranks Modal */}
      <RanksModal
        isOpen={isRanksOpen}
        onClose={() => setIsRanksOpen(false)}
        userProfile={userProfile}
      />

      {/* Achievements Modal */}
      <AchievementsModal 
        isOpen={isAchievementsOpen} 
        onClose={() => setIsAchievementsOpen(false)} 
        userProfile={userProfile} 
      />

      {/* Whitepaper Modal */}
      <WhitepaperModal
        isOpen={isWhitepaperOpen}
        onClose={() => setIsWhitepaperOpen(false)}
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
