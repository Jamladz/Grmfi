import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Activity, 
  Trophy, 
  Coins, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Download,
  ExternalLink,
  ChevronDown,
  UserCheck,
  Zap,
  Gift,
  Star,
  ListFilter,
  Flame,
  Wallet
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, getDocs, doc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AdminViewProps {
  userProfile?: any;
}

export const AdminView: React.FC<AdminViewProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'referrals'>('users');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [referralsFeed, setReferralsFeed] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive24hOnly, setFilterActive24hOnly] = useState(false);
  const [filterWithReferralsOnly, setFilterWithReferralsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'inviteCount' | 'realGrmf' | 'betaGrmf' | 'lastActiveTime' | 'createdTime'>('inviteCount');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedUserModal, setSelectedUserModal] = useState<any | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [customAwardAmount, setCustomAwardAmount] = useState<string>('50');
  const [awardSuccessMsg, setAwardSuccessMsg] = useState<string | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);

  const handleAwardTokens = async (targetUser: any, amount: number, balanceType: 'real' | 'beta' = 'real') => {
    if (!targetUser || !amount || amount <= 0) return;
    setIsAwarding(true);
    setAwardSuccessMsg(null);
    
    const userRef = doc(db, 'users', targetUser.id);
    try {
      await setDoc(userRef, {
        [balanceType === 'real' ? 'realBalances' : 'betaBalances']: {
          GRMF: increment(amount)
        }
      }, { merge: true });

      setAwardSuccessMsg(`✅ +${amount} ${balanceType.toUpperCase()} GRMF awarded to ${targetUser.username}! Saved to Firestore.`);
      setSelectedUserModal((prev: any) => prev ? {
        ...prev,
        realGrmf: balanceType === 'real' ? (prev.realGrmf || 0) + amount : prev.realGrmf,
        betaGrmf: balanceType === 'beta' ? (prev.betaGrmf || 0) + amount : prev.betaGrmf,
      } : null);
    } catch (err: any) {
      console.error("Admin reward failed:", err);
      setAwardSuccessMsg(`❌ Error: ${err.message || 'Failed to award tokens.'}`);
    } finally {
      setIsAwarding(false);
    }
  };

  const handleApproveAllUserTasks = async (targetUser: any) => {
    if (!targetUser) return;
    setIsAwarding(true);
    setAwardSuccessMsg(null);

    const userRef = doc(db, 'users', targetUser.id);
    const nextDay = new Date();
    nextDay.setUTCHours(24, 0, 0, 0);

    try {
      const taskIds = ['daily-checkin', 'daily-box', 'beta-swap', 'swap-grmf-gram', 'swap-grmf-not', 'join-channel'];
      const taskProgress: any = {};
      taskIds.forEach(id => {
        taskProgress[id] = {
          status: 'completed',
          lastCompletedAt: serverTimestamp(),
          nextAvailableAt: nextDay
        };
      });

      await setDoc(userRef, {
        realBalances: {
          GRMF: increment(10)
        },
        taskProgress: taskProgress
      }, { merge: true });

      setAwardSuccessMsg(`🎉 All tasks marked completed for ${targetUser.username}! (+10 GRMF added)`);
    } catch (err: any) {
      console.error("Task approval failed:", err);
      setAwardSuccessMsg(`❌ Error: ${err.message || 'Failed to approve tasks.'}`);
    } finally {
      setIsAwarding(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const usersRef = collection(db, 'users');
    
    // 1. Listen to real-time users collection
    const unsubUsers = onSnapshot(
      usersRef,
      (snapshot) => {
        const users: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Calculate invite count fallback
          const inviteCount = data.inviteCount ?? (data.invitedUsers ? data.invitedUsers.length : 0);
          
          // Extract balances
          const realGrmf = data.realBalances?.GRMF ?? 0;
          const betaGrmf = data.betaBalances?.GRMF ?? 0;
          const betaGram = data.betaBalances?.GRAM ?? 0;
          const betaUsdt = data.betaBalances?.USDT ?? 0;

          // Process timestamps
          let lastActiveTime = 0;
          if (data.lastActiveTimestamp) {
            lastActiveTime = Number(data.lastActiveTimestamp);
          } else if (data.lastActiveAt?.toDate) {
            lastActiveTime = data.lastActiveAt.toDate().getTime();
          } else if (data.lastActiveAt?.seconds) {
            lastActiveTime = data.lastActiveAt.seconds * 1000;
          } else if (data.createdAt?.toDate) {
            lastActiveTime = data.createdAt.toDate().getTime();
          } else if (data.createdAt?.seconds) {
            lastActiveTime = data.createdAt.seconds * 1000;
          }

          let createdTime = 0;
          if (data.createdAt?.toDate) {
            createdTime = data.createdAt.toDate().getTime();
          } else if (data.createdAt?.seconds) {
            createdTime = data.createdAt.seconds * 1000;
          }

          users.push({
            id: doc.id,
            uid: doc.id,
            username: data.username || data.telegramUsername || `user_${doc.id.slice(0, 6)}`,
            telegramUsername: data.telegramUsername || null,
            telegramId: data.telegramId || null,
            photoUrl: data.photoUrl || null,
            inviteCount: inviteCount,
            invitedUsers: data.invitedUsers || [],
            referredBy: data.referredBy || null,
            realGrmf: realGrmf,
            betaGrmf: betaGrmf,
            betaGram: betaGram,
            betaUsdt: betaUsdt,
            betaBalances: data.betaBalances || {},
            realBalances: data.realBalances || {},
            lastActiveTime: lastActiveTime,
            createdTime: createdTime,
            hasCollectedWelcomeBonus: !!data.hasCollectedWelcomeBonus,
            rawDoc: data
          });
        });

        setUsersList(users);
        setIsLoading(false);
        setLastRefreshedAt(new Date());
        setErrorMsg(null);
      },
      (err) => {
        console.error("Error fetching users for admin:", err);
        setErrorMsg(err.message || 'Failed to load live users from Firestore.');
        setIsLoading(false);
      }
    );

    // 2. Listen to real-time referrals collection feed
    const referralsRef = collection(db, 'referrals');
    const unsubReferrals = onSnapshot(
      referralsRef,
      (snapshot) => {
        const refs: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          let timeMs = 0;
          if (data.createdAt?.toDate) timeMs = data.createdAt.toDate().getTime();
          else if (data.createdAt?.seconds) timeMs = data.createdAt.seconds * 1000;

          refs.push({
            id: doc.id,
            ...data,
            timeMs
          });
        });
        refs.sort((a, b) => b.timeMs - a.timeMs);
        setReferralsFeed(refs);
      },
      (err) => {
        console.warn("Could not listen to /referrals feed:", err);
      }
    );

    return () => {
      unsubUsers();
      unsubReferrals();
    };
  }, []);

  // Compute Stats
  const totalUsers = usersList.length;
  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  const activeUsers24hList = usersList.filter((u) => {
    if (!u.lastActiveTime) return false;
    return now - u.lastActiveTime <= TWENTY_FOUR_HOURS_MS;
  });
  const activeUsers24hCount = activeUsers24hList.length;

  const totalReferralsCount = Math.max(
    usersList.reduce((acc, u) => acc + (u.inviteCount || 0), 0),
    referralsFeed.length
  );
  const totalRealGrmfCirculating = usersList.reduce((acc, u) => acc + (u.realGrmf || 0), 0);
  const totalBetaGrmfCirculating = usersList.reduce((acc, u) => acc + (u.betaGrmf || 0), 0);

  // Filter & Sort Users
  let filtered = usersList.filter((u) => {
    const matchesSearch = 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.telegramUsername && u.telegramUsername.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.telegramId && String(u.telegramId).includes(searchTerm)) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterActive24hOnly && (!u.lastActiveTime || now - u.lastActiveTime > TWENTY_FOUR_HOURS_MS)) return false;
    if (filterWithReferralsOnly && u.inviteCount <= 0) return false;

    return true;
  });

  // Sorting Users
  filtered.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (valA === undefined || valA === null) valA = 0;
    if (valB === undefined || valB === null) valB = 0;

    if (sortOrder === 'desc') {
      return valB - valA;
    } else {
      return valA - valB;
    }
  });

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const diff = now - timestamp;
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
  };

  const handleExportCSV = () => {
    if (usersList.length === 0) return;
    const headers = ['User ID', 'Username', 'Telegram ID', 'Referrals', 'Real GRMF', 'Beta GRMF', 'Beta USDT', 'Joined At', 'Last Active'];
    const rows = usersList.map((u) => [
      u.id,
      `"${u.username.replace(/"/g, '""')}"`,
      u.telegramId || '',
      u.inviteCount,
      u.realGrmf,
      u.betaGrmf,
      u.betaUsdt,
      u.createdTime ? new Date(u.createdTime).toISOString() : '',
      u.lastActiveTime ? new Date(u.lastActiveTime).toISOString() : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GRMF_Admin_Users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Header & Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#24A1DE] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Firestore Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Real-time users, actual balances & live referral tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#24A1DE]" />
              <span>Users ({usersList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('referrals')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'referrals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Referrals ({referralsFeed.length})</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-bold transition-all active:scale-95"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Stats 4-Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Total Users */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Users</span>
            <div className="p-2 bg-blue-50 rounded-xl text-[#24A1DE]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {isLoading ? '...' : totalUsers.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">Live</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            Firestore User Documents
          </span>
        </div>

        {/* 24h Active Users */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Active (24h)</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {isLoading ? '...' : activeUsers24hCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">
              {totalUsers > 0 ? `${Math.round((activeUsers24hCount / totalUsers) * 100)}%` : '0%'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            Active in last 24 hrs
          </span>
        </div>

        {/* Total Referrals */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Invites</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-500">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {isLoading ? '...' : totalReferralsCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md">Invites</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            Successful Telegram Referrals
          </span>
        </div>

        {/* Total Real GRMF */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Real GRMF Circulating</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {isLoading ? '...' : totalRealGrmfCirculating.toLocaleString()}
            </span>
            <span className="text-[10px] text-indigo-600 font-bold uppercase">GRMF</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            Real Mainnet Balances
          </span>
        </div>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Control Bar: Search, Filters & Sorting */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by username, Telegram handle or UID..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#24A1DE]/20 focus:border-[#24A1DE]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Badges & Sort Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
              <button
                onClick={() => setFilterActive24hOnly(!filterActive24hOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                  filterActive24hOnly
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Active (24h)</span>
              </button>

              <button
                onClick={() => setFilterWithReferralsOnly(!filterWithReferralsOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                  filterWithReferralsOnly
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Has Invites (&gt;0)</span>
              </button>

              {/* Sort selector */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 py-1 px-2 focus:outline-none"
                >
                  <option value="inviteCount">Referrals (Highest)</option>
                  <option value="realGrmf">Real GRMF</option>
                  <option value="betaGrmf">Beta GRMF</option>
                  <option value="lastActiveTime">Last Active</option>
                  <option value="createdTime">Joined Date</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="p-1 text-slate-500 hover:text-slate-800 font-bold text-xs px-1.5"
                  title="Toggle Sort Direction"
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>
            </div>
          </div>

          {/* Users Table / Directory */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Real Users Database ({filtered.length} shown)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">
                Sorted by {sortBy === 'inviteCount' ? 'Referrals' : sortBy} ({sortOrder.toUpperCase()})
              </span>
            </div>

            {errorMsg && (
              <div className="p-4 bg-amber-50 text-amber-800 text-xs font-medium border-b border-amber-100">
                ⚠️ {errorMsg}
              </div>
            )}

            {isLoading ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#24A1DE]" />
                <p className="text-xs font-medium">Fetching real user profiles from Firestore...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No users match the search/filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 bg-slate-50/30">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4 text-center">Referrals (Invites)</th>
                      <th className="py-3 px-4 text-right">Real GRMF</th>
                      <th className="py-3 px-4 text-right">Beta Balances</th>
                      <th className="py-3 px-4 text-center">24h Status</th>
                      <th className="py-3 px-4 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filtered.map((user, idx) => {
                      const is24hActive = user.lastActiveTime && (now - user.lastActiveTime <= TWENTY_FOUR_HOURS_MS);

                      return (
                        <tr 
                          key={user.id} 
                          className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                          onClick={() => setSelectedUserModal(user)}
                        >
                          {/* Rank badge */}
                          <td className="py-3 px-4 font-black">
                            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-mono text-[11px]">
                              {idx === 0 ? '👑 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                            </div>
                          </td>

                          {/* User Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0 shadow-xs">
                                {user.username.slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate group-hover:text-[#24A1DE] transition-colors">
                                  {user.username}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                  <span>{user.telegramUsername ? `@${user.telegramUsername}` : user.id.slice(0, 8)}</span>
                                  {user.telegramId && <span className="text-[9px] bg-slate-100 px-1 rounded text-slate-500">ID: {user.telegramId}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Referrals */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                              user.inviteCount > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100 shadow-xs' : 'bg-slate-50 text-slate-400'
                            }`}>
                              <Trophy className="w-3 h-3" />
                              <span>{user.inviteCount} friends</span>
                            </span>
                          </td>

                          {/* Real GRMF */}
                          <td className="py-3 px-4 text-right">
                            <span className="font-black text-slate-900 font-mono text-sm">
                              {user.realGrmf.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-black text-emerald-600 block uppercase tracking-wider">REAL GRMF</span>
                          </td>

                          {/* Beta Balances */}
                          <td className="py-3 px-4 text-right">
                            <div className="font-bold text-slate-700 font-mono text-xs">
                              {user.betaGrmf.toLocaleString()} <span className="text-[9px] text-slate-400 font-normal">GRMF</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {user.betaUsdt} USDT • {user.betaGram} GRAM
                            </div>
                          </td>

                          {/* 24h Status */}
                          <td className="py-3 px-4 text-center">
                            {is24hActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active ({formatTimeAgo(user.lastActiveTime)})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                <span>Offline ({formatTimeAgo(user.lastActiveTime)})</span>
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right">
                            <button className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#24A1DE] hover:text-white transition-all text-[11px] font-bold">
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Referrals Audit Feed Tab */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Live Referrals Audit Stream</h3>
                <p className="text-[11px] text-slate-400 font-medium">Real-time referrals recorded in Firestore /referrals collection</p>
              </div>
            </div>

            <span className="bg-amber-50 text-amber-700 font-black text-xs px-2.5 py-1 rounded-xl border border-amber-200">
              {referralsFeed.length} Events Total
            </span>
          </div>

          {referralsFeed.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No referral audit logs found in /referrals collection yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {referralsFeed.map((refItem) => (
                <div 
                  key={refItem.id} 
                  className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-100/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                      refItem.isPremium ? 'bg-amber-400 text-slate-950' : 'bg-blue-500 text-white'
                    }`}>
                      {refItem.isPremium ? '⭐' : '👥'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {refItem.referredUsername || 'New User'}
                        </span>
                        {refItem.isPremium && (
                          <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md">
                            Premium
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Referred by ID: {refItem.referrerId || refItem.referrerTelegramId}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                    <div>
                      <span className="text-xs font-black text-emerald-600 block">
                        +{refItem.reward || 30} GRMF Referrer
                      </span>
                      <span className="text-[10px] text-blue-600 font-bold block">
                        +{refItem.friendReward || 10} GRMF Friend
                      </span>
                    </div>
                    
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap bg-white px-2 py-1 rounded-lg border border-slate-100">
                      {refItem.timeMs ? formatTimeAgo(refItem.timeMs) : 'Recently'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal for inspecting individual user */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl relative border border-slate-100 space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#24A1DE] text-white flex items-center justify-center font-black text-base shadow-md shadow-blue-500/20">
                  {selectedUserModal.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">{selectedUserModal.username}</h3>
                  <span className="text-[10px] text-slate-400 font-mono block">Document UID: {selectedUserModal.id}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-black flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Detailed Balances & Referrals */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">Total Referrals</span>
                <span className="text-xl font-black text-amber-600">{selectedUserModal.inviteCount} friends</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">Real GRMF Balance</span>
                <span className="text-xl font-black text-emerald-600">{selectedUserModal.realGrmf.toLocaleString()} GRMF</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">Telegram Username</span>
                <span className="font-bold text-slate-800 text-xs">
                  {selectedUserModal.telegramUsername ? `@${selectedUserModal.telegramUsername}` : 'Not linked'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">Telegram ID</span>
                <span className="font-mono text-slate-800 text-xs">{selectedUserModal.telegramId || 'None'}</span>
              </div>
            </div>

            {/* Beta Balances Card */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-2xl border border-blue-100 space-y-1.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Beta Testnet Balances</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-xl border border-blue-100">
                  <span className="text-[9px] text-slate-400 font-bold block">BETA GRMF</span>
                  <span className="text-xs font-black text-slate-900">{selectedUserModal.betaGrmf}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-blue-100">
                  <span className="text-[9px] text-slate-400 font-bold block">BETA USDT</span>
                  <span className="text-xs font-black text-slate-900">{selectedUserModal.betaUsdt}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-blue-100">
                  <span className="text-[9px] text-slate-400 font-bold block">BETA GRAM</span>
                  <span className="text-xs font-black text-slate-900">{selectedUserModal.betaGram}</span>
                </div>
              </div>
            </div>

            {/* Admin Reward & Task Action Panel */}
            <div className="p-4 bg-slate-900 text-white rounded-3xl space-y-3 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">Admin Reward Controls</span>
                </div>
                <span className="text-[9px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
                  Firestore Direct
                </span>
              </div>

              {/* Success / Error Message Banner */}
              {awardSuccessMsg && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] font-medium leading-tight">
                  {awardSuccessMsg}
                </div>
              )}

              {/* Quick Reward Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick Grant Tokens:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 50, 100, 500].map((amt) => (
                    <button
                      key={amt}
                      disabled={isAwarding}
                      onClick={() => handleAwardTokens(selectedUserModal, amt, 'real')}
                      className="py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50"
                    >
                      +{amt} GRMF
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Grant Input & Task Approval */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  value={customAwardAmount}
                  onChange={(e) => setCustomAwardAmount(e.target.value)}
                  placeholder="Custom amount..."
                  className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  disabled={isAwarding || !customAwardAmount}
                  onClick={() => handleAwardTokens(selectedUserModal, parseFloat(customAwardAmount) || 0, 'real')}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                >
                  {isAwarding ? 'Processing...' : 'Grant GRMF'}
                </button>
              </div>

              <div className="pt-1 border-t border-slate-800 flex items-center justify-between">
                <button
                  disabled={isAwarding}
                  onClick={() => handleApproveAllUserTasks(selectedUserModal)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Complete All Tasks (+10 GRMF)</span>
                </button>
              </div>
            </div>

            {/* Referred Users list if any */}
            {selectedUserModal.invitedUsers && selectedUserModal.invitedUsers.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Invited Friends List ({selectedUserModal.invitedUsers.length}):
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  {selectedUserModal.invitedUsers.map((inv: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{inv.username || inv.uid}</span>
                        {inv.isPremium && (
                          <span className="text-[8px] font-black bg-amber-100 text-amber-800 px-1 py-0.2 rounded">
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-black">+{inv.reward || 30} GRMF</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs">
                No friends invited yet by this user.
              </div>
            )}

            <button
              onClick={() => setSelectedUserModal(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95"
            >
              Close Details
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

