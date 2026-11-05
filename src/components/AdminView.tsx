import React, { useEffect, useState, useMemo } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  doc,
  getCountFromServer,
  setDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { openTelegramLink, triggerHaptic } from '../lib/telegram';
import {
  Users,
  Search,
  RefreshCw,
  Activity,
  DollarSign,
  UserPlus,
  CheckCircle,
  XCircle,
  TrendingUp,
  ExternalLink,
  ShieldCheck,
  Clock
} from 'lucide-react';

interface NormalizedAdminUser {
  id: string;
  telegramId: string | null;
  displayName: string;
  telegramHandle: string | null;
  photoUrl: string | null;
  isPremium: boolean;
  isTelegramVerified: boolean;
  grmfBalance: number;
  referralsCount: number;
  xp: number;
  lastActiveTimestamp: number;
  createdTimestamp: number;
  raw: any;
}

function normalizeUserDoc(docId: string, rawData: any): NormalizedAdminUser {
  const data: Record<string, any> = { ...rawData };

  // Expand any dot-notated keys (e.g. "realBalances.GRMF") into nested objects
  Object.keys(rawData || {}).forEach((key) => {
    if (key.includes('.')) {
      const parts = key.split('.');
      let curr = data;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!curr[p] || typeof curr[p] !== 'object') {
          curr[p] = {};
        } else {
          curr[p] = { ...curr[p] };
        }
        curr = curr[p];
      }
      const last = parts[parts.length - 1];
      const val = rawData[key];
      if (typeof val === 'number' && typeof curr[last] === 'number') {
        curr[last] = Math.max(curr[last], val);
      } else if (curr[last] === undefined || curr[last] === null) {
        curr[last] = val;
      }
    }
  });

  // Extract Telegram ID from field or from document ID "tg_123456789"
  let tgIdStr: string | null = null;
  if (data.telegramId !== undefined && data.telegramId !== null && String(data.telegramId).trim() !== '') {
    tgIdStr = String(data.telegramId).trim();
  } else if (docId.startsWith('tg_')) {
    const extracted = docId.replace(/^tg_/, '').trim();
    if (/^\d+$/.test(extracted)) {
      tgIdStr = extracted;
    }
  }

  // Clean username / handle
  const rawTgUsername = typeof data.telegramUsername === 'string' ? data.telegramUsername.replace(/^@/, '').trim() : '';
  const rawUsername = typeof data.username === 'string' ? data.username.replace(/^@/, '').trim() : '';
  const isGeneratedPlaceholder = (name: string) =>
    !name ||
    /^user_[a-zA-Z0-9_-]+$/i.test(name) ||
    name.toLowerCase() === 'anonymous' ||
    name.toLowerCase() === 'user' ||
    name.toLowerCase() === 'telegram user';

  const firstName = typeof data.firstName === 'string' ? data.firstName.trim() : '';
  const lastName = typeof data.lastName === 'string' ? data.lastName.trim() : '';
  const fullName = typeof data.fullName === 'string' && data.fullName.trim()
    ? data.fullName.trim()
    : `${firstName} ${lastName}`.trim();

  // Determine real Telegram @handle (if it looks like a valid handle without spaces and not a placeholder)
  let telegramHandle: string | null = null;
  if (rawTgUsername && !isGeneratedPlaceholder(rawTgUsername) && !rawTgUsername.includes(' ')) {
    telegramHandle = rawTgUsername;
  } else if (rawUsername && !isGeneratedPlaceholder(rawUsername) && !rawUsername.includes(' ')) {
    telegramHandle = rawUsername;
  }

  // Determine best human-readable Display Name
  let displayName = '';
  if (fullName) {
    displayName = fullName;
  } else if (rawTgUsername && !isGeneratedPlaceholder(rawTgUsername)) {
    displayName = rawTgUsername;
  } else if (rawUsername && !isGeneratedPlaceholder(rawUsername)) {
    displayName = rawUsername;
  } else if (tgIdStr) {
    displayName = `Telegram #${tgIdStr}`;
  } else {
    displayName = rawUsername || `User #${docId.slice(-6)}`;
  }

  const isTelegramVerified = Boolean(
    tgIdStr ||
    docId.startsWith('tg_') ||
    telegramHandle ||
    firstName
  );

  // Balances & Referrals
  const grmfBalance = Math.max(
    Number(data.realBalances?.GRMF) || 0,
    Number(data.betaBalances?.GRMF) || 0,
    Number(data['realBalances.GRMF']) || 0
  );

  const referralsArrayLen = Array.isArray(data.referrals) ? data.referrals.length : 0;
  const referralsCount = Math.max(
    Number(data.referralsCount) || 0,
    Number(data.inviteCount) || 0,
    referralsArrayLen
  );

  const xp = Number(data.xp) || Number(data.points) || 0;

  // Timestamps
  const lastActiveTimestamp =
    Number(data.lastActiveTimestamp) ||
    (data.lastActiveAt?.toMillis ? data.lastActiveAt.toMillis() : 0) ||
    (data.createdAt?.toMillis ? data.createdAt.toMillis() : 0) ||
    0;

  const createdTimestamp =
    Number(data.createdTimestamp) ||
    (data.createdAt?.toMillis ? data.createdAt.toMillis() : 0) ||
    lastActiveTimestamp ||
    0;

  return {
    id: docId,
    telegramId: tgIdStr,
    displayName,
    telegramHandle,
    photoUrl: data.photoUrl || null,
    isPremium: Boolean(data.isPremium),
    isTelegramVerified,
    grmfBalance,
    referralsCount,
    xp,
    lastActiveTimestamp,
    createdTimestamp,
    raw: data
  };
}

