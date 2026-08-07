import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Copy, 
  Share2, 
  Sparkles, 
  Trophy, 
  Gift, 
  X, 
  Loader2, 
  Star, 
  Check, 
  UserCheck, 
  Zap, 
  ChevronRight,
  HelpCircle,
  Award,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Coins
} from 'lucide-react';
import { TOKENS } from '../data/tokens';

export interface Chest {
  id: string;
  name: string;
  requiredInvites: number;
  color: string;
  badge: string;
  imageUrl: string;
  rewards: { symbol: string; amount: number; name: string }[];
}

const getIconForSymbol = (symbol: string) => {
  const token = TOKENS.find(t => t.symbol === symbol);
  return token?.iconUrl || '';
};

export const CHESTS: Chest[] = [
  {
    id: 'bronze',
    name: 'Bronze Chest',
    requiredInvites: 3,
    color: 'from-amber-600 to-amber-800',
    badge: '3 Invites',
    imageUrl: 'https://i.suar.me/8zY5E/l',
    rewards: [
      { symbol: 'USDT', amount: 0.5, name: '0.5 USDT' },
      { symbol: 'GRMF', amount: 50, name: '50 GRMF' },
      { symbol: 'GRAM', amount: 0.5, name: '0.5 GRAM' }
    ]
  },
  {
    id: 'silver',
    name: 'Silver Chest',
    requiredInvites: 10,
    color: 'from-slate-300 to-slate-500',
    badge: '10 Invites',
    imageUrl: 'https://i.suar.me/Op9LM/l',
    rewards: [
      { symbol: 'USDT', amount: 2, name: '2 USDT' },
      { symbol: 'GRMF', amount: 200, name: '200 GRMF' },
      { symbol: 'GRAM', amount: 2, name: '2 GRAM' }
    ]
  },
  {
    id: 'gold',
    name: 'Gold Chest',
    requiredInvites: 25,
    color: 'from-amber-400 to-yellow-600',
    badge: '25 Invites',
    imageUrl: 'https://i.suar.me/jvnWy/l',
    rewards: [
      { symbol: 'USDT', amount: 10, name: '10 USDT' },
      { symbol: 'GRMF', amount: 1000, name: '1,000 GRMF' },
      { symbol: 'GRAM', amount: 5, name: '5 GRAM' }
    ]
  },
  {
    id: 'platinum',
    name: 'Platinum Chest',
    requiredInvites: 50,
    color: 'from-cyan-400 to-blue-600',
    badge: '50 Invites',
    imageUrl: 'https://i.suar.me/dgPWz/l',
    rewards: [
      { symbol: 'USDT', amount: 25, name: '25 USDT' },
      { symbol: 'GRMF', amount: 2500, name: '2,500 GRMF' },
      { symbol: 'GRAM', amount: 15, name: '15 GRAM' }
    ]
  },
  {
    id: 'legend',
    name: 'Legend Chest',
    requiredInvites: 100,
    color: 'from-purple-600 to-indigo-800',
    badge: '100 Invites',
    imageUrl: 'https://i.suar.me/dgPWz/l',
    rewards: [
      { symbol: 'USDT', amount: 100, name: '100 USDT' },
      { symbol: 'GRMF', amount: 10000, name: '10,000 GRMF' },
      { symbol: 'GRAM', amount: 50, name: '50 GRAM' }
    ]
  }
];

export interface ReferralHubProps {
  userProfile: any;
  onOpenChest: (chestId: string, reward: { symbol: string; amount: number }) => Promise<void>;
  onClaimUnclaimed?: () => Promise<void>;
}

