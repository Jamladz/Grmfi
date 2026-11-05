import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Sparkles, 
  Gift, 
  Smartphone, 
  Flame, 
  Coins, 
  ArrowRight,
  ExternalLink,
  PartyPopper,
  Clock,
  RefreshCw
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { grantReward } from '../lib/rewardsEngine';
import { useHomeScreenShortcut } from '../hooks/useHomeScreenShortcut';
import { serverTimestamp } from 'firebase/firestore';
import { openTelegramLink, triggerHaptic } from '../lib/telegram';

interface TasksViewProps {
  userProfile: any;
  setActiveView: (view: any) => void;
  onSelectSwapPair?: (toSymbol: string) => void;
}

const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // Exact 24 hours in milliseconds

function sanitizeTimestamp(val: any, now: number): number {
  if (typeof val !== 'number' || isNaN(val) || val <= 0) return 0;
  let ts = val;
  while (ts > now + 60000) {
    ts = Math.floor(ts / 2);
  }
  return ts;
}

function getCooldownState(rawTimestamp: any, now: number) {
  const completedAt = sanitizeTimestamp(rawTimestamp, now);
  if (!completedAt) {
    return {
      isCooldown: false,
      remainingMs: 0,
      progressPct: 100,
      formatted: '00:00:00'
    };
  }

  const elapsed = now - completedAt;
  if (elapsed >= DAILY_COOLDOWN_MS) {
    return {
      isCooldown: false,
      remainingMs: 0,
      progressPct: 100,
      formatted: '00:00:00'
    };
  }

  const remainingMs = Math.max(0, DAILY_COOLDOWN_MS - elapsed);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPct = Math.min(100, Math.max(3, (elapsed / DAILY_COOLDOWN_MS) * 100));

  return {
    isCooldown: true,
    remainingMs,
    progressPct,
    formatted
  };
}

