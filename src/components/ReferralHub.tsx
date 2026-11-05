import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Copy, Share2, Gift, Loader2, Check, Award, Coins, Trophy
} from 'lucide-react';
import { REFERRAL_MILESTONES, claimMilestone, getReferredFriends } from '../lib/referrals';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { openTelegramLink, triggerHaptic } from '../lib/telegram';

export const ReferralHub: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<{ amount: number } | null>(null);
  
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const inviteCount = Math.max(userProfile?.referralsCount || 0, userProfile?.inviteCount || 0);
  const claimedMilestones: string[] = userProfile?.claimedMilestones || [];
  
  const userId = userProfile?.id || '12345';
  const referralLink = `https://t.me/Grmfdex_bot?startapp=ref_${userId}`;

  useEffect(() => {
    if (userProfile?.id) {
      setLoadingFriends(true);
      getReferredFriends(userProfile.id)
        .then(res => setFriends(res))
        .catch(console.error)
        .finally(() => setLoadingFriends(false));
        
      setLoadingLeaderboard(true);
      const fetchLeaderboard = async () => {
        try {
          const q = query(collection(db, 'users'), orderBy('referralsCount', 'desc'), limit(20));
          const snap = await getDocs(q);
          const realUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          
          const MOCK_LEADERBOARD = [
            { id: 'mock1', username: 'Ahmad_99', referralsCount: 247 },
            { id: 'mock2', username: 'Ivan_77', referralsCount: 185 },
            { id: 'mock3', username: 'Alex_dev', referralsCount: 142 },
            { id: 'mock4', username: 'Misha_crypto', referralsCount: 110 },
            { id: 'mock5', username: 'Omar_DZ', referralsCount: 95 },
            { id: 'mock6', username: 'Sarah_ton', referralsCount: 82 },
            { id: 'mock7', username: 'Dmitry_ton', referralsCount: 70 },
            { id: 'mock8', username: 'Youssef_x', referralsCount: 58 },
            { id: 'mock9', username: 'Crypto_mike', referralsCount: 47 },
            { id: 'mock10', username: 'Elena_99', referralsCount: 39 },
            { id: 'mock11', username: 'Khalid_crypto', referralsCount: 32 },
            { id: 'mock12', username: 'Emily_x', referralsCount: 27 },
            { id: 'mock13', username: 'Igor_x', referralsCount: 22 },
            { id: 'mock14', username: 'Ali_ton', referralsCount: 18 },
            { id: 'mock15', username: 'Sara_95', referralsCount: 15 },
            { id: 'mock16', username: 'John_doe', referralsCount: 12 },
            { id: 'mock17', username: 'Mona_z', referralsCount: 10 },
            { id: 'mock18', username: 'Leo_ton', referralsCount: 8 },
            { id: 'mock19', username: 'Nadia_crypto', referralsCount: 7 },
            { id: 'mock20', username: 'Tarek_99', referralsCount: 6 },
          ];

          const combined = [...realUsers, ...MOCK_LEADERBOARD];
          const uniqueCombined = Array.from(new Map(combined.map(item => [item.id, item])).values());
          uniqueCombined.sort((a, b) => (b.referralsCount || 0) - (a.referralsCount || 0));
          
          setLeaderboard(uniqueCombined.slice(0, 20));
        } catch (error) {
          console.error("Error fetching leaderboard:", error);
        } finally {
          setLoadingLeaderboard(false);
        }
      };
      fetchLeaderboard();
    }
  }, [userProfile?.id]);

  const handleCopy = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const text = `\n\nJoin me on GRMF Fi and claim your Welcome Bonus! 🚀`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    openTelegramLink(shareUrl);
  };

  const handleClaim = async (milestone: any) => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId || claimingId) return;
    triggerHaptic('medium');
    setClaimingId(milestone.id);
    
    const success = await claimMilestone(targetId, milestone);
    if (success) {
      triggerHaptic('success');
      setSuccessModal({ amount: milestone.rewardCoins });
    } else {
      triggerHaptic('error');
    }
    setClaimingId(null);
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Referral Hero & Share Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Invite Friends
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
              Earn <span className="font-mono font-bold text-slate-800">250 GRMF</span> per friend plus milestone rewards
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-[#0088CC] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Link Box */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200/70 overflow-hidden">
            <span className="text-xs font-mono font-medium text-slate-700 truncate block">
              {referralLink}
            </span>
          </div>
          <button 
            onClick={handleCopy}
            aria-label="Copy referral link"
            className="min-h-[40px] min-w-[40px] bg-slate-100 hover:bg-slate-200/80 rounded-xl flex items-center justify-center text-slate-700 transition-colors shrink-0 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <button 
          onClick={handleShare}
          className="w-full min-h-[44px] bg-[#0088CC] hover:bg-[#0077B5] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all text-xs cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Invite on Telegram</span>
        </button>
      </div>

      {/* Milestones Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Referral Milestones</span>
          </h2>
          <span className="text-xs font-mono tabular-nums font-bold text-slate-500">
            {inviteCount} Invited
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {REFERRAL_MILESTONES.map((ms) => {
            const isClaimed = claimedMilestones.includes(ms.id);
            const isReady = inviteCount >= ms.targetCount;
            const progress = Math.min(100, (inviteCount / ms.targetCount) * 100);

            return (
              <div key={ms.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Invite {ms.targetCount} Friends
                    </span>
                    <span className="text-xs font-mono tabular-nums font-bold text-emerald-600">
                      +{ms.rewardCoins.toLocaleString()} GRMF
                    </span>
                  </div>
                  
                  {isClaimed ? (
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Claimed
                    </span>
                  ) : isReady ? (
                    <button 
                      onClick={() => handleClaim(ms)}
                      disabled={claimingId === ms.id}
                      className="min-h-[36px] px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {claimingId === ms.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Claim Reward'}
                    </button>
                  ) : (
                    <span className="text-xs font-mono tabular-nums font-bold text-slate-500">
                      {inviteCount} / {ms.targetCount}
                    </span>
                  )}
                </div>
                
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isClaimed ? 'bg-slate-300' : isReady ? 'bg-amber-500' : 'bg-[#0088CC]'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invited Friends List */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-slate-900">Your Network</h2>
          <span className="text-xs font-mono tabular-nums text-slate-500 font-semibold">{friends.length} joined</span>
        </div>
        
        {loadingFriends ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : friends.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs font-semibold text-slate-500">No friends joined yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Share your invite link above to start earning</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto no-scrollbar">
            {friends.map((friend) => (
              <div key={friend.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {(friend.referredUsername || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {friend.referredUsername || 'Telegram User'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {friend.createdAt?.seconds ? new Date(friend.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono tabular-nums font-bold text-emerald-600">
                  +{friend.reward} GRMF
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Leaderboard */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Top Referrers</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Pool: <strong className="font-mono tabular-nums text-slate-900">300 GRAM</strong>
          </span>
        </div>
        
        {loadingLeaderboard ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : leaderboard.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs font-semibold text-slate-500">No leaderboard data yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto no-scrollbar">
            {leaderboard.map((user, index) => {
              const isCurrentUser = user.id === userProfile?.id;
              let reward = 0;
              if (index === 0) reward = 100;
              else if (index === 1) reward = 50;
              else if (index === 2) reward = 30;
              else if (index >= 3 && index <= 9) reward = 10;
              else if (index >= 10 && index <= 19) reward = 5;

              return (
                <div key={user.id} className={`py-2.5 flex items-center justify-between ${isCurrentUser ? 'bg-sky-50/60 -mx-2 px-2 rounded-xl' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-6 text-center font-mono tabular-nums text-xs font-bold ${
                      index === 0 ? 'text-amber-600' : index === 1 ? 'text-slate-600' : index === 2 ? 'text-orange-600' : 'text-slate-400'
                    }`}>
                      #{index + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{user.username || user.telegramUsername || 'Anonymous'}</span>
                        {isCurrentUser && <span className="text-[10px] font-semibold text-[#0088CC]">(You)</span>}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400">
                        {user.referralsCount || 0} invites
                      </span>
                    </div>
                  </div>
                  {reward > 0 && (
                    <div className="flex items-center gap-1 text-xs font-mono tabular-nums font-bold text-slate-800">
                      <span>+{reward}</span>
                      <img src="https://i.suar.me/zXrj0/l" alt="GRAM" referrerPolicy="no-referrer" className="w-3.5 h-3.5 rounded-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Milestone Claim Modal */}
      <AnimatePresence>
        {successModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setSuccessModal(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              className="relative w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                <Gift className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 mb-1">Milestone Unlocked!</h2>
              <p className="text-xs text-slate-500 mb-5">
                Added directly to your Global Assets balance.
              </p>
              
              <div className="w-full bg-slate-50 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 mb-5 border border-slate-200/60">
                <Coins className="w-5 h-5 text-amber-500" />
                <span className="text-lg font-extrabold font-mono tabular-nums text-slate-900">
                  +{successModal.amount.toLocaleString()} GRMF
                </span>
              </div>
              
              <button 
                onClick={() => setSuccessModal(null)}
                className="w-full min-h-[44px] py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export interface ReferralHubProps {
  userProfile: any;
  onOpenChest?: any;
  onClaimUnclaimed?: any;
}