/**
 * Deduplicate records that belong to the same Telegram User ID
 * (e.g., if an earlier build created both an anonymous UID doc and a tg_ID doc for the same Telegram account)
 */
function deduplicateUsers(rawUsers: NormalizedAdminUser[]): NormalizedAdminUser[] {
  const byTelegramId = new Map<string, NormalizedAdminUser>();
  const withoutTelegramId: NormalizedAdminUser[] = [];

  for (const user of rawUsers) {
    if (!user.telegramId) {
      withoutTelegramId.push(user);
      continue;
    }

    const existing = byTelegramId.get(user.telegramId);
    if (!existing) {
      byTelegramId.set(user.telegramId, user);
    } else {
      // Merge the two records for the same Telegram user, preferring canonical tg_ doc ID and non-empty names
      const preferCurrentId = user.id.startsWith('tg_') && !existing.id.startsWith('tg_');
      const bestDisplayName =
        !existing.displayName.startsWith('Telegram #') && !existing.displayName.startsWith('User #')
          ? existing.displayName
          : user.displayName;

      byTelegramId.set(user.telegramId, {
        ...existing,
        id: preferCurrentId ? user.id : existing.id,
        displayName: bestDisplayName,
        telegramHandle: existing.telegramHandle || user.telegramHandle,
        photoUrl: existing.photoUrl || user.photoUrl,
        isPremium: existing.isPremium || user.isPremium,
        isTelegramVerified: true,
        grmfBalance: Math.max(existing.grmfBalance, user.grmfBalance),
        referralsCount: Math.max(existing.referralsCount, user.referralsCount),
        xp: Math.max(existing.xp, user.xp),
        lastActiveTimestamp: Math.max(existing.lastActiveTimestamp, user.lastActiveTimestamp),
        createdTimestamp: Math.min(
          existing.createdTimestamp || Infinity,
          user.createdTimestamp || Infinity
        )
      });
    }
  }

  return [...Array.from(byTelegramId.values()), ...withoutTelegramId];
}

