import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Search, RefreshCw, Activity, DollarSign, Wallet, CheckCircle, XCircle } from 'lucide-react';

export const AdminView: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'withdrawals'>('users');

  const fetchData = async () => {
    setLoading(true);
    try {
      const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
      const snapUsers = await getDocs(qUsers);
      setUsers(snapUsers.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
    u.telegramId?.includes(search)
  );

  const totalBalance = users.reduce((acc, u) => acc + (u.realBalances?.GRMF || 0), 0);
  const active24h = users.filter(u => {
    if (!u.lastActiveTimestamp) return false;
    return (Date.now() - u.lastActiveTimestamp) < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="p-4 flex flex-col gap-4 pb-20">
      <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-xl font-black">Admin Dashboard</h2>
          <p className="text-xs text-slate-400">System Overview & Management</p>
        </div>
        <button onClick={fetchData} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 active:scale-95 transition-all">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'users' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'withdrawals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Withdrawals
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-1">
              <Users className="w-5 h-5 text-blue-500 mb-1" />
              <span className="text-2xl font-black text-slate-800">{users.length}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Users</span>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-1">
              <Activity className="w-5 h-5 text-emerald-500 mb-1" />
              <span className="text-2xl font-black text-slate-800">{active24h}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active (24h)</span>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-1 col-span-2">
              <DollarSign className="w-5 h-5 text-amber-500 mb-1" />
              <span className="text-2xl font-black text-slate-800">{totalBalance.toLocaleString()} GRMF</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Circulating Supply</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search users..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
              />
            </div>
            
            <div className="flex flex-col max-h-[400px] overflow-y-auto no-scrollbar">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No users found</div>
              ) : (
                filteredUsers.map(user => (
                  <div key={user.id} className="p-4 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{user.username || user.firstName || 'Anonymous'}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{user.id}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-blue-600">{(user.realBalances?.GRMF || 0).toLocaleString()} GRMF</span>
                      <span className="text-[10px] text-emerald-600 font-bold">{user.referralCount || 0} Refs</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="flex flex-col max-h-[500px] overflow-y-auto no-scrollbar">
            {withdrawals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No withdrawal requests found</div>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="p-4 border-b border-slate-50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{w.amount} {w.currency}</span>
                      <span className="text-[10px] text-slate-500 font-mono">User: {w.userId}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">To: {w.recipientAddress}</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                      w.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      w.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {w.status}
                    </span>
                  </div>
                  {w.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleWithdrawalStatus(w.id, 'approved')}
                        className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button 
                        onClick={() => handleWithdrawalStatus(w.id, 'rejected')}
                        className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-100 transition-colors"
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
