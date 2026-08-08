import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Sparkles, 
  Gift, 
  Smartphone, 
  Calendar, 
  Flame, 
  Award, 
  Coins, 
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  PartyPopper
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { grantReward } from '../lib/rewardsEngine';
import { useHomeScreenShortcut } from '../hooks/useHomeScreenShortcut';
import { serverTimestamp } from 'firebase/firestore';

interface TasksViewProps {
  userProfile: any;
  setActiveView: (view: any) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ userProfile, setActiveView }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'daily' | 'special'>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<{ title: string; amount: number } | null>(null);
  const [boxOpened, setBoxOpened] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });
  
  const { status: shortcutStatus, addToHomeScreen } = useHomeScreenShortcut();

  React.useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow.getTime() - now.getTime();

      if (diff > 0) {
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const taskProgress = userProfile?.taskProgress || {};

  // Task 1: Home Screen Shortcut
  const shortcutTaskCompleted = taskProgress['shortcut_tg']?.status === 'completed';

  // Task 2: Daily Streak Check-in
  const lastLoginDate = taskProgress['daily_login']?.lastDate || '';
  const todayStr = new Date().toDateString();
  const dailyCompletedToday = lastLoginDate === todayStr;

  // Task 3: Open Mystery Box
  const lastBoxDate = taskProgress['mystery_box']?.lastDate || '';
  const boxCompletedToday = lastBoxDate === todayStr;

  const handleClaimTask = async (taskId: string, rewardAmount: number, sourceName: string, extraUpdates: Record<string, any> = {}) => {
    const targetId = userProfile?.id || auth.currentUser?.uid;
    if (!targetId) return;
    setClaimingId(taskId);

    try {
      const res = await grantReward({
        userId: targetId,
        telegramId: userProfile?.telegramId,
        username: userProfile?.username || userProfile?.telegramUsername,
        firstName: userProfile?.firstName,
        source: sourceName,
        amount: rewardAmount,
        balanceType: 'both',
        extraUserUpdates: {
          ...extraUpdates,
          lastActiveAt: serverTimestamp(),
        }
      });

      if (res.success) {
        setSuccessModal({
          title: taskId.includes('shortcut') ? 'Shortcut Added Successfully!' : 
                 taskId === 'daily_login' ? 'Daily Check-in Claimed!' : 
                 taskId === 'mystery_box' ? 'Mystery Box Opened!' : 'Swap Mission Completed!',
          amount: rewardAmount
        });
      }
    } catch (err) {
      console.error("Failed to claim task reward:", err);
    } finally {
      setClaimingId(null);
    }
  };

  const swapTasks = [
    { id: 'swap_grmf_gram', symbol: 'GRAM', label: 'Swap GRMF to GRAM', reward: 50 },
    { id: 'swap_grmf_usdt', symbol: 'USDT', label: 'Swap GRMF to USDT', reward: 50 },
    { id: 'swap_grmf_not', symbol: 'NOT', label: 'Swap GRMF to NOT', reward: 50 },
    { id: 'swap_grmf_dogs', symbol: 'DOGS', label: 'Swap GRMF to DOGS', reward: 50 },
    { id: 'swap_grmf_hmstr', symbol: 'HMSTR', label: 'Swap GRMF to HMSTR', reward: 50 },
  ];

  const handleGoToSwap = () => {
    setActiveView('swap');
  };

  const handleClaimSwapTask = async (taskId: string, reward: number) => {
    await handleClaimTask(taskId, reward, `task_${taskId}`, {
      [`taskProgress.${taskId}.status`]: 'claimed',
      [`taskProgress.${taskId}.claimedAt`]: Date.now()
    });
  };

  const handleClaimShortcut = async () => {
    if (shortcutStatus !== 'added') return;
    await handleClaimTask('shortcut_tg', 1500, 'task_shortcut_tg', {
      'taskProgress.shortcut_tg.status': 'completed',
      'taskProgress.shortcut_tg.completedAt': Date.now()
    });
  };

  const handleDailyCheckin = async () => {
    await handleClaimTask('daily_login', 25, 'task_daily_login', {
      'taskProgress.daily_login.status': 'completed',
      'taskProgress.daily_login.lastDate': todayStr,
      'taskProgress.daily_login.completedAt': Date.now()
    });
  };

  const handleOpenBox = async () => {
    setBoxOpened(true);
    await handleClaimTask('mystery_box', 35, 'task_mystery_box', {
      'taskProgress.mystery_box.status': 'completed',
      'taskProgress.mystery_box.lastDate': todayStr,
      'taskProgress.mystery_box.completedAt': Date.now()
    });
  };

  const realGrmf = userProfile?.realBalances?.GRMF || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-5 pb-8 px-1"
    >
      {/* Filter Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 mx-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'all' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          All Tasks
        </button>
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'daily' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Daily & Streak
        </button>
        <button
          onClick={() => setActiveTab('special')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'special' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Special Bonus
        </button>
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-3.5">
        {/* Task 1: Add to Home Screen (Official TG Shortcut) */}
        {(activeTab === 'all' || activeTab === 'special') && shortcutStatus !== 'unsupported' && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:border-blue-200 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                  Add to Home Screen
                </h4>
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                  +1500 GRMF
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {shortcutTaskCompleted 
                  ? 'Task completed successfully' 
                  : shortcutStatus === 'added' 
                    ? 'Shortcut added! Claim your reward now.' 
                    : 'Add official Telegram shortcut'}
              </p>
            </div>
            <div>
              {shortcutTaskCompleted ? (
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completed</span>
                </div>
              ) : shortcutStatus === 'added' ? (
                <button
                  onClick={handleClaimShortcut}
                  disabled={claimingId === 'shortcut_tg'}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{claimingId === 'shortcut_tg' ? 'Claiming...' : 'Claim Reward'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={addToHomeScreen}
                  disabled={shortcutStatus === 'loading'}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>Add Shortcut</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Task 2: Daily Streak Check-in */}
        {(activeTab === 'all' || activeTab === 'daily') && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:border-amber-200 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
              <Flame className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                  Daily Consecutive Login
                </h4>
                <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 shrink-0">
                  +25 GRMF
                </span>
              </div>
              {dailyCompletedToday ? (
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 font-mono">
                  <span>Next Reset in:</span>
                  <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                    {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
                  </span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Check in today to instantly earn your daily reward!
                </p>
              )}
            </div>
            <div>
              {dailyCompletedToday ? (
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Claimed</span>
                </div>
              ) : (
                <button
                  onClick={handleDailyCheckin}
                  disabled={claimingId === 'daily_login'}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{claimingId === 'daily_login' ? 'Claiming...' : 'Check In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Task 3: Open Mystery Box */}
        {(activeTab === 'all' || activeTab === 'daily' || activeTab === 'special') && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:border-purple-200 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 shadow-inner">
              <Gift className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                  Open Mystery Box
                </h4>
                <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 shrink-0">
                  +35 GRMF
                </span>
              </div>
              {boxCompletedToday ? (
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 font-mono">
                  <span>Next Box in:</span>
                  <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                    {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
                  </span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Daily secret mystery box opening mission
                </p>
              )}
            </div>
            <div>
              {boxCompletedToday ? (
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Opened</span>
                </div>
              ) : (
                <button
                  onClick={handleOpenBox}
                  disabled={claimingId === 'mystery_box'}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-purple-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{claimingId === 'mystery_box' ? 'Opening...' : 'Open Box'}</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Swap Mission Tasks */}
        {(activeTab === 'all' || activeTab === 'special') && swapTasks.map((task) => {
          const rawTask = taskProgress?.[task.id];
          const status = typeof rawTask === 'object' && rawTask !== null 
            ? rawTask.status 
            : typeof rawTask === 'string' 
              ? rawTask 
              : undefined;
          const isCompleted = status === 'completed';
          const isClaimed = status === 'claimed';

          return (
            <div key={task.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:border-blue-200 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
                <Coins className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                    {task.label}
                  </h4>
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                    +{task.reward} GRMF
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {isClaimed ? 'Reward claimed' : isCompleted ? 'Task ready to claim' : `Exchange GRMF for ${task.symbol} to earn`}
                </p>
              </div>
              <div>
                {isClaimed ? (
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Claimed</span>
                  </div>
                ) : isCompleted ? (
                  <button
                    onClick={() => handleClaimSwapTask(task.id, task.reward)}
                    disabled={claimingId === task.id}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{claimingId === task.id ? 'Claiming...' : 'Claim'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleGoToSwap}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>GO</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Success Modal Notification */}
      <AnimatePresence>
        {successModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/85 backdrop-blur-md p-6">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl border border-slate-100 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
                <PartyPopper className="w-8 h-8" />
              </div>

              <h3 className="text-base font-black text-slate-900 mb-1">
                {successModal.title}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Successfully credited to your account!
              </p>

              <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200/80 mb-5 flex items-center justify-center gap-2">
                <Coins className="w-5 h-5 text-amber-600" />
                <span className="text-base font-black text-amber-700">+{successModal.amount} GRMF</span>
              </div>

              <button
                onClick={() => setSuccessModal(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
              >
                Awesome, Collect!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