export const TasksView: React.FC<TasksViewProps> = ({
  userProfile,
  setActiveView,
  onSelectSwapPair
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'daily' | 'special'>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<{ title: string; amount: number; subtitle?: string } | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  
  const { status: shortcutStatus, addToHomeScreen } = useHomeScreenShortcut();

  // Live 1-second precision clock for all 24h task timers
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const taskProgress = userProfile?.taskProgress || {};

  // Daily Login & Mystery Box 24h states
  const loginEntry = taskProgress['daily_login'] || {};
  const boxEntry = taskProgress['mystery_box'] || {};

  const loginCooldown = getCooldownState(loginEntry.claimedAt || loginEntry.completedAt, now);
  const boxCooldown = getCooldownState(boxEntry.claimedAt || boxEntry.completedAt, now);

  // Calculate active streak count (resets if more than 48h since last check-in)
  const rawStreak = typeof loginEntry.streak === 'number' && loginEntry.streak > 0 ? loginEntry.streak : 0;
  const lastLoginTs = sanitizeTimestamp(loginEntry.claimedAt || loginEntry.completedAt, now);
  const activeStreak = lastLoginTs > 0 && (now - lastLoginTs) < (DAILY_COOLDOWN_MS * 2) ? Math.max(1, rawStreak) : 0;

  // One-time special tasks
  const shortcutTaskCompleted = taskProgress['shortcut_tg']?.status === 'completed';
  const tgChannelCompleted = taskProgress['tg_channel']?.status === 'completed';

  const swapTasks = [
    { id: 'swap_grmf_gram', symbol: 'GRAM', label: 'Daily Swap: GRMF → GRAM', reward: 50, xp: 20 },
    { id: 'swap_grmf_usdt', symbol: 'USDT', label: 'Daily Swap: GRMF → USDT', reward: 50, xp: 20 },
    { id: 'swap_grmf_not', symbol: 'NOT', label: 'Daily Swap: GRMF → NOT', reward: 50, xp: 20 },
    { id: 'swap_grmf_dogs', symbol: 'DOGS', label: 'Daily Swap: GRMF → DOGS', reward: 50, xp: 20 },
    { id: 'swap_grmf_hmstr', symbol: 'HMSTR', label: 'Daily Swap: GRMF → HMSTR', reward: 50, xp: 20 },
  ];

  // Evaluate each swap task's 24h cycle state
  const evaluatedSwapTasks = swapTasks.map((task) => {
    const rawTask = taskProgress?.[task.id];
    const status = typeof rawTask === 'object' && rawTask !== null 
      ? rawTask.status 
      : typeof rawTask === 'string' 
        ? rawTask 
        : undefined;

    const claimedAt = sanitizeTimestamp(rawTask?.claimedAt, now);
    const completedAt = sanitizeTimestamp(rawTask?.completedAt, now);

    // If claimed within the last 24h -> Cooldown state
    const claimCooldown = getCooldownState(claimedAt || (status === 'claimed' ? completedAt : 0), now);
    if (status === 'claimed' && claimCooldown.isCooldown) {
      return {
        ...task,
        cycleState: 'cooldown' as const,
        cooldown: claimCooldown
      };
    }

    // If swap was executed within the last 24h and not yet claimed -> Ready to claim
    const completeCooldown = getCooldownState(completedAt, now);
    if (status === 'completed' && completeCooldown.isCooldown) {
      return {
        ...task,
        cycleState: 'ready_to_claim' as const,
        cooldown: completeCooldown
      };
    }

    // Otherwise (never done, or >= 24h elapsed since last claim/completion) -> Available
    return {
      ...task,
      cycleState: 'available' as const,
      cooldown: { isCooldown: false, remainingMs: 0, progressPct: 100, formatted: '00:00:00' }
    };
  });

  // Compute aggregate 24h cycle metrics
  const totalDailyCount = 2 + evaluatedSwapTasks.length; // 7 daily tasks
  const activeCooldowns = [
    ...(loginCooldown.isCooldown ? [loginCooldown.remainingMs] : []),
    ...(boxCooldown.isCooldown ? [boxCooldown.remainingMs] : []),
    ...evaluatedSwapTasks.filter(t => t.cycleState === 'cooldown').map(t => t.cooldown.remainingMs)
  ];
  const completedDailyCount = activeCooldowns.length;
  const availableDailyCount = totalDailyCount - completedDailyCount;
  const nextRenewalMs = activeCooldowns.length > 0 ? Math.min(...activeCooldowns) : 0;
  const nextRenewalFormatted = nextRenewalMs > 0
    ? getCooldownState(now - (DAILY_COOLDOWN_MS - nextRenewalMs), now).formatted
    : null;

  const handleClaimTask = async (
    taskId: string,
    rewardAmount: number,
    xpAmount: number,
    sourceName: string,
    extraUpdates: Record<string, any> = {},
    subtitle?: string
  ) => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId) return;
    triggerHaptic('medium');
    setClaimingId(taskId);

    try {
      const res = await grantReward({
        userId: targetId,
        telegramId: userProfile?.telegramId,
        username: userProfile?.username || userProfile?.telegramUsername,
        firstName: userProfile?.firstName,
        source: sourceName,
        amount: rewardAmount,
        xp: xpAmount,
        balanceType: 'both',
        extraUserUpdates: {
          ...extraUpdates,
          lastActiveAt: serverTimestamp(),
        }
      });

      if (res.success) {
        triggerHaptic('success');
        setSuccessModal({
          title: taskId.includes('shortcut') ? 'Shortcut Added!' : 
                 taskId === 'daily_login' ? 'Daily Check-In Claimed!' : 
                 taskId === 'mystery_box' ? 'Mystery Box Opened!' : 'Daily Mission Claimed!',
          amount: rewardAmount,
          subtitle
        });
      }
    } catch (err) {
      console.error("Failed to claim task reward:", err);
      triggerHaptic('error');
    } finally {
      setClaimingId(null);
    }
  };

  const handleGoToSwap = (symbol: string) => {
    triggerHaptic('light');
    if (onSelectSwapPair) {
      onSelectSwapPair(symbol);
    } else {
      setActiveView('swap');
    }
  };

  const handleClaimSwapTask = async (taskId: string, reward: number, xp: number) => {
    const claimTs = Date.now();
    await handleClaimTask(
      taskId,
      reward,
      xp,
      `task_${taskId}`,
      {
        [`taskProgress.${taskId}.status`]: 'claimed',
        [`taskProgress.${taskId}.claimedAt`]: claimTs,
        [`taskProgress.${taskId}.completedAt`]: claimTs
      },
      'This mission will automatically renew in 24 hours.'
    );
  };

  const handleJoinChannel = async () => {
    openTelegramLink('https://t.me/Grmfdex');
    setTimeout(() => {
      const ts = Date.now();
      handleClaimTask('tg_channel', 500, 50, 'task_tg_channel', {
        'taskProgress.tg_channel.status': 'completed',
        'taskProgress.tg_channel.completedAt': ts
      });
    }, 5000);
  };

  const handleClaimShortcut = async () => {
    if (shortcutStatus !== 'added') return;
    const ts = Date.now();
    await handleClaimTask('shortcut_tg', 1500, 100, 'task_shortcut_tg', {
      'taskProgress.shortcut_tg.status': 'completed',
      'taskProgress.shortcut_tg.completedAt': ts
    });
  };

  const handleDailyCheckin = async () => {
    if (loginCooldown.isCooldown) return;
    const ts = Date.now();
    const nextStreak = activeStreak + 1;
    await handleClaimTask(
      'daily_login',
      25,
      10,
      'task_daily_login',
      {
        'taskProgress.daily_login.status': 'completed',
        'taskProgress.daily_login.completedAt': ts,
        'taskProgress.daily_login.claimedAt': ts,
        'taskProgress.daily_login.streak': nextStreak
      },
      `Day ${nextStreak} streak active! Next check-in unlocks in 24:00:00.`
    );
  };

  const handleOpenBox = async () => {
    if (boxCooldown.isCooldown) return;
    const ts = Date.now();
    await handleClaimTask(
      'mystery_box',
      35,
      15,
      'task_mystery_box',
      {
        'taskProgress.mystery_box.status': 'completed',
        'taskProgress.mystery_box.completedAt': ts,
        'taskProgress.mystery_box.claimedAt': ts
      },
      'Your next Daily Mystery Box unlocks in 24:00:00.'
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex flex-col gap-4 pb-8"
    >
      {/* Header & 24h Renewal Cycle Overview Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Reward Missions
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Daily tasks renew automatically every 24 hours
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 block">Balance</span>
            <span className="text-base font-extrabold font-mono tabular-nums text-slate-900">
              {(userProfile?.realBalances?.GRMF || 0).toLocaleString()} <span className="text-xs text-[#0088CC]">GRMF</span>
            </span>
          </div>
        </div>

        {/* 24h Status Strip */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0088CC] flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                <span className="font-mono tabular-nums">{availableDailyCount}/{totalDailyCount} Ready</span>
                <span className="text-slate-300">·</span>
                <span className="text-amber-600 font-mono tabular-nums">
                  Day {Math.max(1, activeStreak)} Streak
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {nextRenewalFormatted ? (
                  <>
                    Next renewal in <span className="font-mono tabular-nums font-bold text-slate-700">{nextRenewalFormatted}</span>
                  </>
                ) : (
                  'All 24h daily missions are ready to claim'
                )}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-semibold text-slate-400 block">Daily Pool</span>
            <span className="text-xs font-extrabold font-mono tabular-nums text-emerald-600">+310 GRMF/24h</span>
          </div>
        </div>
      </div>

      {/* Interactive Segmented Control */}
      <div className="flex bg-slate-200/70 p-1 rounded-2xl">
        {[
          { id: 'all', label: 'All Missions' },
          { id: 'daily', label: `Daily 24h (${availableDailyCount})` },
          { id: 'special', label: 'One-Time' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic('light');
              setActiveTab(tab.id as any);
            }}
            className={`flex-1 min-h-[38px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Unified Task List Surface */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {/* Daily Task 1: Daily Streak Check-in (Renews every 24h) */}
        {(activeTab === 'all' || activeTab === 'daily') && (
          <div className="p-4 flex items-center justify-between gap-3.5 hover:bg-slate-50/60 transition-colors">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  Daily Check-In
                </h4>
                <span className="text-[11px] font-bold font-mono tabular-nums text-amber-600">
                  · Day {Math.max(1, activeStreak)}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                <span className="font-mono tabular-nums font-bold text-amber-600">+25 GRMF</span>
                <span className="mx-1.5 text-slate-300">·</span>
                {loginCooldown.isCooldown ? (
                  <span className="font-mono tabular-nums text-slate-600 font-semibold">
                    Renews in {loginCooldown.formatted}
                  </span>
                ) : (
                  <span>24h cycle ready</span>
                )}
              </p>
              {loginCooldown.isCooldown && (
                <div className="w-full max-w-[160px] h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${loginCooldown.progressPct}%` }}
                  />
                </div>
              )}
            </div>
            <div className="shrink-0">
              {loginCooldown.isCooldown ? (
                <div className="flex flex-col items-end">
                  <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Claimed</span>
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400 font-semibold mt-0.5">
                    {loginCooldown.formatted}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleDailyCheckin}
                  disabled={claimingId === 'daily_login'}
                  className="min-h-[40px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <span>{claimingId === 'daily_login' ? 'Claiming...' : 'Check In'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Daily Task 2: Daily Mystery Box (Renews every 24h) */}
        {(activeTab === 'all' || activeTab === 'daily') && (
          <div className="p-4 flex items-center justify-between gap-3.5 hover:bg-slate-50/60 transition-colors">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                Daily Mystery Box
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                <span className="font-mono tabular-nums font-bold text-indigo-600">+35 GRMF</span>
                <span className="mx-1.5 text-slate-300">·</span>
                {boxCooldown.isCooldown ? (
                  <span className="font-mono tabular-nums text-slate-600 font-semibold">
                    Renews in {boxCooldown.formatted}
                  </span>
                ) : (
                  <span>Unlock 24h reward box</span>
                )}
              </p>
              {boxCooldown.isCooldown && (
                <div className="w-full max-w-[160px] h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${boxCooldown.progressPct}%` }}
                  />
                </div>
              )}
            </div>
            <div className="shrink-0">
              {boxCooldown.isCooldown ? (
                <div className="flex flex-col items-end">
                  <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Opened</span>
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400 font-semibold mt-0.5">
                    {boxCooldown.formatted}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleOpenBox}
                  disabled={claimingId === 'mystery_box'}
                  className="min-h-[40px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <span>{claimingId === 'mystery_box' ? 'Opening...' : 'Open Box'}</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Daily Tasks 3-7: Daily DEX Swap Missions (Renew every 24h) */}
        {(activeTab === 'all' || activeTab === 'daily') && evaluatedSwapTasks.map((task) => {
          const isCooldown = task.cycleState === 'cooldown';
          const isReadyToClaim = task.cycleState === 'ready_to_claim';

          return (
            <div key={task.id} className="p-4 flex items-center justify-between gap-3.5 hover:bg-slate-50/60 transition-colors">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {task.label}
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  <span className="font-mono tabular-nums font-bold text-emerald-600">+{task.reward} GRMF</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  {isCooldown ? (
                    <span className="font-mono tabular-nums text-slate-600 font-semibold">
                      Renews in {task.cooldown.formatted}
                    </span>
                  ) : isReadyToClaim ? (
                    <span className="text-emerald-600 font-semibold">Swap verified — Ready to claim</span>
                  ) : (
                    <span>Renews every 24h</span>
                  )}
                </p>
                {isCooldown && (
                  <div className="w-full max-w-[160px] h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className="h-full bg-[#0088CC] rounded-full transition-all duration-500"
                      style={{ width: `${task.cooldown.progressPct}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {isCooldown ? (
                  <div className="flex flex-col items-end">
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Claimed</span>
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 font-semibold mt-0.5">
                      {task.cooldown.formatted}
                    </span>
                  </div>
                ) : isReadyToClaim ? (
                  <button
                    onClick={() => handleClaimSwapTask(task.id, task.reward, task.xp)}
                    disabled={claimingId === task.id}
                    className="min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <span>{claimingId === task.id ? 'Claiming...' : `Claim +${task.reward}`}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleGoToSwap(task.symbol)}
                    className="min-h-[40px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <span>Swap</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* One-Time Special Task 1: Add to Home Screen */}
        {(activeTab === 'all' || activeTab === 'special') && shortcutStatus !== 'unsupported' && (
          <div className="p-4 flex items-center justify-between gap-3.5 hover:bg-slate-50/60 transition-colors">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-[#0088CC] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                Add Home Screen Shortcut
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                <span className="font-mono tabular-nums font-bold text-emerald-600">+1,500 GRMF</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span>{shortcutTaskCompleted ? 'Completed' : 'One-time bonus'}</span>
              </p>
            </div>
            <div className="shrink-0">
              {shortcutTaskCompleted ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold px-2.5 py-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Done</span>
                </span>
              ) : shortcutStatus === 'added' ? (
                <button
                  onClick={handleClaimShortcut}
                  disabled={claimingId === 'shortcut_tg'}
                  className="min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <span>{claimingId === 'shortcut_tg' ? 'Claiming...' : 'Claim'}</span>
                </button>
              ) : (
                <button
                  onClick={addToHomeScreen}
                  disabled={shortcutStatus === 'loading'}
                  className="min-h-[40px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <span>Add</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* One-Time Special Task 2: Join Official Channel */}
        {(activeTab === 'all' || activeTab === 'special') && (
          <div className="p-4 flex items-center justify-between gap-3.5 hover:bg-slate-50/60 transition-colors">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-[#0088CC] flex items-center justify-center shrink-0">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                Join Official GRMF Channel
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                <span className="font-mono tabular-nums font-bold text-emerald-600">+500 GRMF</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span>{tgChannelCompleted ? 'Verified member' : 'One-time bonus'}</span>
              </p>
            </div>
            <div className="shrink-0">
              {tgChannelCompleted ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold px-2.5 py-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Done</span>
                </span>
              ) : (
                <button
                  onClick={handleJoinChannel}
                  disabled={claimingId === 'tg_channel'}
                  className="min-h-[40px] bg-[#0088CC] hover:bg-[#0077B5] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <span>{claimingId === 'tg_channel' ? 'Verifying...' : 'Join'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {successModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 12 }}
              className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl border border-slate-100"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <PartyPopper className="w-7 h-7" />
              </div>

              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                {successModal.title}
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                {successModal.subtitle || 'Added directly to your Global Assets balance.'}
              </p>

              <div className="bg-slate-50 rounded-2xl py-3 px-4 border border-slate-200/60 mb-5 flex items-center justify-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <span className="text-lg font-extrabold font-mono tabular-nums text-slate-900">
                  +{successModal.amount.toLocaleString()} GRMF
                </span>
              </div>

              <button
                onClick={() => setSuccessModal(null)}
                className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
