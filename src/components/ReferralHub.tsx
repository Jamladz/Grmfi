import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Copy, Share2, Gift, X, Loader2, Check, ChevronRight, Award, Coins, Trophy
} from 'lucide-react';
import { REFERRAL_MILESTONES, claimMilestone, getReferredFriends } from '../lib/referrals';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export const ReferralHub: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<{ amount: number } | null>(null);
  
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const inviteCount = userProfile?.referralsCount || 0;
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
          
          // Remove duplicates if any (by id) and sort
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
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const text = `\n\nJoin me on GRMF and get your Welcome Bonus! 🚀`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    if ((window as any).Telegram?.WebApp?.openTelegramLink) {
      (window as any).Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const handleClaim = async (milestone: any) => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId || claimingId) return;
    setClaimingId(milestone.id);
    
    const success = await claimMilestone(targetId, milestone);
    if (success) {
      setSuccessModal({ amount: milestone.rewardCoins });
      // update local state optimistically or rely on snapshot
    } else {
      alert("Failed to claim milestone.");
    }
    setClaimingId(null);
  };

  return (
    <div className="flex flex-col gap-3 pb-24 px-1 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border-[3px] border-white mb-2">
          <Users className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-black text-slate-900">Invite Friends</h1>
        <p className="text-xs text-slate-500 text-center px-4 mt-1">
          Earn 250 GRMF for every friend who joins, and unlock exclusive milestone rewards!
        </p>
      </div>

      {/* Invite Link Card */}
      <div className="bg-white rounded-[20px] p-3 shadow-sm border border-slate-100 mx-2">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Your Invite Link</h3>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 overflow-hidden relative">
            <span className="text-xs font-medium text-slate-700 truncate block w-[90%]">
              {referralLink}
            </span>
          </div>
          <button 
            onClick={handleCopy}
            className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 transition-colors shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <button 
          onClick={handleShare}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-xs"
        >
          <Share2 className="w-4 h-4" /> Share to Telegram
        </button>
      </div>

      {/* Milestones */}
      <div className="mx-2 mt-1">
        <h3 className="text-sm font-black text-slate-900 mb-2 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" /> Milestones
        </h3>
        <div className="flex flex-col gap-2">
          {REFERRAL_MILESTONES.map((ms) => {
            const isClaimed = claimedMilestones.includes(ms.id);
            const isReady = inviteCount >= ms.targetCount;
            const progress = Math.min(100, (inviteCount / ms.targetCount) * 100);

            return (
              <div key={ms.id} className="bg-white rounded-[16px] p-3 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="flex justify-between items-start mb-1 relative z-10">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Invite {ms.targetCount} Friends</span>
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                      <Coins className="w-3 h-3" /> +{ms.rewardCoins.toLocaleString()} GRMF 
                    </span>
                  </div>
                  
                  {isClaimed ? (
                    <div className="px-2.5 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Check className="w-3 h-3" /> Claimed
                    </div>
                  ) : isReady ? (
                    <button 
                      onClick={() => handleClaim(ms)}
                      disabled={claimingId === ms.id}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-[10px] font-black shadow-sm active:scale-95 transition-all flex items-center gap-1"
                    >
                      {claimingId === ms.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Claim'}
                    </button>
                  ) : (
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-700">{inviteCount}</span>
                      <span className="text-[10px] text-slate-400"> / {ms.targetCount}</span>
                    </div>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden z-10 relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isClaimed ? 'bg-slate-300' : isReady ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Friends List */}
      <div className="mx-2 mt-4">
        <h3 className="text-sm font-black text-slate-900 mb-2 flex items-center justify-between">
          <span>Your Friends ({inviteCount})</span>
        </h3>
        
        <div className="bg-white rounded-[16px] shadow-sm border border-slate-100 overflow-hidden">
          {loadingFriends ? (
            <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : friends.length === 0 ? (
            <div className="p-6 text-center flex flex-col items-center justify-center">
              <Users className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-xs font-bold text-slate-500">No friends yet</p>
              <p className="text-[10px] text-slate-400 mt-1">Share your link to get started!</p>
            </div>
          ) : (
            <div className="flex flex-col max-h-[160px] overflow-y-auto no-scrollbar">
              {friends.map((friend) => (
                <div key={friend.id} className="p-3 border-b border-slate-50 flex items-center justify-between last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">
                      👋
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">
                        {friend.referredUsername || 'Telegram User'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(friend.createdAt?.seconds * 1000).toLocaleDateString() || 'Recently'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-emerald-500">+{friend.reward} GRMF</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mx-2 mt-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" /> Weekly Leaderboard
          </h3>
          <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Prize Pool</span>
            <div className="flex items-center gap-0.5">
              <span className="text-xs font-black text-slate-800">300</span>
              <img src="https://i.suar.me/zXrj0/l" alt="GRAM" className="w-3.5 h-3.5 rounded-full" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-[16px] shadow-sm border border-slate-100 overflow-hidden">
          {loadingLeaderboard ? (
            <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : leaderboard.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs font-bold text-slate-500">No data yet</p>
            </div>
          ) : (
            <div className="flex flex-col max-h-[220px] overflow-y-auto no-scrollbar">
              {leaderboard.map((user, index) => {
                const isCurrentUser = user.id === userProfile?.id;
                let reward = 0;
                if (index === 0) reward = 100;
                else if (index === 1) reward = 50;
                else if (index === 2) reward = 30;
                else if (index >= 3 && index <= 9) reward = 10;
                else if (index >= 10 && index <= 19) reward = 5;

                return (
                  <div key={user.id} className={`p-3 border-b border-slate-50 flex items-center justify-between last:border-0 ${isCurrentUser ? 'bg-indigo-50/50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-slate-200 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                        {index + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          {user.username || user.telegramUsername || 'Anonymous'}
                          {isCurrentUser && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[8px] uppercase tracking-wider">You</span>}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500">{user.referralsCount || 0} invites</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center">
                      {reward > 0 && (
                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-[11px] font-black text-slate-700">+{reward}</span>
                          <img src="https://i.suar.me/zXrj0/l" alt="GRAM" className="w-3.5 h-3.5 rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {successModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSuccessModal(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <Gift className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Milestone Reached!</h2>
              <p className="text-sm text-slate-500 mb-6">
                Reward calculated and securely added to your <span className="font-bold text-slate-700">Global Assets</span> profile.
              </p>
              
              <div className="w-full bg-slate-50 rounded-2xl p-4 flex items-center justify-center gap-2 mb-6 border border-slate-100">
                <Coins className="w-6 h-6 text-amber-500" />
                <span className="text-2xl font-black text-amber-600">+{successModal.amount.toLocaleString()} GRMF</span>
              </div>
              
              <button 
                onClick={() => setSuccessModal(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
              >
                Awesome!
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