export const ReferralHub: React.FC<ReferralHubProps> = ({ 
  userProfile, 
  onOpenChest,
  onClaimUnclaimed
}) => {
  const [selectedChest, setSelectedChest] = useState<Chest | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [wonReward, setWonReward] = useState<{ symbol: string; amount: number; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'premium'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const inviteCount = userProfile?.inviteCount || 0;
  const openedChests: string[] = userProfile?.openedChests || [];
  const referralEarnings = userProfile?.referralEarnings?.GRMF || 0;
  const invitedUsers: any[] = userProfile?.invitedUsers || [];
  const unclaimedRewards = userProfile?.unclaimedReferralRewards || 0;

  // Determine telegram reference code
  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  const tgId = userProfile?.telegramId || tgUser?.id || userProfile?.uid || '12345';
  const referralLink = `https://t.me/Grmfdex_bot?startapp=ref_tg_${tgId}`;

  // Trigger haptic feedback if available in Telegram WebApp
  const triggerHaptic = (type: 'impact' | 'notification' = 'impact') => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        if (type === 'notification') {
          tg.HapticFeedback.notificationOccurred('success');
        } else {
          tg.HapticFeedback.impactOccurred('medium');
        }
      }
    } catch (e) {
      // Ignore in standard web browser
    }
  };

  const copyReferral = () => {
    triggerHaptic('notification');
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTelegram = () => {
    triggerHaptic('impact');
    const text = `🚀 Join me on GRMF Fi - Telegram's premier DEX Mini App!\n\n🎁 Claim +10 GRMF Welcome Bonus & unlock exclusive mystery rewards using my referral link:`;
    const tg = (window as any).Telegram?.WebApp;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const handleChestClick = (chest: Chest) => {
    triggerHaptic('impact');
    if (openedChests.includes(chest.id)) return;
    setSelectedChest(chest);
    setWonReward(null);
  };

  const startOpening = async () => {
    if (!selectedChest || isOpening) return;
    setIsOpening(true);
    triggerHaptic('impact');
    
    // Simulate interactive loot decrypting animation
    await new Promise(resolve => setTimeout(resolve, 2200));
    
    // Select reward randomly
    const randomReward = selectedChest.rewards[Math.floor(Math.random() * selectedChest.rewards.length)];
    
    try {
      await onOpenChest(selectedChest.id, { symbol: randomReward.symbol, amount: randomReward.amount });
      triggerHaptic('notification');
      setWonReward(randomReward);
    } catch (err) {
      console.error("Chest open error:", err);
    } finally {
      setIsOpening(false);
    }
  };

  const handleClaim = async () => {
    if (!onClaimUnclaimed || isClaiming || unclaimedRewards <= 0) return;
    setIsClaiming(true);
    triggerHaptic('notification');
    try {
      await onClaimUnclaimed();
    } catch (err) {
      console.error("Claim error:", err);
    } finally {
      setIsClaiming(false);
    }
  };

  const filteredFriends = invitedUsers.filter(friend => {
    const matchesSearch = !searchQuery || (friend.username && friend.username.toLowerCase().includes(searchQuery.toLowerCase()));
    if (activeTab === 'premium') {
      return matchesSearch && friend.isPremium;
    }
    return matchesSearch;
  });

  const nextChest = CHESTS.find(c => inviteCount < c.requiredInvites);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 pb-10 px-0.5 max-w-md mx-auto"
    >
      {/* Hero Stats Card */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-4 sm:p-5 text-white overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl -z-0 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl -z-0 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Referral Program</span>
            </div>

            <button 
              onClick={() => setShowHowItWorks(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/15 text-[9px] font-bold text-slate-300 backdrop-blur-md transition-all border border-white/10 active:scale-95"
            >
              <HelpCircle className="w-3 h-3 text-blue-400" />
              <span>How it works</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-md">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Friends</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white tracking-tight">{inviteCount}</span>
                <span className="text-[9px] text-emerald-400 font-bold">invited</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-md">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Earned</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-amber-400 tracking-tight">+{referralEarnings.toLocaleString()}</span>
                <span className="text-[9px] text-amber-300 font-black">GRMF</span>
              </div>
            </div>
          </div>

          {/* Unclaimed Rewards Banner */}
          {unclaimedRewards > 0 && (
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 rounded-xl p-2.5 mb-3 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-amber-200 uppercase tracking-wider block">Unclaimed Rewards</span>
                  <span className="text-sm font-black text-white">+{unclaimedRewards} GRMF</span>
                </div>
              </div>

              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1"
              >
                {isClaiming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>Claim</span>
              </button>
            </div>
          )}

          {/* Share CTA */}
          <div className="flex items-center gap-2">
            <button 
              onClick={shareTelegram}
              className="flex-1 py-2.5 px-3 bg-[#24A1DE] hover:bg-[#1f93cc] text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite Friends</span>
            </button>

            <button
              onClick={copyReferral}
              className="py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/10 transition-all active:scale-95 flex items-center justify-center"
              title="Copy referral link"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Rewards Structure Badges */}
      <div className="grid grid-cols-2 gap-2">
        {/* Standard Referral */}
        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Regular
              </span>
            </div>
            <h4 className="text-[11px] font-black text-slate-900 mb-0.5">Regular Friend</h4>
            <p className="text-[9px] text-slate-400 font-medium leading-tight">Standard Telegram account</p>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-bold">Bonus</span>
            <span className="text-[11px] font-black text-blue-600">+30 / +10 GRMF</span>
          </div>
        </div>

        {/* Telegram Premium Referral */}
        <div className="bg-gradient-to-br from-amber-500/5 to-purple-500/5 bg-white rounded-xl p-3 border border-amber-200/60 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-amber-400/10 rounded-full blur-lg pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                ⭐ Premium
              </span>
            </div>
            <h4 className="text-[11px] font-black text-slate-900 mb-0.5">Premium Friend</h4>
            <p className="text-[9px] text-slate-400 font-medium leading-tight">Telegram Premium account</p>
          </div>

          <div className="mt-2 pt-2 border-t border-amber-100/60 flex items-center justify-between">
            <span className="text-[9px] text-amber-700 font-bold">Bonus</span>
            <span className="text-[11px] font-black text-amber-600">+100 / +50 GRMF</span>
          </div>
        </div>
      </div>

      {/* Milestone Mystery Chests Progress Track */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs overflow-hidden">
        <div className="flex justify-between items-center mb-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Gift className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Milestone Chests</h3>
              <p className="text-[9px] text-slate-400 font-medium">Unlock mystery reward boxes</p>
            </div>
          </div>

          {nextChest && (
            <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              Next: {nextChest.requiredInvites - inviteCount} left
            </span>
          )}
        </div>

        {/* Chest Cards Grid */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {CHESTS.map((chest) => {
            const isUnlocked = inviteCount >= chest.requiredInvites;
            const isOpened = openedChests.includes(chest.id);

            return (
              <div key={chest.id} className="flex flex-col items-center">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleChestClick(chest)}
                  className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center p-1 border transition-all relative overflow-hidden ${
                    isOpened 
                      ? 'bg-slate-50 border-slate-200 opacity-50 grayscale' 
                      : isUnlocked 
                        ? 'bg-gradient-to-b from-amber-50 to-orange-50 border-amber-400 shadow-xs ring-1 ring-amber-300/50' 
                        : 'bg-slate-50/80 border-slate-100'
                  }`}
                >
                  <div className="w-7 h-7 relative mb-0.5 flex items-center justify-center">
                    <img 
                      src={chest.imageUrl} 
                      alt={chest.name} 
                      className="w-full h-full object-contain filter drop-shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    {isOpened && (
                      <div className="absolute inset-0 bg-slate-900/40 rounded-md flex items-center justify-center">
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {isUnlocked && !isOpened && (
                    <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}

                  <span className={`text-[8px] font-black tracking-tighter leading-none ${
                    isUnlocked && !isOpened ? 'text-amber-800' : 'text-slate-500'
                  }`}>
                    {chest.requiredInvites} Ref
                  </span>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invited Friends List */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs">
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Invited Friends ({invitedUsers.length})</span>
            </h3>

            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-[9px] font-bold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('premium')}
                className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-0.5 ${
                  activeTab === 'premium' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                <Star className="w-2.5 h-2.5 fill-amber-500" />
                <span>Premium</span>
              </button>
            </div>
          </div>

          {/* Search bar if many friends */}
          {invitedUsers.length > 3 && (
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search friend..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          )}
        </div>

        {filteredFriends.length > 0 ? (
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 no-scrollbar">
            {filteredFriends.map((friend, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${
                    friend.isPremium 
                      ? 'bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 shadow-xs' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {friend.username ? friend.username.charAt(0).toUpperCase() : 'U'}
                  </div>

                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-slate-900">
                        {friend.username ? `@${friend.username.replace('@', '')}` : 'Telegram User'}
                      </span>
                      {friend.isPremium && (
                        <span className="px-1 py-0.2 bg-amber-100 text-amber-800 text-[7px] font-black rounded-full flex items-center gap-0.5">
                          <Star className="w-2 h-2 fill-amber-600" />
                          PREMIUM
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] text-slate-400 font-medium">
                      Joined {friend.joinedAt ? new Date(friend.joinedAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                  +{friend.reward || (friend.isPremium ? 100 : 30)} GRMF
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 px-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-1.5">
              <Users className="w-4 h-4" />
            </div>
            <h4 className="text-[11px] font-bold text-slate-700 mb-0.5">No friends found</h4>
            <p className="text-[9px] text-slate-400 max-w-[200px] mb-3 leading-tight">
              Share your link with your Telegram contacts to start earning rewards.
            </p>
            <button
              onClick={shareTelegram}
              className="px-3 py-1.5 bg-[#24A1DE] text-white font-black text-[11px] rounded-lg shadow-sm active:scale-95 flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" />
              <span>Share Link</span>
            </button>
          </div>
        )}
      </div>

      {/* Chest Opening Modal Drawer */}
      <AnimatePresence>
        {selectedChest && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
              onClick={() => !isOpening && setSelectedChest(null)}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-t-[40px] p-6 pb-10 text-center shadow-2xl overflow-hidden border-t border-slate-100 z-10"
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />

              {!isOpening && (
                <button
                  onClick={() => setSelectedChest(null)}
                  className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 active:scale-90 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="flex flex-col items-center">
                {/* Animated Chest Box Graphic */}
                <div className="relative w-28 h-28 mb-4 flex items-center justify-center">
                  <motion.div
                    animate={isOpening ? {
                      scale: [1, 1.15, 0.95, 1.1, 1],
                      rotate: [0, -5, 5, -5, 0]
                    } : { y: [0, -6, 0] }}
                    transition={isOpening ? { repeat: Infinity, duration: 0.4 } : { repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="w-full h-full"
                  >
                    <img 
                      src={selectedChest.imageUrl} 
                      alt={selectedChest.name}
                      className="w-full h-full object-contain filter drop-shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>

                  {isOpening && (
                    <motion.div 
                      animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.3, 0.9, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                      className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl pointer-events-none"
                    />
                  )}
                </div>

                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">
                  {selectedChest.name}
                </h3>
                <p className="text-xs text-slate-400 font-medium mb-6">
                  Requires <span className="font-bold text-slate-800">{selectedChest.requiredInvites} invited friends</span>
                </p>

                {/* Won Reward Result Screen */}
                {wonReward ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200/80 p-6 rounded-3xl mb-6 relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[8px] uppercase tracking-widest rounded-full">
                      CLAIMED
                    </div>

                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block mb-3">
                      🎉 Prize Unlocked
                    </span>

                    <div className="flex items-center justify-center gap-3">
                      {getIconForSymbol(wonReward.symbol) && (
                        <div className="w-12 h-12 rounded-full bg-white shadow-md border-2 border-amber-300 p-1 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-amber-400/20">
                          <img src={getIconForSymbol(wonReward.symbol)} alt={wonReward.symbol} className="w-full h-full object-cover rounded-full" />
                        </div>
                      )}
                      <div className="text-left">
                        <span className="text-2xl font-black text-slate-900 tracking-tight leading-none block">
                          {wonReward.name}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold">Credited to your balance</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* Rewards Preview List */
                  <div className="w-full bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                      Possible Loot
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      {selectedChest.rewards.map((r, i) => (
                        <div key={i} className="bg-white p-2.5 rounded-2xl border border-slate-100 flex flex-col items-center">
                          {getIconForSymbol(r.symbol) && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 p-0.5 flex items-center justify-center mb-1 overflow-hidden shrink-0">
                              <img src={getIconForSymbol(r.symbol)} alt={r.symbol} className="w-full h-full object-cover rounded-full" />
                            </div>
                          )}
                          <span className="text-[10px] font-black text-slate-900">{r.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open Action Button */}
                {wonReward ? (
                  <button
                    onClick={() => {
                      setSelectedChest(null);
                      setWonReward(null);
                    }}
                    className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                  >
                    Done
                  </button>
                ) : (
                  inviteCount >= selectedChest.requiredInvites ? (
                    <button
                      onClick={startOpening}
                      disabled={isOpening}
                      className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-400/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {isOpening ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Decrypting Loot Box...</span>
                        </>
                      ) : (
                        <>
                          <Gift className="w-4 h-4" />
                          <span>Unlock Chest Now</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full">
                      <button
                        disabled
                        className="w-full py-4 rounded-2xl bg-slate-100 text-slate-400 font-black text-xs uppercase tracking-wider mb-2 cursor-not-allowed"
                      >
                        Chest Locked
                      </button>
                      <p className="text-[10px] text-amber-700 font-bold bg-amber-50 py-1.5 px-3 rounded-xl border border-amber-100 inline-block">
                        Need {selectedChest.requiredInvites - inviteCount} more recruits to unlock
                      </p>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* How it works modal */}
      <AnimatePresence>
        {showHowItWorks && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
              onClick={() => setShowHowItWorks(false)}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-900">How Referrals Work</h3>
                <button 
                  onClick={() => setShowHowItWorks(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Share your invite link</h5>
                    <p className="text-[10px] text-slate-500">Send your referral link to friends on Telegram or social media.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Friends join GRMF Fi</h5>
                    <p className="text-[10px] text-slate-500">Your friends open the Telegram Mini App and claim their starter bonus.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Get Instant GRMF & Mystery Chests</h5>
                    <p className="text-[10px] text-slate-500">
                      Earn +30 GRMF (or +100 for Telegram Premium users) plus milestone chests containing USDT and GRAM!
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowHowItWorks(false)}
                className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
