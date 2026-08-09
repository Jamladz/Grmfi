import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, updateDoc, doc, getCountFromServer, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Search, RefreshCw, Activity, DollarSign, UserPlus, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

export const AdminView: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'withdrawals'>('users');
  const [stats, setStats] = useState({
    totalUsers: 0,
    active24h: 0,
    totalReferrals: 0,
    totalGrmf: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users sorted by last active for the list
      const qUsers = query(collection(db, 'users'), orderBy('lastActiveTimestamp', 'desc'), limit(100));
      const snapUsers = await getDocs(qUsers);
      const usersData = snapUsers.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setUsers(usersData);

      // Fetch global stats using count queries for accuracy
      const totalUsersSnap = await getCountFromServer(collection(db, 'users'));
      
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const active24hQuery = query(collection(db, 'users'), where('lastActiveTimestamp', '>', twentyFourHoursAgo));
      const active24hSnap = await getCountFromServer(active24hQuery);

      // Estimate total tokens and referrals from the fetched sample
      const localTotalGrmf = usersData.reduce((acc: number, u: any) => acc + (u.realBalances?.GRMF || 0), 0);
      const localTotalRefs = usersData.reduce((acc: number, u: any) => acc + (u.referralCount || 0), 0);

      setStats({
        totalUsers: totalUsersSnap.data().count,
        active24h: active24hSnap.data().count,
        totalReferrals: localTotalRefs, // Note: This is from top 100
        totalGrmf: localTotalGrmf     // Note: This is from top 100
      });

      const qWithdraw = query(collection(db, 'withdrawal_requests'), orderBy('createdAt', 'desc'), limit(50));
      const snapWithdraw = await getDocs(qWithdraw);
      setWithdrawals(snapWithdraw.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWithdrawalStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'withdrawal_requests', id), { status });
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status } : w));
    } catch (e) {
      console.error(e);
      alert('Failed to update status. Only admins can do this.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.id.includes(search) || 
    u.username?.toLowerCase().includes(search.toLowerCase()) || 
    u.telegramUsername?.toLowerCase().includes(search.toLowerCase()) ||
    u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    u.telegramId?.toString().includes(search)
  );

  const formatLastActive = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="p-4 flex flex-col gap-4 pb-20 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-white p-5 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">Admin Console</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">System Live</p>
            </div>
          </div>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 active:scale-95 transition-all border border-slate-200/50 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          icon={<Users className="w-4 h-4 text-blue-500" />} 
          value={stats.totalUsers.toLocaleString()} 
          label="Total Base" 
          color="blue"
        />
        <StatCard 
          icon={<Activity className="w-4 h-4 text-emerald-500" />} 
          value={stats.active24h.toLocaleString()} 
          label="Active 24h" 
          color="emerald"
        />
        <StatCard 
          icon={<UserPlus className="w-4 h-4 text-purple-500" />} 
          value={stats.totalReferrals.toLocaleString()} 
          label="Referrals" 
          subLabel="Sample Top 100"
          color="purple"
        />
        <StatCard 
          icon={<DollarSign className="w-4 h-4 text-amber-500" />} 
          value={stats.totalGrmf.toLocaleString()} 
          label="Total GRMF" 
          unit="T"
          subLabel="Sample Top 100"
          color="amber"
        />
      </div>

      <div className="flex bg-slate-100/80 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200/50 shadow-inner">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
            activeTab === 'users' ? 'bg-white text-slate-900 shadow-md border border-slate-100' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Users List
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
            activeTab === 'withdrawals' ? 'bg-white text-slate-900 shadow-md border border-slate-100' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Requests
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center gap-4 bg-slate-50/30">
            <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search by Name, TG Username or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 font-bold placeholder:text-slate-400/70"
            />
          </div>
          
          <div className="flex flex-col max-h-[600px] overflow-y-auto no-scrollbar">
            <div className="bg-slate-50/80 px-6 py-3 flex items-center justify-between border-b border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User Profile & Activity</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tokens & Refs</span>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-dashed border-slate-200">
                  <Users className="w-8 h-8 text-slate-200" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-bold">No Users Found</p>
                  <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest mt-1">Refine your search</p>
                </div>
              </div>
            ) : (
              filteredUsers.map((user, index) => (
                <div key={user.id} className="px-6 py-5 border-b border-slate-50 flex items-center justify-between hover:bg-blue-50/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-black text-slate-500 border border-slate-200 group-hover:from-blue-500 group-hover:to-blue-600 group-hover:text-white group-hover:border-blue-400 transition-all shadow-sm">
                        {user.username?.[0]?.toUpperCase() || user.firstName?.[0]?.toUpperCase() || index + 1}
                      </div>
                      {user.lastActiveTimestamp > Date.now() - 300000 && (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">
                          {user.firstName || ''} {user.lastName || ''}
                        </span>
                        {user.isPremium && (
                          <span className="w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center text-[6px] text-white">⭐</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-blue-600">
                          @{user.telegramUsername || user.username || 'Anonymous'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold px-1.5 py-0.5 bg-slate-100 rounded-md">
                          {formatLastActive(user.lastActiveTimestamp)}
                        </span>
                      </div>
                      <span className="text-[8px] text-slate-300 font-mono tracking-tight mt-1 truncate max-w-[120px]">{user.id}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-baseline gap-1 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100 group-hover:bg-blue-100 transition-colors">
                      <span className="text-sm font-black text-blue-700">{(user.realBalances?.GRMF || 0).toLocaleString()}</span>
                      <span className="text-[8px] font-black text-blue-400 uppercase">GRMF</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Users className="w-2.5 h-2.5 text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-bold">{user.referralCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="w-2.5 h-2.5 text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-bold">{user.xp || 0} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col">
          <div className="flex flex-col max-h-[600px] overflow-y-auto no-scrollbar">
            {withdrawals.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-dashed border-slate-200">
                  <DollarSign className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No Pending Requests</p>
              </div>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="p-6 border-b border-slate-50 flex flex-col gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 text-amber-600">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-slate-900">{w.amount}</span>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{w.currency}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold mt-0.5">ID: {w.userId}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border-2 ${
                      w.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' :
                      w.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {w.status}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Address</span>
                    <span className="text-[11px] font-mono font-bold text-slate-600 break-all leading-relaxed">{w.recipientAddress}</span>
                  </div>

                  {w.status === 'pending' && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleWithdrawalStatus(w.id, 'approved')}
                        className="flex-1 py-3.5 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button 
                        onClick={() => handleWithdrawalStatus(w.id, 'rejected')}
                        className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, value, label, unit, subLabel, color }: { icon: React.ReactNode, value: string, label: string, unit?: string, subLabel?: string, color: string }) => (
  <div className="bg-white p-4 rounded-[1.75rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col gap-1.5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
    <div className={`absolute -top-6 -right-6 w-16 h-16 bg-${color}-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform`} />
    <div className="flex items-center gap-2.5 relative z-10">
      <div className={`p-2 bg-${color}-50 rounded-xl border border-${color}-100 group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon as React.ReactElement<any>, { className: `w-4 h-4 text-${color}-600` })}
      </div>
      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-baseline gap-1 mt-1 relative z-10">
      <span className="text-xl font-black text-slate-900 tracking-tight">{value}</span>
      {unit && <span className={`text-[10px] font-black text-${color}-500 uppercase`}>{unit}</span>}
    </div>
    {subLabel && <span className="text-[8px] text-slate-300 font-black uppercase tracking-tighter mt-0.5">{subLabel}</span>}
  </div>
);

