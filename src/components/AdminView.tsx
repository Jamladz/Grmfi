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
      // Fetch users sorted by referralCount descending for the list
      const qUsers = query(collection(db, 'users'), orderBy('referralCount', 'desc'), limit(100));
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
    u.telegramId?.toString().includes(search)
  );

  return (
    <div className="p-4 flex flex-col gap-4 pb-20">
      <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Admin Dashboard</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time Analytics</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2.5 bg-slate-800 rounded-xl hover:bg-slate-700 active:scale-95 transition-all border border-slate-700">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          icon={<Users className="w-4 h-4 text-blue-500" />} 
          value={stats.totalUsers.toLocaleString()} 
          label="Total Users" 
        />
        <StatCard 
          icon={<Activity className="w-4 h-4 text-emerald-500" />} 
          value={stats.active24h.toLocaleString()} 
          label="Active (24h)" 
        />
        <StatCard 
          icon={<UserPlus className="w-4 h-4 text-purple-500" />} 
          value={stats.totalReferrals.toLocaleString()} 
          label="Total Referrals" 
          subLabel="Top 100 Sample"
        />
        <StatCard 
          icon={<DollarSign className="w-4 h-4 text-amber-500" />} 
          value={stats.totalGrmf.toLocaleString()} 
          label="Total GRMF" 
          unit="GRMF"
          subLabel="Top 100 Sample"
        />
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          User Directory
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'withdrawals' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Withdrawals
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by username or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 font-medium placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex flex-col max-h-[500px] overflow-y-auto no-scrollbar">
            <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">User Details</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GRMF / Referrals</span>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                  <Search className="w-6 h-6 text-slate-200" />
                </div>
                <p className="text-sm text-slate-400 font-medium">No matches found</p>
              </div>
            ) : (
              filteredUsers.map((user, index) => (
                <div key={user.id} className="p-4 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                      {index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">@{user.username || user.telegramUsername || 'Anonymous'}</span>
                      <span className="text-[9px] text-slate-400 font-mono tracking-tighter">{user.id}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-blue-600">{(user.realBalances?.GRMF || 0).toLocaleString()}</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-2.5 h-2.5 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 font-black">{user.referralCount || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="flex flex-col max-h-[500px] overflow-y-auto no-scrollbar">
            {withdrawals.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">No pending requests</div>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="p-4 border-b border-slate-50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{w.amount} {w.currency}</span>
                      <span className="text-[10px] text-slate-500 font-mono">User: {w.userId}</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">To: {w.recipientAddress}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                      w.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      w.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {w.status}
                    </span>
                  </div>
                  {w.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleWithdrawalStatus(w.id, 'approved')}
                        className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors border border-emerald-100"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button 
                        onClick={() => handleWithdrawalStatus(w.id, 'rejected')}
                        className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-colors border border-red-100"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
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

const StatCard = ({ icon, value, label, unit, subLabel }: { icon: React.ReactNode, value: string, label: string, unit?: string, subLabel?: string }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-1 relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
      {icon}
    </div>
    <div className="flex items-center gap-2 mb-1">
      <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
        {icon}
      </div>
      <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-black text-slate-900 tracking-tight">{value}</span>
      {unit && <span className="text-[10px] font-black text-slate-400 uppercase">{unit}</span>}
    </div>
    {subLabel && <span className="text-[8px] text-slate-300 font-bold italic">{subLabel}</span>}
  </div>
);

