import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, CheckCircle2, Lock, Sparkles, Trophy, Users, Wallet, Zap, ShieldCheck, ChevronRight, X, Loader2 } from 'lucide-react';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useTonWallet } from '@tonconnect/ui-react';
import { awardXP } from '../lib/levelSystem';
import { grantReward } from '../lib/rewardsEngine';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  rewardGRMF: number;
  icon: React.ReactNode;
  category: 'social' | 'trading' | 'loyalty';
  currentProgress: number;
  targetProgress: number;
  isUnlocked: boolean;
  isClaimed: boolean;
}

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ 
  isOpen, 
  onClose,
  userProfile 
}) => {
  const wallet = useTonWallet();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [successAchievement, setSuccessAchievement] = useState<Achievement | null>(null);

  if (!isOpen) return null;

  // Extract user metrics from profile
  const inviteCount = userProfile?.inviteCount || (userProfile?.invitedUsers?.length || 0);
  const realGrmf = userProfile?.realBalances?.GRMF || 0;
  const isWalletConnected = !!wallet || !!userProfile?.walletAddress;
  
  // Calculate completed tasks count
  const taskProgress = userProfile?.taskProgress || {};
  const completedTasksCount = Object.values(taskProgress).filter((t: any) => t?.status === 'completed').length;

  // Claimed achievements dictionary
  const claimedMap = userProfile?.claimedAchievements || {};

  // Define achievements list
  const achievementsList: Achievement[] = [
    {
      id: 'welcome',
      title: 'Early Adopter',
      description: 'Create an account on GRMF Fi platform',
      rewardGRMF: 5,
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      category: 'loyalty',
      currentProgress: 1,
      targetProgress: 1,
      isUnlocked: true,
      isClaimed: !!claimedMap['welcome'],
    },
    {
      id: 'wallet_connected',
      title: 'Web3 Pioneer',
      description: 'Connect your TON Wallet to GRMF Fi',
      rewardGRMF: 15,
      icon: <Wallet className="w-5 h-5 text-[#24A1DE]" />,
      category: 'trading',
      currentProgress: isWalletConnected ? 1 : 0,
      targetProgress: 1,
      isUnlocked: isWalletConnected,
      isClaimed: !!claimedMap['wallet_connected'],
    },
    {
      id: 'invite_1',
      title: 'First Companion',
      description: 'Invite 1 friend using your referral link',
      rewardGRMF: 10,
      icon: <Users className="w-5 h-5 text-blue-500" />,
      category: 'social',
      currentProgress: Math.min(inviteCount, 1),
      targetProgress: 1,
      isUnlocked: inviteCount >= 1,
      isClaimed: !!claimedMap['invite_1'],
    },
    {
      id: 'invite_5',
      title: 'Squad Leader',
      description: 'Invite 5 friends using your referral link',
      rewardGRMF: 25,
      icon: <Trophy className="w-5 h-5 text-indigo-500" />,
      category: 'social',
      currentProgress: Math.min(inviteCount, 5),
      targetProgress: 5,
      isUnlocked: inviteCount >= 5,
      isClaimed: !!claimedMap['invite_5'],
    },
    {
      id: 'invite_10',
      title: 'Network Master',
      description: 'Invite 10 friends using your referral link',
      rewardGRMF: 50,
      icon: <Award className="w-5 h-5 text-purple-500" />,
      category: 'social',
      currentProgress: Math.min(inviteCount, 10),
      targetProgress: 10,
      isUnlocked: inviteCount >= 10,
      isClaimed: !!claimedMap['invite_10'],
    },
    {
      id: 'task_master',
      title: 'Task Executor',
      description: 'Complete at least 1 activity task in Earnings',
      rewardGRMF: 10,
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      category: 'loyalty',
      currentProgress: Math.min(completedTasksCount, 1),
      targetProgress: 1,
      isUnlocked: completedTasksCount >= 1,
      isClaimed: !!claimedMap['task_master'],
    },
    {
      id: 'grmf_50',
      title: 'GRMF Collector',
      description: 'Accumulate 50 or more Real GRMF coins',
      rewardGRMF: 20,
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
      category: 'trading',
      currentProgress: Math.min(realGrmf, 50),
      targetProgress: 50,
      isUnlocked: realGrmf >= 50,
      isClaimed: !!claimedMap['grmf_50'],
    },
    {
      id: 'grmf_200',
      title: 'GRMF Whale',
      description: 'Accumulate 200 or more Real GRMF coins',
      rewardGRMF: 100,
      icon: <Award className="w-5 h-5 text-amber-500" />,
      category: 'trading',
      currentProgress: Math.min(realGrmf, 200),
      targetProgress: 200,
      isUnlocked: realGrmf >= 200,
      isClaimed: !!claimedMap['grmf_200'],
    },
  ];

  const unlockedUnclaimedCount = achievementsList.filter(a => a.isUnlocked && !a.isClaimed).length;
  const totalClaimedCount = achievementsList.filter(a => a.isClaimed).length;

  const handleClaim = async (achievement: Achievement) => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId || !achievement.isUnlocked || achievement.isClaimed) return;

    setClaimingId(achievement.id);
    try {
      const res = await grantReward({
        userId: targetId,
        telegramId: userProfile?.telegramId,
        username: userProfile?.username || userProfile?.telegramUsername,
        firstName: userProfile?.firstName,
        source: `achievement_${achievement.id}`,
        amount: achievement.rewardGRMF,
        balanceType: 'both',
        extraUserUpdates: {
          [`claimedAchievements.${achievement.id}`]: true,
          lastActiveAt: serverTimestamp(),
        }
      });

      if (res.success) {
        await awardXP(targetId, 60);
        setSuccessAchievement(achievement);
        // Haptic feedback
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
      }
    } catch (err) {
      console.error('Failed to claim achievement reward:', err);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative border border-slate-100 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-lg tracking-tight">Achievements</h3>
                {unlockedUnclaimedCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                    {unlockedUnclaimedCount} Ready
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">Complete milestones to earn real GRMF</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-black flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overview Bar */}
        <div className="my-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Overall Progress</span>
            <span className="text-lg font-black text-slate-900 font-mono">
              {totalClaimedCount} / {achievementsList.length} Unlocked
            </span>
          </div>
          <div className="w-28 bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-400 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(totalClaimedCount / achievementsList.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Scrollable Achievements List */}
        <div className="overflow-y-auto space-y-3 pr-1 flex-1 no-scrollbar">
          {achievementsList.map((ach) => {
            const isClaiming = claimingId === ach.id;
            const progressPercent = Math.min(100, Math.round((ach.currentProgress / ach.targetProgress) * 100));

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  ach.isClaimed
                    ? 'bg-slate-50/60 border-slate-100 opacity-80'
                    : ach.isUnlocked
                    ? 'bg-gradient-to-r from-amber-50/40 via-white to-emerald-50/40 border-amber-200 shadow-sm'
                    : 'bg-white border-slate-100'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
                    ach.isClaimed
                      ? 'bg-slate-100 border-slate-200 text-slate-400'
                      : ach.isUnlocked
                      ? 'bg-amber-100/80 border-amber-200 text-amber-600 shadow-amber-200/50'
                      : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    {ach.isClaimed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : ach.icon}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-slate-900 truncate tracking-tight">{ach.title}</h4>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">
                        +{ach.rewardGRMF} GRMF
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium line-clamp-1">{ach.description}</p>

                    {/* Progress Bar */}
                    {!ach.isClaimed && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              ach.isUnlocked ? 'bg-emerald-500' : 'bg-blue-400'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-400">
                          {ach.currentProgress}/{ach.targetProgress}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Claim / Status Button */}
                <div className="shrink-0">
                  {ach.isClaimed ? (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider block">
                      Claimed
                    </span>
                  ) : ach.isUnlocked ? (
                    <button
                      disabled={isClaiming}
                      onClick={() => handleClaim(ach)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-[10px] uppercase tracking-wider shadow-md shadow-emerald-500/20 hover:opacity-95 transition-all active:scale-95 flex items-center gap-1.5 animate-pulse"
                    >
                      {isClaiming ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Claiming</span>
                        </>
                      ) : (
                        <span>Claim Reward</span>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-[10px] font-bold">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {successAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-xs w-full text-center shadow-2xl border border-emerald-100"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-emerald-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">Success!</h3>
              <p className="text-sm text-slate-500 font-medium mb-6">
                You've claimed <span className="text-emerald-600 font-bold">{successAchievement.rewardGRMF} GRMF</span> for the <span className="text-slate-900 font-bold">"{successAchievement.title}"</span> achievement!
              </p>
              <button
                onClick={() => setSuccessAchievement(null)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
