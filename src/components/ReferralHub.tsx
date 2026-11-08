import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Copy,
  Share2,
  Gift,
  Loader2,
  Check,
  Award,
  Coins,
  Trophy,
  RefreshCw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import {
  REFERRAL_MILESTONES,
  claimMilestone,
  getReferredFriends,
  STANDARD_REFERRER_REWARD,
  PREMIUM_REFERRER_REWARD
} from '../lib/referrals';
import { auth, db } from '../lib/firebase';
import { collection, query, limit, getDocs, onSnapshot, where } from 'firebase/firestore';
import { openTelegramLink, triggerHaptic, getTelegramUser } from '../lib/telegram';

export interface ReferralHubProps {
  userProfile: any;
  onOpenChest?: any;
  onClaimUnclaimed?: any;
}

export const ReferralHub: React.FC<ReferralHubProps> = ({ userProfile }) => {
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<{ amount: number } | null>(null);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const tgUser = getTelegramUser();
  const canonicalUserId = tgUser?.id
    ? `tg_${tgUser.id}`
    : userProfile?.telegramId
      ? `tg_${userProfile.telegramId}`
      : userProfile?.id || auth.currentUser?.uid || '';

  const referralLink = `https://t.me/Grmfdex_bot?startapp=ref_${canonicalUserId}`;

  const inviteCount = Math.max(
    Number(userProfile?.referralsCount) || 0,
    Number(userProfile?.inviteCount) || 0,
    friends.length
  );

  const earnedFromFriendsList = friends.reduce(
    (sum, f) => sum + (Number(f.reward) || STANDARD_REFERRER_REWARD),
    0
  );
  const totalReferralEarned = Math.max(
    Number(userProfile?.earnedReferralCoins) || 0,
    earnedFromFriendsList,
    inviteCount * STANDARD_REFERRER_REWARD
  );

  const claimedMilestones: string[] = Array.isArray(userProfile?.claimedMilestones)
    ? userProfile.claimedMilestones
    : [];

  const loadNetworkAndLeaderboard = useCallback(async () => {
    if (!canonicalUserId) return;
    setLoadingFriends(true);
    try {
      const list = await getReferredFriends(
        userProfile?.id || canonicalUserId,
        tgUser?.id || userProfile?.telegramId
      );
      setFriends(list);
    } catch (e) {
      console.error('Failed to load referred friends:', e);
    } finally {
      setLoadingFriends(false);
    }

    setLoadingLeaderboard(true);
    try {
      const q = query(collection(db, 'users'), limit(500));
      const snap = await getDocs(q);
      const allUsers = snap.docs
        .map((d) => {
          const data = d.data();
          const count = Math.max(
            Number(data.referralsCount) || 0,
            Number(data.inviteCount) || 0
          );
          const displayName =
            data.fullName ||
            (data.firstName ? `${data.firstName}${data.lastName ? ' ' + data.lastName : ''}`.trim() : '') ||
            data.telegramUsername ||
            data.username ||
            `User #${d.id.slice(-5)}`;
          return {
            id: d.id,
            telegramId: data.telegramId ? String(data.telegramId) : d.id.startsWith('tg_') ? d.id.replace(/^tg_/, '') : null,
            displayName,
            telegramHandle: data.telegramUsername || null,
            photoUrl: data.photoUrl || null,
            referralsCount: count
          };
        })
        .filter((u) => u.referralsCount > 0);

      // Deduplicate by telegramId
      const byKey = new Map<string, any>();
      for (const u of allUsers) {
        const key = u.telegramId ? `tg_${u.telegramId}` : u.id;
        const existing = byKey.get(key);
        if (!existing || u.referralsCount > existing.referralsCount) {
          byKey.set(key, u);
        }
      }

      const sorted = Array.from(byKey.values()).sort(
        (a, b) => b.referralsCount - a.referralsCount
      );
      setLeaderboard(sorted.slice(0, 20));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [canonicalUserId, userProfile?.id, userProfile?.telegramId, tgUser?.id]);

  useEffect(() => {
    loadNetworkAndLeaderboard();

    if (!canonicalUserId) return;
    const numericId = canonicalUserId.replace(/^tg_/, '');
    const candidateIds = Array.from(
      new Set([canonicalUserId, userProfile?.id, numericId].filter(Boolean) as string[])
    );

    const qLive = query(
      collection(db, 'referrals'),
      where('referrerId', 'in', candidateIds)
    );
    const unsub = onSnapshot(
      qLive,
      () => {
        getReferredFriends(
          userProfile?.id || canonicalUserId,
          tgUser?.id || userProfile?.telegramId
        )
          .then((list) => setFriends(list))
          .catch(() => {});
      },
      () => {}
    );

    return () => unsub();
  }, [canonicalUserId, userProfile?.id, userProfile?.telegramId, tgUser?.id, loadNetworkAndLeaderboard]);

  const handleCopy = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    triggerHaptic('medium');
    const text = `Join me on GRMF Fi Mini App! Claim your +100 GRMF Welcome Bonus & start earning on TON 🚀`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    openTelegramLink(shareUrl);
  };

  const handleClaim = async (milestone: any) => {
    const targetId = userProfile?.id || canonicalUserId;
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

  const formatJoinDate = (friend: any) => {
    const ts =
      Number(friend.timestamp) ||
      (friend.createdAt?.toMillis ? friend.createdAt.toMillis() : 0) ||
      (friend.createdAt?.seconds ? friend.createdAt.seconds * 1000 : 0);
    if (!ts) return 'Verified Invite';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Referral Hero & Live Stats Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Invite Friends & Earn
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
              Instant rewards credited automatically when friends open the Mini App
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-[#0088CC] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Live Referral KPI Pair */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-slate-50/90 border border-slate-200/70 rounded-2xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 block">
              Verified Invites
            </span>
            <div className="flex items-baseline gap-1.5 mt-1 font-mono tabular-nums">
              <span className="text-xl font-extrabold text-slate-900">
                {inviteCount.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-400">Friends</span>
            </div>
          </div>

          <div className="bg-slate-50/90 border border-slate-200/70 rounded-2xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 block">
              Referral Earnings
            </span>
            <div className="flex items-baseline gap-1.5 mt-1 font-mono tabular-nums">
              <span className="text-xl font-extrabold text-emerald-600">
                +{totalReferralEarned.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-[#0088CC]">GRMF</span>
            </div>
          </div>
        </div>

        {/* Reward Tiers Breakdown */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-2xl bg-slate-50 px-3 py-2.5 border border-slate-200/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-700 block">Standard Friend</span>
              <span className="text-[10px] text-slate-400 font-medium">Friend gets +100</span>
            </div>
            <span className="text-xs font-mono tabular-nums font-extrabold text-[#0088CC]">
              +{STANDARD_REFERRER_REWARD} GRMF
            </span>
          </div>

          <div className="rounded-2xl bg-amber-50/60 px-3 py-2.5 border border-amber-200/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <span>TG Premium</span>
                <Sparkles className="w-3 h-3 text-amber-500" />
              </span>
              <span className="text-[10px] text-amber-700/80 font-medium">Friend gets +200</span>
            </div>
            <span className="text-xs font-mono tabular-nums font-extrabold text-amber-600">
              +{PREMIUM_REFERRER_REWARD} GRMF
            </span>
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
            className="min-h-[40px] px-3 bg-slate-100 hover:bg-slate-200/80 rounded-xl flex items-center justify-center gap-1.5 text-slate-700 text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
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
                      Invite {ms.targetCount} {ms.targetCount === 1 ? 'Friend' : 'Friends'}
                    </span>
                    <span className="text-xs font-mono tabular-nums font-bold text-emerald-600">
                      +{ms.rewardCoins.toLocaleString()} GRMF
                    </span>
                  </div>

                  {isClaimed ? (
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Claimed
                    </span>
                  ) : isReady ? (
                    <button
                      onClick={() => handleClaim(ms)}
                      disabled={claimingId === ms.id}
                      className="min-h-[36px] px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {claimingId === ms.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Claim Reward'
                      )}
                    </button>
                  ) : (
                    <span className="text-xs font-mono tabular-nums font-bold text-slate-500">
                      {inviteCount} / {ms.targetCount}
                    </span>
                  )}
                </div>

                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isClaimed
                        ? 'bg-emerald-500'
                        : isReady
                          ? 'bg-amber-500'
                          : 'bg-[#0088CC]'
                    }`}
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
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Your Network</h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Friends who joined via your link ({friends.length})
            </p>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              loadNetworkAndLeaderboard();
            }}
            disabled={loadingFriends}
            className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200/70 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            title="Refresh Network"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingFriends ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingFriends && friends.length === 0 ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs font-semibold text-slate-600">No friends joined yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Share your invite link above to earn +{STANDARD_REFERRER_REWARD} GRMF per friend
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto no-scrollbar">
            {friends.map((friend) => {
              const initial = (friend.referredUsername?.replace(/^@/, '')[0] || 'U').toUpperCase();
              return (
                <div key={friend.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {friend.photoUrl ? (
                      <img
                        src={friend.photoUrl}
                        alt={friend.referredUsername}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-2xl object-cover border border-slate-200/80 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center text-xs font-extrabold text-slate-700 border border-slate-200/60 shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {friend.referredUsername || 'Telegram User'}
                        </span>
                        {friend.isPremium && (
                          <span className="text-[10px] font-bold text-amber-500" title="Telegram Premium">
                            ★
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                        {friend.referredTelegramUsername && (
                          <>
                            <span className="text-[#0088CC] font-semibold">
                              @{String(friend.referredTelegramUsername).replace(/^@/, '')}
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <span>{formatJoinDate(friend)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums font-extrabold text-emerald-600 shrink-0">
                    +{friend.reward || STANDARD_REFERRER_REWARD} GRMF
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Top Referrers Leaderboard */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Top Referrers</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Live Ranking
          </span>
        </div>

        {loadingLeaderboard && leaderboard.length === 0 ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs font-semibold text-slate-500">
              Be the first to invite friends and claim the #1 spot!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto no-scrollbar">
            {leaderboard.map((user, index) => {
              const isCurrentUser =
                user.id === userProfile?.id ||
                user.id === canonicalUserId ||
                (user.telegramId && String(user.telegramId) === String(tgUser?.id));

              return (
                <div
                  key={user.id}
                  className={`py-2.5 flex items-center justify-between ${
                    isCurrentUser ? 'bg-sky-50/60 -mx-2 px-2 rounded-xl' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 text-center font-mono tabular-nums text-xs font-bold shrink-0 ${
                        index === 0
                          ? 'text-amber-600'
                          : index === 1
                            ? 'text-slate-600'
                            : index === 2
                              ? 'text-orange-600'
                              : 'text-slate-400'
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                        <span className="truncate">{user.displayName}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-semibold text-[#0088CC] shrink-0">
                            (You)
                          </span>
                        )}
                      </span>
                      {user.telegramHandle && (
                        <button
                          onClick={() => openTelegramLink(`https://t.me/${user.telegramHandle.replace(/^@/, '')}`)}
                          className="text-[11px] text-[#0088CC] hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>@{user.telegramHandle.replace(/^@/, '')}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {user.referralsCount} {user.referralsCount === 1 ? 'Invite' : 'Invites'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600">
                      +{(user.referralsCount * STANDARD_REFERRER_REWARD).toLocaleString()} GRMF
                    </span>
                  </div>
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
              <h2 className="text-base font-extrabold text-slate-900 mb-1">
                Milestone Unlocked!
              </h2>
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
