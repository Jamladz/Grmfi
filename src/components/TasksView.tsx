import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, TrendingUp, Users, Calendar, Box, Zap, Timer, Loader2 } from 'lucide-react';
import { doc, updateDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { DailyBoxModal } from './DailyBoxModal';
import { awardXP } from '../lib/levelSystem';
import { grantReward } from '../lib/rewardsEngine';

interface Task {
  id: string;
  title: string;
  reward: string;
  rewardValue: number;
  icon: React.ReactNode;
  category: 'daily' | 'social' | 'one-time';
  isDaily: boolean;
  link?: string;
  actionType?: 'swap' | 'link';
}

const INITIAL_TASKS: Task[] = [
  { id: 'daily-checkin', title: 'Daily Check-in', reward: '+1 GRMF', rewardValue: 1, icon: <Calendar className="w-5 h-5" />, category: 'daily', isDaily: true },
  { id: 'daily-box', title: 'Open Daily Box', reward: '+1 GRMF', rewardValue: 1, icon: <Box className="w-5 h-5" />, category: 'daily', isDaily: true },
  { id: 'beta-swap', title: 'Beta Swap Event', reward: '+1 GRMF', rewardValue: 1, icon: <Zap className="w-5 h-5" />, category: 'one-time', isDaily: false, actionType: 'swap' },
  { id: 'swap-grmf-gram', title: 'Swap GRMF to GRAM', reward: '+1 GRMF', rewardValue: 1, icon: <TrendingUp className="w-5 h-5" />, category: 'one-time', isDaily: false, actionType: 'swap' },
  { id: 'swap-grmf-not', title: 'Swap GRMF to NOT', reward: '+1 GRMF', rewardValue: 1, icon: <TrendingUp className="w-5 h-5" />, category: 'one-time', isDaily: false, actionType: 'swap' },
  { id: 'join-channel', title: 'Join Official Channel', reward: '+1 GRMF', rewardValue: 1, icon: <Users className="w-5 h-5" />, category: 'social', isDaily: false, link: 'https://t.me/GRAM_Fi', actionType: 'link' },
];

type TaskStatus = 'idle' | 'checking' | 'claimable' | 'completed';

interface TaskState {
  status: TaskStatus;
  lastCompletedAt?: number;
  nextAvailableAt?: number;
}

interface TasksViewProps {
  userProfile: any;
  setActiveView: (view: any) => void;
}

export function parseTimestampMs(val: any): number | undefined {
  if (!val) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.getTime === 'function') return val.getTime();
  if (val.seconds !== undefined) return val.seconds * 1000;
  if (val._seconds !== undefined) return val._seconds * 1000;
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return parsed;
  }
  return undefined;
}