export const AdminView: React.FC = () => {
  const [allUsers, setAllUsers] = useState<NormalizedAdminUser[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'withdrawals'>('users');
  const [userFilter, setUserFilter] = useState<'telegram' | 'all'>('telegram');
  const [sortBy, setSortBy] = useState<'recent' | 'referrals' | 'grmf' | 'newest'>('recent');
  const [visibleCount, setVisibleCount] = useState(100);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalDocs: 0,
    uniqueUsers: 0,
    realTelegramUsers: 0,
    active24h: 0,
    totalReferrals: 0,
    totalGrmf: 0
  });

  const processUsersSnapshot = async (docs: any[], serverTotalCount?: number) => {
    const normalized = docs.map((d) => normalizeUserDoc(d.id, d.data()));
    const deduplicated = deduplicateUsers(normalized);

    const realTgUsers = deduplicated.filter((u) => u.isTelegramVerified);
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const active24hCount = deduplicated.filter((u) => u.lastActiveTimestamp >= twentyFourHoursAgo).length;
    const sumReferrals = deduplicated.reduce((acc, u) => acc + (u.referralsCount || 0), 0);
    const sumGrmf = deduplicated.reduce((acc, u) => acc + (u.grmfBalance || 0), 0);
    const exactTotalDocs = serverTotalCount ?? docs.length;

    setAllUsers(deduplicated);
    setStats({
      totalDocs: exactTotalDocs,
      uniqueUsers: deduplicated.length,
      realTelegramUsers: realTgUsers.length,
      active24h: active24hCount,
      totalReferrals: sumReferrals,
      totalGrmf: Math.round(sumGrmf)
    });

    // Keep global/stats document synchronized with real verified counts
    try {
      const statsRef = doc(db, 'global', 'stats');
      await setDoc(
        statsRef,
        {
          totalUsers: exactTotalDocs,
          uniqueUsers: deduplicated.length,
          realUsers: realTgUsers.length,
          active24h: active24hCount,
          totalReferrals: sumReferrals,
          totalGrmf: Math.round(sumGrmf),
          lastUpdatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (e) {
      // Ignore write error if non-admin or offline
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get exact server document count
      let serverCount = 0;
      try {
        const countSnap = await getCountFromServer(collection(db, 'users'));
        serverCount = countSnap.data().count;
      } catch (e) {}

      // 2. Fetch all user documents WITHOUT a restrictive orderBy that drops documents missing optional fields
      const qUsers = query(collection(db, 'users'), limit(5000));
      const snapUsers = await getDocs(qUsers);
      await processUsersSnapshot(snapUsers.docs, serverCount || snapUsers.size);

      // 3. Fetch withdrawal requests
      const qWithdraw = query(collection(db, 'withdrawal_requests'), orderBy('createdAt', 'desc'), limit(100));
      const snapWithdraw = await getDocs(qWithdraw);
      setWithdrawals(snapWithdraw.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Admin fetchData error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener on users collection so new Telegram entrants appear immediately
  useEffect(() => {
    fetchData();

    const qLive = query(collection(db, 'users'), limit(5000));
    const unsub = onSnapshot(
      qLive,
      (snap) => {
        processUsersSnapshot(snap.docs, snap.size);
        setLoading(false);
      },
      (err) => {
        console.warn('Admin live listener warning:', err);
      }
    );

    return () => unsub();
  }, []);

  const handleWithdrawalStatus = async (id: string, status: 'approved' | 'rejected') => {
    triggerHaptic('medium');
    try {
      await updateDoc(doc(db, 'withdrawal_requests', id), { status });
      setWithdrawals((prev) => prev.map((w) => (w.id === id ? { ...w, status } : w)));
    } catch (e) {
      console.error(e);
      setAdminNotice('Failed to update status. Only admins can perform this action.');
      setTimeout(() => setAdminNotice(null), 3500);
    }
  };

  // Filter and sort users client-side so zero users are ever dropped
  const filteredAndSortedUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    const baseList =
      userFilter === 'telegram'
        ? allUsers.filter((u) => u.isTelegramVerified)
        : allUsers;

    const searched = q
      ? baseList.filter(
          (u) =>
            u.displayName.toLowerCase().includes(q) ||
            (u.telegramHandle && u.telegramHandle.toLowerCase().includes(q)) ||
            (u.telegramId && u.telegramId.includes(q)) ||
            u.id.toLowerCase().includes(q)
        )
      : baseList;

    return [...searched].sort((a, b) => {
      if (sortBy === 'referrals') {
        if (b.referralsCount !== a.referralsCount) return b.referralsCount - a.referralsCount;
        return b.grmfBalance - a.grmfBalance;
      }
      if (sortBy === 'grmf') {
        if (b.grmfBalance !== a.grmfBalance) return b.grmfBalance - a.grmfBalance;
        return b.referralsCount - a.referralsCount;
      }
      if (sortBy === 'newest') {
        return (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
      }
      // Default: 'recent' (Last Active)
      return (b.lastActiveTimestamp || 0) - (a.lastActiveTimestamp || 0);
    });
  }, [allUsers, userFilter, search, sortBy]);

  const displayedUsers = filteredAndSortedUsers.slice(0, visibleCount);

  const formatLastActive = (timestamp: number) => {
    if (!timestamp) return 'New';
    const diff = Date.now() - timestamp;
    if (diff < 0) return 'Just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="flex flex-col gap-4 pb-16 max-w-5xl mx-auto">
      {adminNotice && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold">
          {adminNotice}
        </div>
      )}

      {/* Admin Header Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#0088CC]" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Admin Console
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live Firestore directory · Real Telegram Bot users & analytics
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            triggerHaptic('light');
            fetchData();
          }}
          disabled={loading}
          className="min-h-[40px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Live Verified KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <StatCard
          icon={<Users className="w-4 h-4 text-[#0088CC]" />}
          value={stats.realTelegramUsers.toLocaleString()}
          label="Telegram Users"
          subLabel="Verified Bot Entrants"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-slate-600" />}
          value={stats.totalDocs.toLocaleString()}
          label="Total Accounts"
          subLabel={`${stats.uniqueUsers.toLocaleString()} Unique Profiles`}
        />
        <StatCard
          icon={<Activity className="w-4 h-4 text-emerald-600" />}
          value={stats.active24h.toLocaleString()}
          label="Active (24h)"
          subLabel="Last 24 hours"
        />
        <StatCard
          icon={<UserPlus className="w-4 h-4 text-indigo-600" />}
          value={stats.totalReferrals.toLocaleString()}
          label="Total Referrals"
          subLabel="Verified Invites"
        />
        <StatCard
          icon={<DollarSign className="w-4 h-4 text-amber-600" />}
          value={stats.totalGrmf.toLocaleString()}
          label="Distributed GRMF"
          subLabel="Total User Holdings"
        />
      </div>

      {/* Primary View Switcher */}
      <div className="flex bg-slate-200/70 p-1 rounded-2xl">
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('users');
          }}
          className={`flex-1 min-h-[38px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Users Directory ({userFilter === 'telegram' ? stats.realTelegramUsers : stats.uniqueUsers})
        </button>
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('withdrawals');
          }}
          className={`flex-1 min-h-[38px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'withdrawals'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Withdrawal Requests ({withdrawals.length})
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Search Box */}
              <div className="flex-1 flex items-center gap-2.5 bg-white border border-slate-200/80 rounded-2xl px-3.5 py-2.5">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by real name, @username, or Telegram ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full text-slate-900 font-semibold placeholder:text-slate-400"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Filter & Sort Controls */}
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-200/70 p-0.5 rounded-xl">
                  <button
                    onClick={() => setUserFilter('telegram')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      userFilter === 'telegram'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Telegram ({stats.realTelegramUsers})
                  </button>
                  <button
                    onClick={() => setUserFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      userFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({stats.uniqueUsers})
                  </button>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="recent">Recently Active</option>
                  <option value="referrals">Top Referrers</option>
                  <option value="grmf">Top Balance</option>
                  <option value="newest">Newest Joined</option>
                </select>
              </div>
            </div>
          </div>

          {/* Column Header */}
          <div className="bg-slate-50/80 px-4 py-2.5 flex items-center justify-between border-b border-slate-100 text-[11px] font-bold text-slate-400">
            <span>User Identity & Telegram Handle ({filteredAndSortedUsers.length})</span>
            <span>Holdings & Referrals</span>
          </div>

          {/* Users Tap-List */}
          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto no-scrollbar">
            {loading && displayedUsers.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400">
                Loading real user directory from Firestore...
              </div>
            ) : displayedUsers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-2">
                <Users className="w-7 h-7 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No matching users found</p>
                <p className="text-xs text-slate-400">
                  Try clearing your search filter or switching to "All ({stats.uniqueUsers})".
                </p>
              </div>
            ) : (
              displayedUsers.map((user, index) => {
                const isOnline = user.lastActiveTimestamp > Date.now() - 5 * 60 * 1000;
                const initial = (user.displayName?.[0] || 'U').toUpperCase();

                return (
                  <div
                    key={user.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank & Avatar */}
                      <span className="w-6 text-xs font-mono tabular-nums font-bold text-slate-400 shrink-0 text-center">
                        {index + 1}
                      </span>

                      <div className="relative shrink-0">
                        {user.photoUrl ? (
                          <img
                            src={user.photoUrl}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-2xl object-cover border border-slate-200/80"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 font-extrabold text-sm flex items-center justify-center border border-slate-200/60">
                            {initial}
                          </div>
                        )}
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                        )}
                      </div>

                      {/* Identity Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {user.displayName}
                          </span>
                          {user.isPremium && (
                            <span className="text-[10px] font-bold text-amber-600" title="Telegram Premium">
                              ★
                            </span>
                          )}
                        </div>

                        <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-slate-500 font-medium mt-0.5">
                          {user.telegramHandle ? (
                            <button
                              onClick={() => openTelegramLink(`https://t.me/${user.telegramHandle}`)}
                              className="text-[#0088CC] hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>@{user.telegramHandle}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-slate-400">No @username</span>
                          )}

                          {user.telegramId && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono tabular-nums text-[11px] text-slate-500">
                                ID: {user.telegramId}
                              </span>
                            </>
                          )}

                          <span className="text-slate-300">·</span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono tabular-nums">
                            <Clock className="w-3 h-3" />
                            {formatLastActive(user.lastActiveTimestamp)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Metrics */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold font-mono tabular-nums text-slate-900">
                        {user.grmfBalance.toLocaleString()}{' '}
                        <span className="text-[11px] text-[#0088CC]">GRMF</span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5 font-mono tabular-nums">
                        <span className="font-bold text-emerald-600">{user.referralsCount}</span> Refs
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span>{user.xp} XP</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Load More Pagination */}
          {filteredAndSortedUsers.length > visibleCount && (
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 100)}
                className="min-h-[38px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                Show More Users ({filteredAndSortedUsers.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Withdrawal Requests Tab */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden divide-y divide-slate-100">
          {withdrawals.length === 0 ? (
            <div className="p-14 text-center flex flex-col items-center gap-2">
              <DollarSign className="w-7 h-7 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No Pending Withdrawal Requests</p>
            </div>
          ) : (
            withdrawals.map((w) => (
              <div key={w.id} className="p-5 flex flex-col gap-3.5 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                      <span className="text-lg font-extrabold text-slate-900">{w.amount}</span>
                      <span className="text-xs font-bold text-[#0088CC] uppercase">{w.currency}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono tabular-nums mt-0.5 block">
                      User ID: {w.userId}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold capitalize px-3 py-1 rounded-xl ${
                      w.status === 'pending'
                        ? 'bg-amber-50 text-amber-700'
                        : w.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {w.status}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    TON Recipient Address
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-700 break-all">
                    {w.recipientAddress}
                  </span>
                </div>

                {w.status === 'pending' && (
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleWithdrawalStatus(w.id, 'approved')}
                      className="flex-1 min-h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleWithdrawalStatus(w.id, 'rejected')}
                      className="flex-1 min-h-[42px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const StatCard = ({
  icon,
  value,
  label,
  subLabel
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  subLabel?: string;
}) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-2">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold text-slate-500 truncate">{label}</span>
      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0">
        {icon}
      </div>
    </div>
    <div>
      <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 tracking-tight">
        {value}
      </div>
      {subLabel && (
        <span className="text-[11px] font-medium text-slate-400 block mt-0.5 truncate">
          {subLabel}
        </span>
      )}
    </div>
  </div>
);
