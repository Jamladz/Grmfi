import { doc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface LevelRank {
  level: number;
  name: string;
  nameAr: string;
  minXp: number;
  maxXp: number;
  badgeIcon: string;
  imageUrl?: string;
  color: string;
  badgeBg: string;
  textColor: string;
  description: string;
}

export const LEVEL_RANKS: LevelRank[] = [
  {
    level: 1,
    name: "Poor",
    nameAr: "فقير",
    minXp: 0,
    maxXp: 100,
    badgeIcon: "🪵",
    imageUrl: "https://i.suar.me/jvn9x/l",
    color: "from-slate-400 to-slate-600",
    badgeBg: "bg-slate-100 border-slate-300 text-slate-700",
    textColor: "text-slate-600",
    description: "Starting your financial journey from scratch."
  },
  {
    level: 2,
    name: "Struggler",
    nameAr: "كادح",
    minXp: 100,
    maxXp: 250,
    badgeIcon: "🥉",
    imageUrl: "https://i.suar.me/dgPj1/l",
    color: "from-amber-600 to-amber-800",
    badgeBg: "bg-amber-100 border-amber-300 text-amber-800",
    textColor: "text-amber-700",
    description: "Working hard every day to build initial capital."
  },
  {
    level: 3,
    name: "Worker",
    nameAr: "عامل",
    minXp: 250,
    maxXp: 500,
    badgeIcon: "⚙️",
    imageUrl: "https://i.suar.me/8zYaV/l",
    color: "from-orange-500 to-amber-600",
    badgeBg: "bg-orange-100 border-orange-300 text-orange-800",
    textColor: "text-orange-700",
    description: "Consistently completing tasks and building steady habits."
  },
  {
    level: 4,
    name: "Saver",
    nameAr: "مدخر",
    minXp: 500,
    maxXp: 1000,
    badgeIcon: "🥈",
    imageUrl: "https://i.suar.me/LpwLx/l",
    color: "from-slate-300 to-slate-500",
    badgeBg: "bg-slate-200 border-slate-400 text-slate-800",
    textColor: "text-slate-700",
    description: "Accumulating savings and securing financial stability."
  },
  {
    level: 5,
    name: "Trader",
    nameAr: "تاجر",
    minXp: 1000,
    maxXp: 2000,
    badgeIcon: "🥇",
    imageUrl: "https://i.suar.me/2z7JW/l",
    color: "from-yellow-400 to-amber-500",
    badgeBg: "bg-yellow-100 border-yellow-400 text-yellow-900",
    textColor: "text-amber-600",
    description: "Actively exchanging tokens and mastering market dynamics."
  },
  {
    level: 6,
    name: "Investor",
    nameAr: "مستثمر",
    minXp: 2000,
    maxXp: 4000,
    badgeIcon: "💎",
    imageUrl: "https://i.suar.me/lZBa0/l",
    color: "from-emerald-400 to-teal-600",
    badgeBg: "bg-emerald-100 border-emerald-300 text-emerald-800",
    textColor: "text-emerald-600",
    description: "Growing wealth strategically through smart asset placement."
  },
  {
    level: 7,
    name: "Businessman",
    nameAr: "رجل أعمال",
    minXp: 4000,
    maxXp: 7000,
    badgeIcon: "👑",
    imageUrl: "https://i.suar.me/a9Xe9/l",
    color: "from-rose-500 to-red-600",
    badgeBg: "bg-rose-100 border-rose-300 text-rose-800",
    textColor: "text-rose-600",
    description: "Managing vast networks and leading community growth."
  },
  {
    level: 8,
    name: "Baron",
    nameAr: "بارون",
    minXp: 7000,
    maxXp: 12000,
    badgeIcon: "🛡️",
    color: "from-cyan-400 to-blue-600",
    badgeBg: "bg-cyan-100 border-cyan-300 text-cyan-900",
    textColor: "text-cyan-600",
    description: "Commanding substantial assets with elite status."
  },
  {
    level: 9,
    name: "Tycoon",
    nameAr: "تايكون",
    minXp: 12000,
    maxXp: 20000,
    badgeIcon: "⚡",
    color: "from-purple-500 to-indigo-600",
    badgeBg: "bg-purple-100 border-purple-300 text-purple-900",
    textColor: "text-purple-600",
    description: "A dominant force in the decentralized ecosystem."
  },
  {
    level: 10,
    name: "Master of Wealth",
    nameAr: "سيد الثراء",
    minXp: 20000,
    maxXp: 20000,
    badgeIcon: "🌟",
    color: "from-amber-400 via-purple-500 to-indigo-600",
    badgeBg: "bg-gradient-to-r from-amber-100 via-purple-100 to-indigo-100 border-amber-300 text-indigo-950",
    textColor: "text-amber-600 font-black",
    description: "Reached the pinnacle of financial power and ultimate prestige."
  }
];

export function getUserTotalXp(userProfile: any): number {
  if (!userProfile) return 0;
  
  const explicitXp = typeof userProfile.xp === 'number' ? userProfile.xp : 0;
  
  // Calculate activity-derived XP for smooth baseline progression
  const inviteCount = userProfile?.inviteCount || (userProfile?.invitedUsers?.length || 0);
  const taskProgress = userProfile?.taskProgress || {};
  const completedTasksCount = Object.values(taskProgress).filter((t: any) => t?.status === 'completed').length;
  const claimedAchievementsCount = Object.keys(userProfile?.claimedAchievements || {}).length;

  const activityXp = (inviteCount * 100) + (completedTasksCount * 40) + (claimedAchievementsCount * 60);

  return explicitXp + activityXp;
}

export function getUserLevelInfo(totalXp: number) {
  let currentRank = LEVEL_RANKS[0];

  for (let i = LEVEL_RANKS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_RANKS[i].minXp) {
      currentRank = LEVEL_RANKS[i];
      break;
    }
  }

  const nextRank = LEVEL_RANKS.find(r => r.level === currentRank.level + 1) || currentRank;
  const isMaxLevel = currentRank.level === LEVEL_RANKS[LEVEL_RANKS.length - 1].level;

  let progressPercentage = 100;
  let xpCurrentLevel = totalXp - currentRank.minXp;
  let xpNeededForNext = nextRank.minXp - currentRank.minXp;

  if (!isMaxLevel && xpNeededForNext > 0) {
    progressPercentage = Math.min(100, Math.max(0, (xpCurrentLevel / xpNeededForNext) * 100));
  }

  return {
    totalXp,
    currentRank,
    nextRank,
    isMaxLevel,
    progressPercentage,
    xpCurrentLevel,
    xpNeededForNext,
  };
}

export async function awardXP(userId?: string, amount: number = 20) {
  const targetId = userId || auth.currentUser?.uid;
  if (!targetId) return;

  const userRef = doc(db, 'users', targetId);
  try {
    await setDoc(userRef, {
      xp: increment(amount)
    }, { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded')) {
      try {
        const cached = localStorage.getItem('grmf_cached_profile');
        if (cached) {
          const profile = JSON.parse(cached);
          profile.xp = (profile.xp || 0) + amount;
          localStorage.setItem('grmf_cached_profile', JSON.stringify(profile));
        }
      } catch (e) {}
      return;
    }
    try {
      await updateDoc(userRef, {
        xp: increment(amount)
      });
    } catch (e) {
      console.warn("Error awarding XP (handled):", e);
    }
  }
}