export const TasksView: React.FC<TasksViewProps> = ({ userProfile, setActiveView }) => {
  const [tasksState, setTasksState] = useState<Record<string, TaskState>>({});
  const [timeLeft, setTimeLeft] = useState<Record<string, string>>({});
  const [isDailyBoxModalOpen, setIsDailyBoxModalOpen] = useState(false);

  // Sync tasksState from userProfile (Firestore snapshot) safely
  useEffect(() => {
    if (userProfile?.taskProgress) {
      const newState: Record<string, TaskState> = {};
      const now = Date.now();

      Object.entries(userProfile.taskProgress).forEach(([id, data]: [string, any]) => {
        const lastCompletedAt = parseTimestampMs(data.lastCompletedAt);
        const nextAvailableAt = parseTimestampMs(data.nextAvailableAt);
        const taskDef = INITIAL_TASKS.find(t => t.id === id);

        let status: TaskStatus = data.status || 'idle';
        let finalNextAvailableAt = nextAvailableAt;

        if (taskDef?.isDaily) {
          // If 24h countdown is still active, mark completed
          if (nextAvailableAt && nextAvailableAt > now) {
            status = 'completed';
          } else if (nextAvailableAt && nextAvailableAt <= now) {
            // 24 hours passed, reset status to idle
            status = 'idle';
          }
        } else {
          // One-time tasks remain permanently completed
          if (status === 'completed') {
            status = 'completed';
          }
        }

        newState[id] = {
          status,
          lastCompletedAt,
          nextAvailableAt,
        };
      });

      setTasksState(newState);
    }
  }, [userProfile]);

  // Timer loop for 24-hour countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft: Record<string, string> = {};
      const now = Date.now();
      
      INITIAL_TASKS.forEach(task => {
        if (task.isDaily) {
          const state = tasksState[task.id];
          const nextMs = parseTimestampMs(state?.nextAvailableAt);

          if (nextMs && nextMs > now) {
            const diff = nextMs - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            newTimeLeft[task.id] = `${hours}h ${mins}m ${secs}s`;
          } else if (state?.status === 'completed' && nextMs && nextMs <= now) {
            // Timer expired! Reset task to idle for next day
            setTasksState(prev => ({
              ...prev,
              [task.id]: { ...prev[task.id], status: 'idle', nextAvailableAt: undefined }
            }));
          }
        }
      });

      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [tasksState]);

  const handleClaimDailyBox = async () => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId) return;

    const state = tasksState['daily-box'];
    const now = Date.now();
    const nextMs = parseTimestampMs(state?.nextAvailableAt);

    // Prevent double claim if in 24h cooldown
    if (nextMs && nextMs > now) {
      console.warn("Daily box is currently in 24h cooldown");
      return;
    }

    // Exactly 24 hours countdown from moment of claim
    const nextAvailable = new Date(now + 24 * 60 * 60 * 1000);

    // Optimistic local state update
    setTasksState(prev => ({
      ...prev,
      'daily-box': {
        status: 'completed',
        lastCompletedAt: now,
        nextAvailableAt: nextAvailable.getTime()
      }
    }));

    // Unified Reward Distribution
    await grantReward({
      userId: targetId,
      telegramId: userProfile?.telegramId,
      username: userProfile?.username || userProfile?.telegramUsername,
      firstName: userProfile?.firstName,
      source: 'task_daily-box',
      amount: 1,
      balanceType: 'both',
      extraUserUpdates: {
        [`taskProgress.daily-box.status`]: 'completed',
        [`taskProgress.daily-box.lastCompletedAt`]: serverTimestamp(),
        [`taskProgress.daily-box.nextAvailableAt`]: nextAvailable
      }
    });

    // Explicitly save the task progress via setDoc merge
    const userRef = doc(db, 'users', targetId);
    await setDoc(userRef, {
      realBalances: { GRMF: increment(1) },
      betaBalances: { GRMF: increment(1) },
      taskProgress: {
        'daily-box': {
          status: 'completed',
          lastCompletedAt: serverTimestamp(),
          nextAvailableAt: nextAvailable
        }
      }
    }, { merge: true });

    // Award XP
    await awardXP(targetId, 50);
  };

  const executeTaskClaim = async (task: Task) => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId) return;

    const now = Date.now();
    const nextAvailable = task.isDaily ? new Date(now + 24 * 60 * 60 * 1000) : undefined;

    // 1. Optimistic UI update
    setTasksState(prev => ({
      ...prev,
      [task.id]: {
        status: 'completed',
        lastCompletedAt: now,
        nextAvailableAt: task.isDaily && nextAvailable ? nextAvailable.getTime() : undefined
      }
    }));

    // Trigger Telegram haptic feedback if available
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred('success');
    }

    // 2. Prepare structured extraUserUpdates
    const extraUpdates: Record<string, any> = {
      [`taskProgress.${task.id}.status`]: 'completed',
      [`taskProgress.${task.id}.lastCompletedAt`]: serverTimestamp()
    };
    if (task.isDaily && nextAvailable) {
      extraUpdates[`taskProgress.${task.id}.nextAvailableAt`] = nextAvailable;
    }

    // 3. Grant reward through Unified Engine
    try {
      await grantReward({
        userId: targetId,
        telegramId: userProfile?.telegramId,
        username: userProfile?.username || userProfile?.telegramUsername,
        firstName: userProfile?.firstName,
        source: `task_${task.id}`,
        amount: task.rewardValue,
        balanceType: 'both',
        extraUserUpdates: extraUpdates
      });
      
      // Explicitly save the task progress via setDoc merge to guarantee it persists independently
      const userRef = doc(db, 'users', targetId);
      const explicitUpdates: any = {
        realBalances: { GRMF: increment(task.rewardValue) },
        betaBalances: { GRMF: increment(task.rewardValue) },
        taskProgress: {
          [task.id]: {
            status: 'completed',
            lastCompletedAt: serverTimestamp()
          }
        }
      };
      if (task.isDaily && nextAvailable) {
        explicitUpdates.taskProgress[task.id].nextAvailableAt = nextAvailable;
      }
      await setDoc(userRef, explicitUpdates, { merge: true });

      await awardXP(targetId, 40);
    } catch (err) {
      console.error(`Failed to claim task ${task.id}:`, err);
    }
  };

  const handleTaskAction = async (task: Task) => {
    if (task.id === 'daily-box') {
      setIsDailyBoxModalOpen(true);
      return;
    }

    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId) return;
    const currentState = tasksState[task.id] || { status: 'idle' };
    const now = Date.now();

    // Prevent claiming if one-time task already completed or daily task in cooldown
    if (task.isDaily) {
      const nextMs = parseTimestampMs(currentState.nextAvailableAt);
      if (nextMs && nextMs > now) {
        console.warn(`Task ${task.id} is in 24h cooldown`);
        return;
      }
    } else {
      if (currentState.status === 'completed') {
        console.warn(`One-time task ${task.id} is already permanently completed`);
        return;
      }
    }

    if (currentState.status === 'idle' || currentState.status === 'claimable') {
      setTasksState(prev => ({ ...prev, [task.id]: { ...prev[task.id], status: 'checking' } }));
      
      setTimeout(async () => {
        await executeTaskClaim(task);
        
        // Execute Action if any AFTER task claim triggers
        if (task.actionType === 'swap') {
          setActiveView('swap');
        } else if (task.actionType === 'link' && task.link) {
          window.open(task.link, '_blank');
        }
      }, 400);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 pb-24"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Earnings</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Complete activities to earn real tokens</p>
      </div>

      {['daily', 'social', 'one-time'].map(category => (
        <div key={category} className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            {category} Tasks
          </h3>
          <div className="grid gap-2">
            {INITIAL_TASKS.filter(t => t.category === category).map((task) => {
              const state = tasksState[task.id] || { status: 'idle' };
              const isCompleted = state.status === 'completed';
              const isChecking = state.status === 'checking';
              const isClaimable = state.status === 'claimable';
              const isLocked = isCompleted && task.isDaily && !!timeLeft[task.id];

              return (
                <div 
                  key={task.id}
                  onClick={() => {
                    if (task.id === 'daily-box') {
                      setIsDailyBoxModalOpen(true);
                    }
                  }}
                  className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${
                    task.id === 'daily-box' ? 'cursor-pointer hover:border-amber-200' : ''
                  } ${
                    isCompleted ? 'bg-slate-50 border-slate-100 opacity-75' : 'bg-white border-slate-100 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border ${
                      isCompleted ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-blue-50 text-[#24A1DE] border-blue-100'
                    }`}>
                      {task.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 tracking-tighter">{task.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[#24A1DE] tracking-tighter">{task.reward}</span>
                        {isLocked && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500 uppercase tracking-tighter">
                            <Timer className="w-3 h-3" />
                            {timeLeft[task.id]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isCompleted || isChecking}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskAction(task);
                    }}
                    className={`min-w-[80px] h-10 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      isCompleted 
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : isChecking
                        ? 'bg-blue-50 text-[#24A1DE] border border-blue-100'
                        : isClaimable
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 animate-bounce'
                        : 'bg-slate-900 text-white shadow-lg active:scale-95'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isChecking ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Check
                      </>
                    ) : isClaimable ? (
                      'Claim'
                    ) : (
                      'Go'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <DailyBoxModal
        isOpen={isDailyBoxModalOpen}
        onClose={() => setIsDailyBoxModalOpen(false)}
        isClaimed={tasksState['daily-box']?.status === 'completed'}
        timeLeft={timeLeft['daily-box']}
        onClaim={handleClaimDailyBox}
        rewardValue={1}
      />
    </motion.div>
  );
};

