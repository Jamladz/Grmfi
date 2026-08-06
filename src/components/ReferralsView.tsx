import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Copy, Share2, Box, Sparkles, Trophy, Gift, ArrowRight, X, Loader2, Star, TrendingUp, Check, UserCheck } from 'lucide-react';
import { TOKENS } from '../data/tokens';

interface Chest {
  id: string;
  name: string;
  requiredInvites: number;
  color: string;
  imageUrl: string;
  rewards: { symbol: string; amount: number; name: string }[];
}

const getIconForSymbol = (symbol: string) => {
  const token = TOKENS.find(t => t.symbol === symbol);
  return token?.iconUrl || '';
};

const CHESTS: Chest[] = [
  {
    id: 'bronze',
    name: 'Bronze Chest',
    requiredInvites: 3,
    color: 'from-amber-600 to-amber-800',
    imageUrl: '/src/assets/images/bronze_chest_1785943907913.jpg',
    rewards: [
      { symbol: 'USDT', amount: 0.5, name: '0.5 USDT' },
      { symbol: 'GRMF', amount: 25, name: '25 GRMF' },
      { symbol: 'GRAM', amount: 0.5, name: '0.5 GRAM' }
    ]
  },
  {
    id: 'silver',
    name: 'Silver Chest',
    requiredInvites: 10,
    color: 'from-slate-300 to-slate-500',
    imageUrl: '/src/assets/images/silver_chest_1785943924192.jpg',
    rewards: [
      { symbol: 'USDT', amount: 1, name: '1 USDT' },
      { symbol: 'GRMF', amount: 100, name: '100 GRMF' },
      { symbol: 'GRAM', amount: 2, name: '2 GRAM' }
    ]
  },
  {
    id: 'gold',
    name: 'Gold Chest',
    requiredInvites: 25,
    color: 'from-yellow-400 to-yellow-600',
    imageUrl: '/src/assets/images/gold_chest_1785943936341.jpg',
    rewards: [
      { symbol: 'USDT', amount: 5, name: '5 USDT' },
      { symbol: 'GRMF', amount: 500, name: '500 GRMF' },
      { symbol: 'GRAM', amount: 5, name: '5 GRAM' }
    ]
  },
  {
    id: 'platinum',
    name: 'Platinum Chest',
    requiredInvites: 50,
    color: 'from-cyan-300 to-cyan-500',
    imageUrl: '/src/assets/images/platinum_chest_1785943946740.jpg',
    rewards: [
      { symbol: 'USDT', amount: 10, name: '10 USDT' },
      { symbol: 'GRMF', amount: 1000, name: '1000 GRMF' },
      { symbol: 'GRAM', amount: 10, name: '10 GRAM' }
    ]
  },
  {
    id: 'legend',
    name: 'Legend Chest',
    requiredInvites: 100,
    color: 'from-purple-500 to-indigo-600',
    imageUrl: '/src/assets/images/legend_chest_1785943959957.jpg',
    rewards: [
      { symbol: 'USDT', amount: 50, name: '50 USDT' },
      { symbol: 'GRMF', amount: 5000, name: '5000 GRMF' },
      { symbol: 'GRAM', amount: 5, name: '5 GRAM' }
    ]
  }
];

interface ReferralsViewProps {
  userProfile: any;
  onOpenChest: (chestId: string, reward: { symbol: string; amount: number }) => Promise<void>;
}

