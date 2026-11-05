import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Shield, Wallet, ChevronRight, Trophy, Zap, Star, FileText } from 'lucide-react';
import { TOKENS } from '../data/tokens';
import { AchievementsModal } from './AchievementsModal';
import { RanksModal } from './RanksModal';
import { WhitepaperModal } from './WhitepaperModal';
import { HomeScreenShortcutMenuItem } from './HomeScreenShortcutMenuItem';
import { getUserTotalXp, getUserLevelInfo } from '../lib/levelSystem';
import { triggerHaptic } from '../lib/telegram';

interface ProfileViewProps {
  balances: Record<string, number>;
  userProfile: any;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ balances, userProfile, isAdmin, onOpenAdmin }) => {
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isRanksOpen, setIsRanksOpen] = useState(false);
  const [isWhitepaperOpen, setIsWhitepaperOpen] = useState(false);

  const rawUsername = userProfile?.username || userProfile?.telegramUsername || 'user';
  const displayUsername = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;

  const displayedTokens = ['GRMF', 'GRAM', 'USDT', 'NOT', 'DOGS', 'HMSTR']
    .map(symbol => TOKENS.find(t => t.symbol === symbol))
    .filter(Boolean) as typeof TOKENS;

  const realBalances = userProfile?.realBalances || { GRMF: 0 };

  const totalXp = getUserTotalXp(userProfile);
  const levelInfo = getUserLevelInfo(totalXp);
  const { currentRank, nextRank, isMaxLevel, progressPercentage, xpCurrentLevel, xpNeededForNext } = levelInfo;

  const inviteCount = Math.max(userProfile?.referralsCount || 0, userProfile?.inviteCount || 0, userProfile?.invitedUsers?.length || 0);
  const realGrmf = userProfile?.realBalances?.GRMF || 0;
  const taskProgress = userProfile?.taskProgress || {};
  const completedTasksCount = Object.values(taskProgress).filter((t: any) => t?.status === 'completed' || t?.status === 'claimed').length;
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 pb-8"
    >
      {/* Profile Identity Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200/80">
            {userProfile?.photoUrl ? (
              <img src={userProfile.photoUrl} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-[#0088CC]" />
            )}
          </div>
          {currentRank.imageUrl && (
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white rounded-full p-0.5 shadow-sm border border-slate-100 flex items-center justify-center">
              <img src={currentRank.imageUrl} alt={currentRank.name} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight truncate">
            {displayUsername}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Level {currentRank.level}</span>
            <span className="text-slate-300">·</span>
            <span>{currentRank.name}</span>
            <span className="text-slate-300">·</span>
            <span className="font-mono tabular-nums text-[#0088CC] font-bold">{totalXp.toLocaleString()} XP</span>
          </p>
        </div>
      </div>

      {/* Rank & XP Progression Card */}
      <div 
        onClick={() => {
          triggerHaptic('light');
          setIsRanksOpen(true);
        }}
        className="bg-slate-900 text-white rounded-3xl p-5 shadow-md cursor-pointer hover:bg-slate-900/95 transition-all group active:scale-[0.99]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {currentRank.imageUrl ? (
              <img src={currentRank.imageUrl} alt={currentRank.name} referrerPolicy="no-referrer" className="w-9 h-9 object-contain shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-base shrink-0">
                {currentRank.badgeIcon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-400">
                  Level {currentRank.level} · {currentRank.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                {currentRank.description}
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        <div className="space-y-1.5">
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${currentRank.color}`}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Next: {nextRank.name}</span>
            </span>
            <span className="font-mono tabular-nums text-slate-300">
              {isMaxLevel ? 'Max Level Reached' : `${xpCurrentLevel.toLocaleString()} / ${xpNeededForNext.toLocaleString()} XP`}
            </span>
          </div>
        </div>
      </div>

      {/* Unified Global Assets Ledger */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-extrabold text-slate-900">Portfolio Balances</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Mainnet & Testnet</span>
        </div>

        <div className="divide-y divide-slate-100">
          {displayedTokens.map(token => {
            const realVal = realBalances[token.symbol] || 0;
            const betaVal = balances[token.symbol] || 0;
            const balance = Math.max(realVal, betaVal);
            const value = (balance * (token.priceUsd || 0)).toFixed(2);

            return (
              <div key={token.id} className="py-3 first:pt-1 last:pb-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border border-slate-200/60 shrink-0 ${token.iconBg}`}>
                    {token.iconUrl ? (
                      <img src={token.iconUrl} alt={token.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-xs">{token.symbol[0]}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-900 font-bold text-xs block">{token.name}</span>
                    <span className="text-slate-400 text-[11px] font-medium">{token.symbol}</span>
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <span className="text-slate-900 font-extrabold text-xs block">{balance.toLocaleString()}</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    ${value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grouped Navigation Menu */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        <HomeScreenShortcutMenuItem />
        <MenuRow 
          icon={<Star className="w-4 h-4 text-amber-500" />} 
          label="Wealth Tiers & Ranks" 
          meta={`Level ${currentRank.level}`}
          onClick={() => {
            triggerHaptic('light');
            setIsRanksOpen(true);
          }}
        />
        <MenuRow 
          icon={<Trophy className="w-4 h-4 text-[#0088CC]" />} 
          label="Achievements" 
          meta={readyCount > 0 ? `${readyCount} Claimable` : 'Milestones'}
          highlightMeta={readyCount > 0}
          onClick={() => {
            triggerHaptic('light');
            setIsAchievementsOpen(true);
          }}
        />
        <MenuRow 
          icon={<FileText className="w-4 h-4 text-indigo-500" />} 
          label="Protocol Whitepaper" 
          meta="v2.4"
          onClick={() => {
            triggerHaptic('light');
            setIsWhitepaperOpen(true);
          }}
        />
        {isAdmin && (
          <MenuRow 
            icon={<Shield className="w-4 h-4 text-rose-500" />} 
            label="Admin Console" 
            meta="System Owner"
            onClick={() => {
              triggerHaptic('light');
              onOpenAdmin?.();
            }}
          />
        )}
      </div>

      <RanksModal
        isOpen={isRanksOpen}
        onClose={() => setIsRanksOpen(false)}
        userProfile={userProfile}
      />

      <AchievementsModal 
        isOpen={isAchievementsOpen} 
        onClose={() => setIsAchievementsOpen(false)} 
        userProfile={userProfile} 
      />

      <WhitepaperModal
        isOpen={isWhitepaperOpen}
        onClose={() => setIsWhitepaperOpen(false)}
      />
    </motion.div>
  );
};

const MenuRow = ({ icon, label, meta, highlightMeta, onClick }: { icon: React.ReactNode, label: string, meta?: string, highlightMeta?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="min-h-[52px] flex items-center justify-between px-5 py-3.5 bg-white hover:bg-slate-50/80 transition-colors cursor-pointer w-full text-left"
  >
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="text-xs font-bold text-slate-900">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {meta && (
        <span className={`text-xs font-semibold ${highlightMeta ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
          {meta}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-slate-300" />
    </div>
  </button>
);
