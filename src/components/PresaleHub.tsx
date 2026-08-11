import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Gem, Clock, Send, Zap, Minus, Plus } from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { doc, getDoc, setDoc, increment, addDoc, collection, serverTimestamp, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export const PresaleHub = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [balance, setBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [amountToBuy, setAmountToBuy] = useState<number>(500);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');

  useEffect(() => {
    let unsubscribeBalance: () => void;
    let unsubscribeWithdrawals: () => void;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        if (!user) {
            setBalance(0);
            setWithdrawals([]);
            if (unsubscribeBalance) unsubscribeBalance();
            if (unsubscribeWithdrawals) unsubscribeWithdrawals();
            return;
        }

        // Listen for balance
        unsubscribeBalance = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const bal = data.presaleBalances && typeof data.presaleBalances.GRMF === 'number' ? data.presaleBalances.GRMF : 0;
                setBalance(bal);
            } else {
                setBalance(0);
            }
        }, (error) => {
            console.error("Balance snapshot error:", error);
        });

        // Listen for withdrawals
        const q = query(collection(db, 'withdrawal_requests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
        unsubscribeWithdrawals = onSnapshot(q, (snapshot) => {
            setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("Withdrawals snapshot error:", error);
        });
    });

    const targetDate = new Date('2026-08-21T00:00:00Z').getTime();
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        });
      }
    }, 1000);

    return () => {
        unsubscribeAuth();
        if (unsubscribeBalance) unsubscribeBalance();
        if (unsubscribeWithdrawals) unsubscribeWithdrawals();
        clearInterval(timer);
    };
  }, []);

  const handleBuy = async () => {
    if (!wallet) {
      tonConnectUI.openModal();
      return;
    }
    const tonAmount = (amountToBuy / 500).toString();
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [{ address: "UQAJcp9v_CqgdqHmAjs8sZRs0UPkQgZBuWct2AfMBJfgP6QS", amount: toNano(tonAmount).toString() }]
    };
    try {
      await tonConnectUI.sendTransaction(transaction);
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
            presaleBalances: {
                GRMF: increment(amountToBuy)
            }
        }, { merge: true });
      }
      alert("Purchase successful!");
    } catch (e) {
      alert("Transaction failed.");
    }
  };

  const handleWithdraw = async () => {
      if (withdrawAmount > balance || !withdrawAddress) return;
      try {
          await addDoc(collection(db, 'withdrawal_requests'), {
              userId: auth.currentUser?.uid,
              amount: withdrawAmount,
              currency: 'GRMF',
              recipientAddress: withdrawAddress,
              status: 'pending',
              createdAt: serverTimestamp()
          });
          
          if (auth.currentUser) {
              await setDoc(doc(db, 'users', auth.currentUser.uid), {
                  presaleBalances: {
                      GRMF: increment(-withdrawAmount)
                  }
              }, { merge: true });
          }
          alert("Withdrawal request submitted successfully!");
          setWithdrawAmount(0);
          setWithdrawAddress('');
      } catch (e) {
          console.error(e);
          alert("Failed to submit request.");
      }
  };

  // Mock progress for the UI
  const TOTAL_POOL = 5000000;
  const MOCK_SOLD = 2154320;
  const progressPercent = (MOCK_SOLD / TOTAL_POOL) * 100;

  return (
    <motion.div className="flex-1 flex flex-col p-2 gap-2 h-full overflow-y-auto pb-24">
        {/* Header/Logo */}
        <div className="bg-white rounded-2xl p-3 flex justify-between items-center shadow-sm shrink-0">
            <div className='flex items-center gap-2'>
                <img src="https://i.suar.me/vAdG5/l" alt="GRMF Logo" className="w-8 h-8 rounded-full" />
                <span className="font-black text-slate-900">GRMF Presale</span>
            </div>
        </div>

        {/* Timer */}
        <div className="bg-slate-900 rounded-2xl p-3 flex items-center justify-between text-white shrink-0">
            <Clock className="w-5 h-5 text-sky-400" />
            <div className="flex gap-2">
                {Object.entries(timeLeft).map(([unit, value]) => (
                    <div key={unit} className="text-center">
                        <span className="text-lg font-black">{value.toString().padStart(2, '0')}</span>
                        <span className="text-[8px] block uppercase text-slate-400">{unit}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Pool Progress */}
        <div className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-2 shrink-0">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 uppercase">
                <span>Presale Pool</span>
                <span className="text-sky-600">{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-sky-500 h-3 rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                <span>{MOCK_SOLD.toLocaleString()} GRMF Sold</span>
                <span>{TOTAL_POOL.toLocaleString()} Total</span>
            </div>
        </div>

        {/* Purchase */}
        <div className="bg-white rounded-2xl p-3 shadow-sm grid grid-cols-3 gap-2 items-center shrink-0">
            <button onClick={() => setAmountToBuy(Math.max(500, amountToBuy - 500))} className="p-2 bg-slate-100 rounded-xl flex items-center justify-center"><Minus className="w-4 h-4"/></button>
            <span className="font-black text-sm text-center">{amountToBuy}</span>
            <button onClick={() => setAmountToBuy(amountToBuy + 500)} className="p-2 bg-slate-100 rounded-xl flex items-center justify-center"><Plus className="w-4 h-4"/></button>
            <button onClick={handleBuy} className="col-span-3 py-2 bg-sky-600 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1">
                <Zap className='w-3 h-3'/> Buy {amountToBuy} GRMF
            </button>
        </div>

        {/* Withdrawal */}
        <div className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase">Withdraw</h3>
                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
                    <img src="https://i.suar.me/vAdG5/l" alt="GRMF Logo" className="w-4 h-4 rounded-full" />
                    <span className="text-xs font-bold text-slate-900">{balance.toLocaleString()}</span>
                </div>
            </div>
            <input type="number" placeholder="Amt" value={withdrawAmount || ''} onChange={(e) => setWithdrawAmount(Number(e.target.value))} className="p-2 bg-slate-50 rounded-xl text-xs" />
            <input type="text" placeholder="TON Address" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} className="p-2 bg-slate-50 rounded-xl text-xs" />
            <button onClick={handleWithdraw} className="py-2 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1">
                <Send className="w-3 h-3" /> Withdraw
            </button>
            <div className="text-[10px] space-y-1">
                {withdrawals.map((w) => (
                    <div key={w.id} className="flex justify-between bg-slate-50 p-2 rounded-lg">
                        <span>{w.amount} GRMF</span>
                        <span className={w.status === 'approved' || w.status === 'completed' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {w.status === 'pending' ? 'Pending' : (w.status === 'approved' || w.status === 'completed' ? 'Completed' : w.status)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
        <TonConnectButton className="!scale-75 origin-center" />
    </motion.div>
  );
};