export const ReferralsView: React.FC<ReferralsViewProps> = ({ userProfile, onOpenChest }) => {
  const [selectedChest, setSelectedChest] = useState<Chest | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [wonReward, setWonReward] = useState<{ symbol: string; amount: number; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteCount = userProfile?.inviteCount || 0;
  const openedChests = userProfile?.openedChests || [];
  const referralEarnings = userProfile?.referralEarnings?.GRMF || inviteCount * 30;
  const invitedUsers = userProfile?.invitedUsers || [];

  const tgId = userProfile?.telegramId || userProfile?.id || '12345';
  const referralLink = `https://t.me/Grmfdex_bot?startapp=ref_tg_${tgId}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTelegram = () => {
    const text = `🚀 Join GRMF Fi Mini App on Telegram!\n🎁 Claim +10 GRMF Welcome Bonus using my exclusive link:`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  };

  const handleChestClick = (chest: Chest) => {
    if (openedChests.includes(chest.id)) return;
    setSelectedChest(chest);
  };

  const startOpening = async () => {
    if (!selectedChest || isOpening) return;
    setIsOpening(true);
    
    // Simulate opening animation
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const randomReward = selectedChest.rewards[Math.floor(Math.random() * selectedChest.rewards.length)];
    await onOpenChest(selectedChest.id, { symbol: randomReward.symbol, amount: randomReward.amount });
    
    setWonReward(randomReward);
    setIsOpening(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 p-1"
    >
      {/* Chest Progress Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#24A1DE]" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Chest Milestones</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
            {inviteCount} Referrals
          </span>
        </div>

        <div className="relative pb-8 pt-4">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2" />
          <div 
            className="absolute top-1/2 left-0 h-1 bg-blue-400 -translate-y-1/2 transition-all duration-500"
            style={{ width: `${Math.min(100, (inviteCount / 100) * 100)}%` }}
          />

          <div className="flex justify-between items-center relative z-10">
            {CHESTS.map((chest) => {
              const isUnlocked = inviteCount >= chest.requiredInvites;
              const isOpened = openedChests.includes(chest.id);

              return (
                <div key={chest.id} className="relative flex flex-col items-center">
                  <motion.button
                    whileHover={{ scale: isUnlocked && !isOpened ? 1.1 : 1 }}
                    whileTap={{ scale: isUnlocked && !isOpened ? 0.9 : 1 }}
                    onClick={() => handleChestClick(chest)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all relative overflow-hidden ${
                      isOpened 
                        ? 'bg-slate-50 border-slate-200 grayscale opacity-40' 
                        : isUnlocked 
                          ? `border-white shadow-lg shadow-blue-500/20` 
                          : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <img 
                      src={chest.imageUrl} 
                      alt={chest.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {isUnlocked && !isOpened && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                      </span>
                    )}
                  </motion.button>
                  <div className="absolute top-16 flex flex-col items-center">
                    <span className={`text-[8px] font-black uppercase tracking-tighter whitespace-nowrap ${isUnlocked ? 'text-slate-900' : 'text-slate-400'}`}>
                      {chest.name}
                    </span>
                    <span className="text-[7px] font-bold text-slate-400">
                      {chest.requiredInvites} Ref
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary Referral Hero Card - Compact & Sleek */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#24A1DE] via-blue-500 to-indigo-600" />
        
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 border border-blue-100/60">
            <Users className="w-5 h-5 text-[#24A1DE]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight leading-tight">Refer & Earn GRMF</h2>
            <p className="text-[10px] text-slate-400 font-medium">Invite friends & earn rewards together</p>
          </div>
        </div>
        
        {/* Compact Reward Badges */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 px-2.5 py-1.5 rounded-xl border border-blue-100/80 flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500">You Get</span>
            <span className="text-xs font-black text-[#24A1DE]">+30 GRMF</span>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 px-2.5 py-1.5 rounded-xl border border-emerald-100/80 flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500">Friend Gets</span>
            <span className="text-xs font-black text-emerald-600">+10 GRMF</span>
          </div>
        </div>

        {/* Unique Link Input Box */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100 mb-3">
          <input 
            readOnly 
            value={referralLink}
            className="bg-transparent border-none text-[11px] text-slate-600 font-mono flex-1 focus:ring-0 px-1.5 overflow-ellipsis"
          />
          <button 
            onClick={copyReferral} 
            className="px-2.5 py-1 bg-white rounded-lg text-[#24A1DE] font-bold text-[11px] flex items-center gap-1 transition-all shadow-2xs border border-slate-100 active:scale-95 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Telegram Share Button */}
        <button 
          onClick={shareTelegram}
          className="w-full py-2.5 rounded-xl bg-[#24A1DE] text-white font-black uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 hover:bg-[#2094cc] transition-all shadow-md shadow-blue-500/15 active:scale-[0.98]"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Invite Friends via Telegram</span>
        </button>
      </div>

      {/* Referral Stats Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-xl">
            <UserCheck className="w-5 h-5 text-[#24A1DE]" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total Invites</span>
            <span className="text-lg font-black text-slate-900">{inviteCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 rounded-xl">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Earned GRMF</span>
            <span className="text-lg font-black text-slate-900">+{referralEarnings}</span>
          </div>
        </div>
      </div>

      {/* Invited Friends List */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-[#24A1DE]" />
            Invited Friends ({invitedUsers.length})
          </h3>
          <span className="text-[10px] text-slate-400 font-bold">30 GRMF / friend</span>
        </div>

        {invitedUsers.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
            {invitedUsers.map((friend: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-[#24A1DE] font-black text-xs flex items-center justify-center">
                    {friend.username ? friend.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {friend.username ? `@${friend.username.replace('@', '')}` : 'User'}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {friend.joinedAt ? new Date(friend.joinedAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  +{friend.reward || 30} GRMF
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 font-medium mb-1">No friends invited yet</p>
            <p className="text-[10px] text-slate-400">Share your link to start receiving 30 GRMF for every referral!</p>
          </div>
        )}
      </div>

      {/* Information Card */}
      <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[10px] font-medium text-blue-800 leading-relaxed">
          Open chests to win premium rewards like USDT, GRMF, and GRAM. Higher tiers contain much larger prizes. Legend Chest is the ultimate goal!
        </p>
      </div>

      {/* Chest Details / Open Bottom Drawer */}
      <AnimatePresence>
        {selectedChest && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isOpening && !wonReward && setSelectedChest(null)}
            />
            
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="relative w-full max-w-md bg-white rounded-t-[40px] shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col h-[75dvh]"
            >
              {/* Refined Minimal Handle */}
              <div className="absolute top-0 left-0 right-0 h-10 flex items-start justify-center pt-4 pointer-events-none z-30">
                <div className="w-10 h-1 bg-slate-100 rounded-full" />
              </div>

              {!isOpening && !wonReward && (
                <button 
                  onClick={() => setSelectedChest(null)}
                  className="absolute top-5 right-5 p-2 bg-slate-50/50 backdrop-blur-md border border-slate-100/50 rounded-full text-slate-400 hover:text-slate-900 transition-all z-30 active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <motion.div 
                layout
                className="px-6 pb-8 pt-10"
              >
                <div className="text-center">
                  {/* Optimized Chest Frame */}
                  <motion.div 
                    layout
                    className="w-24 h-24 rounded-[28px] mx-auto flex items-center justify-center shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12)] mb-4 relative overflow-hidden ring-1 ring-slate-100"
                  >
                    {isOpening ? (
                      <motion.div
                        animate={{ 
                          rotate: [0, -4, 4, -4, 4, 0],
                          scale: [1, 1.05, 1, 1.05, 1]
                        }}
                        transition={{ duration: 0.3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-full h-full"
                      >
                        <img 
                          src={selectedChest.imageUrl} 
                          alt={selectedChest.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </motion.div>
                    ) : wonReward ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#24A1DE] to-[#1e88ba] text-white"
                      >
                        <div className="w-16 h-16 rounded-[20px] bg-white shadow-2xl flex items-center justify-center mb-0 overflow-hidden border-2 border-white/30 ring-6 ring-white/10">
                          <img 
                            src={getIconForSymbol(wonReward.symbol)} 
                            alt={wonReward.symbol} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <img 
                        src={selectedChest.imageUrl} 
                        alt={selectedChest.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </motion.div>

                  <motion.div 
                    layout
                    className="max-w-[300px] mx-auto mb-4"
                  >
                    <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tighter">
                      {isOpening ? 'Unlocking Loot' : wonReward ? 'Prize Secured!' : selectedChest.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed opacity-80 uppercase tracking-wider">
                      {isOpening 
                        ? "Connecting to loot pool..." 
                        : wonReward 
                          ? "Success! Your loot has been processed." 
                          : `${selectedChest.requiredInvites} Friends Required`}
                    </p>
                  </motion.div>
                  
                  <motion.div 
                    layout
                    className="space-y-4"
                  >
                    {wonReward ? (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-slate-50 border border-slate-100 p-6 rounded-[32px] flex flex-col items-center shadow-inner relative overflow-hidden"
                      >
                        <p className="text-[8px] text-[#24A1DE] font-black uppercase tracking-[0.4em] mb-3">Inventory Update</p>
                        <div className="flex flex-col items-center gap-2">
                           <div className="w-16 h-16 rounded-[24px] bg-white shadow-2xl border border-slate-50 flex items-center justify-center overflow-hidden ring-[8px] ring-blue-50/50">
                              <img src={getIconForSymbol(wonReward.symbol)} alt={wonReward.symbol} className="w-full h-full object-cover" />
                           </div>
                           <div className="flex flex-col items-center">
                              <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{wonReward.name}</span>
                              <div className="flex items-center gap-1.5 mt-3 text-[#24A1DE] font-black text-[8px] uppercase tracking-widest bg-white px-4 py-1 rounded-full shadow-sm border border-blue-50">
                                 <Sparkles className="w-3 h-3" />
                                 Deposit Success
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                           <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Guaranteed Loot</span>
                           <div className="flex items-center gap-1">
                              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
                              <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">Premium Tier</span>
                           </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedChest.rewards.map((reward, i) => (
                            <motion.div 
                              key={i} 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="group flex flex-col items-center p-3 rounded-2xl bg-white border border-slate-50 transition-all hover:border-blue-100"
                            >
                              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-slate-50 ring-2 ring-slate-50 mb-1.5">
                                <img src={getIconForSymbol(reward.symbol)} alt={reward.symbol} className="w-full h-full object-cover" />
                              </div>
                              <span className="text-[9px] font-black text-slate-900 tracking-tighter text-center leading-none">{reward.name}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      {wonReward ? (
                        <button
                          onClick={() => {
                            setSelectedChest(null);
                            setWonReward(null);
                          }}
                          className="w-full py-4 rounded-[20px] bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-[0.97] hover:bg-black"
                        >
                          Finish Looting
                        </button>
                      ) : (
                        inviteCount >= selectedChest.requiredInvites ? (
                          <button
                            onClick={startOpening}
                            disabled={isOpening}
                            className="w-full py-4 rounded-[20px] bg-[#24A1DE] text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-[0_12px_24px_-8px_rgba(36,161,222,0.4)] active:scale-[0.97] transition-all hover:bg-[#2094cc] relative overflow-hidden"
                          >
                            {isOpening ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Decrypting...</span>
                              </>
                            ) : (
                              <>
                                <Gift className="w-4 h-4" />
                                <span>Unlock Chest</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <button
                              disabled
                              className="w-full py-4 rounded-[20px] bg-slate-50 text-slate-300 font-black uppercase tracking-widest text-[10px] border border-slate-100 flex items-center justify-center gap-2"
                            >
                              <Box className="w-4 h-4" />
                              <span>Chest Locked</span>
                            </button>
                            <div className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-50/30 rounded-xl border border-blue-100/30">
                               <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                  <Users className="w-3 h-3 text-[#24A1DE]" />
                               </div>
                               <div className="flex flex-col items-start">
                                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Locked Status</p>
                                  <p className="text-[8px] text-blue-600 font-bold">{selectedChest.requiredInvites - inviteCount} more recruits needed</p>
                               </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

