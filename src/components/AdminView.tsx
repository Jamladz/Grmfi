import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { openTelegramLink, triggerHaptic, getRawTelegramInitData } from '../lib/telegram';
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
  Clock,
  Copy,
  Check,
  Edit3,
  Send
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
  } else if (data.telegramIdStr && String(data.telegramIdStr).trim() !== '') {
    tgIdStr = String(data.telegramIdStr).trim();
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
    /^tg_\d+$/i.test(name) ||
    /^web_[a-zA-Z0-9_-]+$/i.test(name) ||
    name.toLowerCase() === 'anonymous' ||
    name.toLowerCase() === 'user' ||
    name.toLowerCase() === 'telegram user';

  const firstName = typeof data.firstName === 'string' ? data.firstName.trim() : '';
  const lastName = typeof data.lastName === 'string' ? data.lastName.trim() : '';
  const fullName = typeof data.fullName === 'string' && data.fullName.trim()
    ? data.fullName.trim()
    : `${firstName} ${lastName}`.trim();

  // Determine real Telegram @handle
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
  } else if (telegramHandle) {
    displayName = `@${telegramHandle}`;
  } else if (rawTgUsername && !isGeneratedPlaceholder(rawTgUsername)) {
    displayName = rawTgUsername;
  } else if (rawUsername && !isGeneratedPlaceholder(rawUsername)) {
    displayName = rawUsername;
  } else if (tgIdStr) {
    displayName = `Telegram User #${tgIdStr.slice(-5)}`;
  } else {
    displayName = rawUsername || `User #${docId.slice(-6)}`;
  }

  const isTelegramVerified = Boolean(
    tgIdStr ||
    docId.startsWith('tg_') ||
    data.isTelegramMiniApp ||
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
    Number(data.createdTimestamp) ||
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
      const preferCurrentId = user.id.startsWith('tg_') && !existing.id.startsWith('tg_');
      const isPlaceholderDisplay = (n: string) =>
        n.startsWith('Telegram User #') || n.startsWith('User #') || n.startsWith('user_');

      const bestDisplayName = !isPlaceholderDisplay(existing.displayName)
        ? existing.displayName
        : !isPlaceholderDisplay(user.displayName)
          ? user.displayName
          : existing.displayName;

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
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [userFilter, setUserFilter] = useState<'all' | 'telegram'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'referrals' | 'grmf' | 'newest'>('recent');
  const [visibleCount, setVisibleCount] = useState(150);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedWalletReqId, setCopiedWalletReqId] = useState<string | null>(null);
  const [processingWithdrawId, setProcessingWithdrawId] = useState<string | null>(null);
  const [sendingPmUserId, setSendingPmUserId] = useState<string | null>(null);

  const [botMau, setBotMau] = useState<number>(4329);
  const [isEditingMau, setIsEditingMau] = useState(false);
  const [mauInput, setMauInput] = useState('4329');

  const extraDiscoveredUsersRef = useRef<Map<string, any>>(new Map());
  const latestDocsRef = useRef<any[]>([]);

  const [stats, setStats] = useState({
    totalDocs: 0,
    uniqueUsers: 0,
    realTelegramUsers: 0,
    active24h: 0,
    totalReferrals: 0,
    totalGrmf: 0
  });

  const processUsersSnapshot = (docs: any[]) => {
    latestDocsRef.current = docs;
    const mergedDocsMap = new Map<string, any>();

    // 1. Add all documents from /users collection
    for (const d of docs) {
      mergedDocsMap.set(d.id, d.data());
    }

    // 2. Merge any users discovered in /referrals or /transactions
    extraDiscoveredUsersRef.current.forEach((val, docId) => {
      if (!mergedDocsMap.has(docId)) {
        mergedDocsMap.set(docId, val);
      } else {
        const current = mergedDocsMap.get(docId);
        mergedDocsMap.set(docId, {
          ...val,
          ...current,
          telegramId: current.telegramId || val.telegramId || null,
          username: (current.username && !String(current.username).startsWith('user_')) ? current.username : (val.username || current.username || null),
          telegramUsername: current.telegramUsername || val.telegramUsername || null,
          firstName: current.firstName || val.firstName || null
        });
      }
    });

    const normalized = Array.from(mergedDocsMap.entries()).map(([id, data]) =>
      normalizeUserDoc(id, data)
    );
    const deduplicated = deduplicateUsers(normalized);

    const realTgUsers = deduplicated.filter((u) => u.isTelegramVerified);
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const active24hCount = deduplicated.filter((u) => u.lastActiveTimestamp >= twentyFourHoursAgo).length;
    const sumReferrals = deduplicated.reduce((acc, u) => acc + (u.referralsCount || 0), 0);
    const sumGrmf = deduplicated.reduce((acc, u) => acc + (u.grmfBalance || 0), 0);

    setAllUsers(deduplicated);
    setStats({
      totalDocs: docs.length,
      uniqueUsers: deduplicated.length,
      realTelegramUsers: realTgUsers.length,
      active24h: active24hCount,
      totalReferrals: sumReferrals,
      totalGrmf: Math.round(sumGrmf)
    });
  };

  const fetchAuxData = async () => {
    setLoading(true);
    try {
      // 1. Fetch global/stats for BotFather MAU
      try {
        const statsSnap = await getDoc(doc(db, 'global', 'stats'));
        if (statsSnap.exists()) {
          const sData = statsSnap.data();
          if (typeof sData.botMau === 'number' && sData.botMau > 0) {
            setBotMau(sData.botMau);
            setMauInput(String(sData.botMau));
          }
        }
      } catch (e) {}

      // 2. Cross-reference referrals and transactions to recover any historical entrants
      try {
        const [refSnap, txSnap] = await Promise.all([
          getDocs(query(collection(db, 'referrals'), limit(2000))),
          getDocs(query(collection(db, 'transactions'), limit(2000)))
        ]);

        refSnap.docs.forEach((rDoc) => {
          const r = rDoc.data();
          if (r.referredId) {
            const existing = extraDiscoveredUsersRef.current.get(r.referredId) || {};
            extraDiscoveredUsersRef.current.set(r.referredId, {
              ...existing,
              username: r.referredUsername || existing.username || null,
              telegramUsername: r.referredTelegramUsername || r.referredUsername || existing.telegramUsername || null,
              telegramId: r.referredTelegramId || existing.telegramId || null,
              isTelegramMiniApp: true,
              createdTimestamp: r.createdAt?.toMillis ? r.createdAt.toMillis() : existing.createdTimestamp || 0
            });
          }
        });

        txSnap.docs.forEach((tDoc) => {
          const t = tDoc.data();
          if (t.userId) {
            const existing = extraDiscoveredUsersRef.current.get(t.userId) || {};
            const validUsername =
              t.username && t.username !== 'User' && !String(t.username).startsWith('user_')
                ? t.username
                : existing.username || t.username || null;
            extraDiscoveredUsersRef.current.set(t.userId, {
              ...existing,
              username: validUsername,
              telegramUsername: validUsername && !String(validUsername).includes(' ') ? validUsername : existing.telegramUsername || null,
              firstName: t.firstName || existing.firstName || null,
              telegramId: t.telegramId || existing.telegramId || null,
              isTelegramMiniApp: Boolean(t.telegramId || existing.isTelegramMiniApp),
              lastActiveTimestamp: Math.max(Number(t.timestamp) || 0, existing.lastActiveTimestamp || 0)
            });
          }
        });

        if (latestDocsRef.current.length > 0) {
          processUsersSnapshot(latestDocsRef.current);
        }
      } catch (e) {}
    } catch (e) {
      console.error('Admin fetchAuxData error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Real-time listeners on users and withdrawal_requests collections
  useEffect(() => {
    fetchAuxData();

    const qLive = query(collection(db, 'users'), limit(5000));
    const unsubUsers = onSnapshot(
      qLive,
      (snap) => {
        processUsersSnapshot(snap.docs);
        setLoading(false);
      },
      (err) => {
        console.warn('Admin live listener warning:', err);
        setLoading(false);
      }
    );

    const qWithdraw = query(collection(db, 'withdrawal_requests'), limit(300));
    const unsubWithdrawals = onSnapshot(
      qWithdraw,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => {
          const tsA =
            a.createdTimestamp ||
            a.createdAt?.toMillis?.() ||
            (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const tsB =
            b.createdTimestamp ||
            b.createdAt?.toMillis?.() ||
            (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return tsB - tsA;
        });
        setWithdrawals(list);
      },
      (err) => {
        console.warn('Admin withdrawals listener warning:', err);
      }
    );

    return () => {
      unsubUsers();
      unsubWithdrawals();
    };
  }, []);

  const handleSaveBotMau = async () => {
    const parsed = parseInt(mauInput.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed) || parsed < 0) return;
    triggerHaptic('success');
    setBotMau(parsed);
    setIsEditingMau(false);
    try {
      await setDoc(
        doc(db, 'global', 'stats'),
        { botMau: parsed, lastUpdatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {}
  };

  const handleWithdrawalStatus = async (reqItem: any, status: 'completed' | 'rejected') => {
    if (!reqItem?.id) return;
    triggerHaptic('medium');
    setProcessingWithdrawId(reqItem.id);
    try {
      const nowTs = Date.now();
      await updateDoc(doc(db, 'withdrawal_requests', reqItem.id), {
        status,
        updatedAt: serverTimestamp(),
        updatedTimestamp: nowTs,
        ...(status === 'completed' ? { completedAt: serverTimestamp(), completedTimestamp: nowTs } : {})
      });

      // If rejected, refund the presale balance back to the user's Presale Vault
      if (status === 'rejected' && reqItem.userId && Number(reqItem.amount) > 0) {
        await setDoc(
          doc(db, 'users', reqItem.userId),
          {
            presaleBalances: {
              GRMF: increment(Number(reqItem.amount))
            }
          },
          { merge: true }
        ).catch(() => {});
      }

      setWithdrawals((prev) =>
        prev.map((w) => (w.id === reqItem.id ? { ...w, status, updatedTimestamp: nowTs } : w))
      );
      triggerHaptic('success');
      setAdminNotice(
        status === 'completed'
          ? `Withdrawal #${String(reqItem.id).slice(0, 6).toUpperCase()} confirmed as sent (${Number(reqItem.amount || 0).toLocaleString()} GRMF).`
          : `Withdrawal #${String(reqItem.id).slice(0, 6).toUpperCase()} declined and refunded to user vault.`
      );
      setTimeout(() => setAdminNotice(null), 4000);
    } catch (e) {
      console.error(e);
      triggerHaptic('error');
      setAdminNotice('Failed to update withdrawal status.');
      setTimeout(() => setAdminNotice(null), 3500);
    } finally {
      setProcessingWithdrawId(null);
    }
  };

  const handleCopyWalletAddress = (reqId: string, address: string) => {
    if (!address) return;
    triggerHaptic('light');
    try {
      navigator.clipboard.writeText(address.trim());
      setCopiedWalletReqId(reqId);
      setTimeout(() => setCopiedWalletReqId(null), 2200);
    } catch (e) {}
  };

  const handleCopyId = (idText: string) => {
    triggerHaptic('light');
    try {
      navigator.clipboard.writeText(idText);
      setCopiedId(idText);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (e) {}
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
      return (b.lastActiveTimestamp || 0) - (a.lastActiveTimestamp || 0);
    });
  }, [allUsers, userFilter, search, sortBy]);

  const displayedUsers = filteredAndSortedUsers.slice(0, visibleCount);

  const formatLastActive = (timestamp: number) => {
    if (!timestamp) return 'Active';
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

  const effectiveBotMau = Math.max(botMau, stats.uniqueUsers);

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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Admin Console
              </h2>
              <span className="text-[11px] font-bold text-[#0088CC] bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200/60">
                @sekanedr_is
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Telegram Bot MAU ({effectiveBotMau.toLocaleString()}) · Live Firestore Sync
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            triggerHaptic('light');
            fetchAuxData();
          }}
          disabled={loading}
          className="min-h-[40px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Sync Now</span>
        </button>
      </div>

      {/* Live Verified KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Card 1: Official Telegram Bot MAU (4,329+) */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-300 truncate">Telegram Bot MAU</span>
            <button
              onClick={() => setIsEditingMau(!isEditingMau)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-sky-400 cursor-pointer"
              title="Sync BotFather MAU"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          {isEditingMau ? (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                value={mauInput}
                onChange={(e) => setMauInput(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white outline-none"
              />
              <button
                onClick={handleSaveBotMau}
                className="px-2 py-1 bg-[#0088CC] text-white rounded-lg text-[11px] font-bold cursor-pointer"
              >
                Save
              </button>
            </div>
          ) : (
            <div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-white tracking-tight">
                {effectiveBotMau.toLocaleString()}
              </div>
              <span className="text-[11px] font-medium text-sky-400 block mt-0.5 truncate">
                BotFather Monthly Users
              </span>
            </div>
          )}
        </div>

        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-[#0088CC]" />}
          value={stats.uniqueUsers.toLocaleString()}
          label="Synced DB Profiles"
          subLabel={`${stats.realTelegramUsers.toLocaleString()} With TG Identity`}
        />
        <StatCard
          icon={<Activity className="w-4 h-4 text-emerald-600" />}
          value={stats.active24h.toLocaleString()}
          label="Active (24h)"
          subLabel="Opened in last 24h"
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
          Synced Users Directory ({userFilter === 'telegram' ? stats.realTelegramUsers : stats.uniqueUsers})
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
                  placeholder="Search by Telegram name, @username, or Telegram ID..."
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
                    onClick={() => setUserFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      userFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({stats.uniqueUsers})
                  </button>
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
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="recent">Recently Active</option>
                  <option value="newest">Newest Joined</option>
                  <option value="referrals">Top Referrers</option>
                  <option value="grmf">Top Balance</option>
                </select>
              </div>
            </div>
          </div>

          {/* Column Header */}
          <div className="bg-slate-50/80 px-4 py-2.5 flex items-center justify-between border-b border-slate-100 text-[11px] font-bold text-slate-400">
            <span>Telegram User Identity ({filteredAndSortedUsers.length} synced · {effectiveBotMau.toLocaleString()} Bot MAU)</span>
            <span>Holdings & Referrals</span>
          </div>

          {/* Users Tap-List */}
          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto no-scrollbar">
            {loading && displayedUsers.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400">
                Loading real user directory from Firestore...
              </div>
            ) : displayedUsers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-2">
                <Users className="w-7 h-7 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No matching users found</p>
                <p className="text-xs text-slate-400">
                  Try clearing your search filter.
                </p>
              </div>
            ) : (
              displayedUsers.map((user, index) => {
                const isOnline = user.lastActiveTimestamp > Date.now() - 5 * 60 * 1000;
                const cleanInitial = (user.displayName?.replace(/^@/, '')[0] || 'U').toUpperCase();

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
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-2xl object-cover border border-slate-200/80"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 font-extrabold text-sm flex items-center justify-center border border-slate-200/60">
                            {cleanInitial}
                          </div>
                        )}
                        {isOnline && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"
                            title="Online now"
                          />
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
                          {(user.raw?.writeAccessGranted || user.raw?.allowsWriteToPm) && user.telegramId && (
                            <button
                              type="button"
                              disabled={sendingPmUserId === user.telegramId}
                              onClick={async () => {
                                triggerHaptic('light');
                                const rawInitData = getRawTelegramInitData();
                                if (!rawInitData) {
                                  setAdminNotice('Open Admin Console inside Telegram Mini App to send Bot API messages.');
                                  setTimeout(() => setAdminNotice(null), 4000);
                                  return;
                                }
                                setSendingPmUserId(user.telegramId);
                                try {
                                  const resp = await fetch('/api/telegram/send-message', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      initData: rawInitData,
                                      targetTelegramId: user.telegramId,
                                      text: `🚀 <b>GRMF Fi Official Update</b>\n\nHello ${user.displayName}! Don't miss the limited-time +60,000 GRMF 5-Friends Referral Flash Offer inside the Mini App!`
                                    })
                                  });
                                  const data = await resp.json();
                                  if (resp.ok && data?.ok) {
                                    triggerHaptic('success');
                                    setAdminNotice(`Bot message sent to ${user.displayName} (#${user.telegramId})`);
                                  } else {
                                    triggerHaptic('error');
                                    setAdminNotice(data?.error || 'Failed to send bot message');
                                  }
                                } catch (e) {
                                  setAdminNotice('Network error while sending bot message');
                                } finally {
                                  setSendingPmUserId(null);
                                  setTimeout(() => setAdminNotice(null), 4000);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="User granted write access — Click to send official Bot API message"
                            >
                              <Send className="w-2.5 h-2.5" />
                              <span>{sendingPmUserId === user.telegramId ? 'Sending...' : 'PM Allowed'}</span>
                            </button>
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
                            <span className="text-slate-400 text-[11px]">No @username</span>
                          )}

                          {user.telegramId ? (
                            <>
                              <span className="text-slate-300">·</span>
                              <button
                                onClick={() => handleCopyId(user.telegramId!)}
                                className="inline-flex items-center gap-1 font-mono tabular-nums text-[11px] text-slate-600 hover:text-slate-900 cursor-pointer"
                                title="Copy Telegram ID"
                              >
                                <span>TG ID: {user.telegramId}</span>
                                {copiedId === user.telegramId ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 text-slate-400" />
                                )}
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono tabular-nums text-[11px] text-slate-400">
                                ID: {user.id.slice(0, 10)}
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
                onClick={() => setVisibleCount((prev) => prev + 150)}
                className="min-h-[38px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                Show More Users ({filteredAndSortedUsers.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Withdrawal Requests Management Tab */
        <div className="flex flex-col gap-3.5">
          {/* Withdrawal Summary & Filter Controls Bar */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Pending Action</span>
                <span className="text-sm font-extrabold font-mono tabular-nums text-amber-600">
                  {withdrawals.filter((w) => !w.status || w.status === 'pending').length} Requests
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 font-semibold block">Confirmed Sent</span>
                <span className="text-sm font-extrabold font-mono tabular-nums text-emerald-600">
                  {withdrawals.filter((w) => w.status === 'approved' || w.status === 'completed').length} Settled
                </span>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              {[
                { id: 'all', label: `All (${withdrawals.length})` },
                {
                  id: 'pending',
                  label: `Pending (${withdrawals.filter((w) => !w.status || w.status === 'pending').length})`
                },
                {
                  id: 'completed',
                  label: `Confirmed (${withdrawals.filter((w) => w.status === 'approved' || w.status === 'completed').length})`
                },
                {
                  id: 'rejected',
                  label: `Declined (${withdrawals.filter((w) => w.status === 'rejected').length})`
                }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setWithdrawalFilter(tab.id as any);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    withdrawalFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden divide-y divide-slate-100">
            {(() => {
              const filteredWithdrawals = withdrawals.filter((w) => {
                const st = String(w.status || 'pending').toLowerCase();
                if (withdrawalFilter === 'pending') return st === 'pending' || st === 'processing';
                if (withdrawalFilter === 'completed') return st === 'approved' || st === 'completed';
                if (withdrawalFilter === 'rejected') return st === 'rejected';
                return true;
              });

              if (filteredWithdrawals.length === 0) {
                return (
                  <div className="p-14 text-center flex flex-col items-center gap-2">
                    <DollarSign className="w-7 h-7 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">No Matching Withdrawal Requests</p>
                    <p className="text-xs text-slate-400">
                      Presale withdrawal requests from users will appear here in real time.
                    </p>
                  </div>
                );
              }

              return filteredWithdrawals.map((w) => {
                const st = String(w.status || 'pending').toLowerCase();
                const isCompleted = st === 'approved' || st === 'completed';
                const isRejected = st === 'rejected';
                const isPending = !isCompleted && !isRejected;
                const matchedUser = allUsers.find((u) => u.id === w.userId);
                const userLabel =
                  matchedUser?.displayName ||
                  (w.username ? `@${String(w.username).replace(/^@/, '')}` : null) ||
                  w.userId;
                const tgIdLabel = matchedUser?.telegramId || w.telegramId || null;
                const amountNum = Number(w.amount) || 0;
                const tonEquivalent = (amountNum / 500).toFixed(2);
                const isCopied = copiedWalletReqId === w.id;
                const isProcessingThis = processingWithdrawId === w.id;

                return (
                  <div
                    key={w.id}
                    className="p-5 flex flex-col gap-3.5 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Header: Amount, User Identity & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-2 font-mono tabular-nums">
                          <span className="text-lg font-extrabold text-slate-900">
                            {amountNum.toLocaleString()} {w.currency || 'GRMF'}
                          </span>
                          <span className="text-xs font-bold text-[#0088CC]">
                            · ≈ {tonEquivalent} TON
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 mt-1">
                          <span className="font-bold text-slate-800">{userLabel}</span>
                          {tgIdLabel && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono tabular-nums">TG ID: {tgIdLabel}</span>
                            </>
                          )}
                          <span className="text-slate-300">·</span>
                          <span className="font-mono tabular-nums text-slate-400">
                            Ref #{String(w.id).slice(0, 6).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            <span>Confirmed Sent</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                            <XCircle className="w-4 h-4 shrink-0" />
                            <span>Declined & Refunded</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span>Pending Transfer</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* TON Recipient Wallet Address Box with One-Click Copy Button */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">
                          Recipient TON Wallet Address (Send {amountNum.toLocaleString()} GRMF)
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900 break-all block">
                          {w.recipientAddress || '—'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyWalletAddress(w.id, w.recipientAddress)}
                        className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Address Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Wallet Address</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Admin Action Buttons: Confirm Sent or Reject & Refund */}
                    {isPending && (
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => handleWithdrawalStatus(w, 'completed')}
                          className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            {isProcessingThis
                              ? 'Confirming...'
                              : `Confirm Withdrawal Sent (${amountNum.toLocaleString()} GRMF)`}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => handleWithdrawalStatus(w, 'rejected')}
                          className="sm:w-44 min-h-[44px] bg-slate-100 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Decline & Refund</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
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
