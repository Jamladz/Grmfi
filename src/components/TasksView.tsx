import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, TrendingUp, Users, Calendar, Box, Sparkles, Zap, Timer, Loader2, ChevronRight } from 'lucide-react';
import { doc, updateDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { DailyBoxModal } from './DailyBoxModal';
import { awardXP } from '../lib/levelSystem';

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

export const TasksView: React.FC<TasksViewProps> = ({ userProfile, setActiveView }) => {
  const [tasksState, setTasksState] = useState<Record<string, TaskState>>({});
  const [timeLeft, setTimeLeft] = useState<Record<string, string>>({});
  const [isDailyBoxModalOpen, setIsDailyBoxModalOpen] = useState(false);

  useEffect(() => {
    if (userProfile?.taskProgress) {
      const newState: Record<string, TaskState> = {};
      Object.entries(userProfile.taskProgress).forEach(([id, data]: [string, any]) => {
        newState[id] = {
          status: data.status || 'idle',
          lastCompletedAt: data.lastCompletedAt?.toMillis?.() || data.lastCompletedAt,
          nextAvailableAt: data.nextAvailableAt?.toMillis?.() || data.nextAvailableAt,
        };
      });
      setTasksState(newState);
    }
  }, [userProfile]);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft: Record<string, string> = {};
      const now = Date.now();
      
      INITIAL_TASKS.forEach(task => {
        const state = tasksState[task.id];
        if (task.isDaily && state?.nextAvailableAt) {
          const diff = state.nextAvailableAt - now;
          if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            newTimeLeft[task.id] = `${hours}h ${mins}m ${secs}s`;
          } else if (state.status === 'completed') {
            setTasksState(prev => ({
              ...prev,
              [task.id]: { ...prev[task.id], status: 'idle' }
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
    const userRef = doc(db, 'users', targetId);

    const now = Date.now();
    const nextDay = new Date();
    nextDay.setUTCHours(24, 0, 0, 0);

    try {
      await setDoc(userRef, {
        realBalances: {
          GRMF: increment(1)
        },
        betaBalances: {
          GRMF: increment(1)
        },
        taskProgress: {
          'daily-box': {
            status: 'completed',
            lastCompletedAt: serverTimestamp(),
            nextAvailableAt: nextDay
          }
        }
      }, { merge: true });
    } catch (err) {
      console.warn("setDoc claim failed, attempting updateDoc fallback:", err);
      try {
        await updateDoc(userRef, {
          'realBalances.GRMF': increment(1),
          'betaBalances.GRMF': increment(1),
          'taskProgress.daily-box.status': 'completed',
          'taskProgress.daily-box.lastCompletedAt': serverTimestamp(),
          'taskProgress.daily-box.nextAvailableAt': nextDay,
        });
      } catch (e) {
        console.error("updateDoc claim fallback error:", e);
      }
    }

    setTasksState(prev => ({
      ...prev,
      'daily-box': {
        status: 'completed',
        lastCompletedAt: now,
        nextAvailableAt: nextDay.getTime()
      }
    }));

    // Award 50 XP for daily box claim
    await awardXP(targetId, 50);
  };

  const handleTaskAction = async (task: Task) => {
    if (task.id === 'daily-box') {
      setIsDailyBoxModalOpen(true);
      return;
    }

    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId) return;
    const currentState = tasksState[task.id] || { status: 'idle' };
    const userRef = doc(db, 'users', targetId);

    if (currentState.status === 'idle') {
      // Execute Action
      if (task.actionType === 'swap') {
        setActiveView('swap');
      } else if (task.actionType === 'link' && task.link) {
        window.open(task.link, '_blank');
      }

      setTasksState(prev => ({ ...prev, [task.id]: { ...prev[task.id], status: 'checking' } }));
      
      setTimeout(async () => {
        setTasksState(prev => ({ ...prev, [task.id]: { ...prev[task.id], status: 'claimable' } }));
        await updateDoc(userRef, {
          [`taskProgress.${task.id}.status`]: 'claimable'
        });
      }, 5000);

    } else if (currentState.status === 'claimable') {
      const now = Date.now();
      const nextDay = new Date();
      nextDay.setUTCHours(24, 0, 0, 0); 
      
      const updateData: any = {
        'realBalances.GRMF': increment(task.rewardValue),
        [`taskProgress.${task.id}.status`]: 'completed',
        [`taskProgress.${task.id}.lastCompletedAt`]: serverTimestamp(),
      };

      if (task.isDaily) {
        updateData[`taskProgress.${task.id}.nextAvailableAt`] = nextDay;
      }

      await updateDoc(userRef, updateData);
      await awardXP(targetId, 40);
      
      setTasksState(prev => ({
        ...prev,
        [task.id]: {
          status: 'completed',
          lastCompletedAt: now,
          nextAvailableAt: task.isDaily ? nextDay.getTime() : undefined
        }
      }));
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
              const isLocked = isCompleted && task.isDaily && timeLeft[task.id];

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
                    disabled={isCompleted && task.id !== 'daily-box' || isChecking}
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
        isClaimed={tasksState['daily-box']?.status === 'completed' && !!timeLeft['daily-box']}
        timeLeft={timeLeft['daily-box']}
        onClaim={handleClaimDailyBox}
        rewardValue={1}
      />
    </motion.div>
  );
};
