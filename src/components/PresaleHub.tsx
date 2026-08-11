import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Gem, Clock, Send, Zap, Minus, Plus } from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export const PresaleHub = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [balance, setBalance] = useState<number>(0);
  const [amountToBuy, setAmountToBuy] = useState<number>(50);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');

  useEffect(() => {
    const fetchBalance = async () => {
        if (auth.currentUser) {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDoc.exists()) {
                setBalance(userDoc.data().realBalances?.GRMF || 0);
            }
        }
    };
    fetchBalance();
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

    return () => clearInterval(timer);
  }, []);

  const handleBuy = async () => {
    if (!wallet) {
      tonConnectUI.openModal();
      return;
    }
    const tonAmount = (amountToBuy / 50).toString();
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [{ address: "UQAJcp9v_CqgdqHmAjs8sZRs0UPkQgZBuWct2AfMBJfgP6QS", amount: toNano(tonAmount).toString() }]
    };
    try {
      await tonConnectUI.sendTransaction(transaction);
      alert("Transaction sent!");
    } catch (e) {
      alert("Failed.");
    }
  };

  const handleWithdraw = async () => {
      if (withdrawAmount > balance || !withdrawAddress) return;
      await addDoc(collection(db, 'withdrawal_requests'), {
          userId: auth.currentUser?.uid,
          amount: withdrawAmount,
          currency: 'GRMF',
          recipientAddress: withdrawAddress,
          status: 'pending',
          createdAt: serverTimestamp()
      });
      alert("Request submitted!");
      setWithdrawAmount(0);
      setWithdrawAddress('');
  };

  return (
    <motion.div className="flex-1 flex flex-col p-2 gap-2 h-full overflow-hidden">
        {/* Header/Logo/Balance */}
        <div className="bg-white rounded-2xl p-3 flex justify-between items-center shadow-sm">
            <div className='flex items-center gap-2'>
                <img src="https://i.suar.me/vAdG5/l" alt="GRMF Logo" className="w-8 h-8 rounded-full" />
                <span className="font-black text-slate-900">GRMF</span>
            </div>
            <div className="bg-sky-100 rounded-xl p-2">
                <span className="text-[10px] font-bold text-sky-800">Bal: {balance.toLocaleString()}</span>
            </div>
        </div>

        {/* Timer */}
        <div className="bg-slate-900 rounded-2xl p-3 flex items-center justify-between text-white">
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

        {/* Purchase */}
        <div className="bg-white rounded-2xl p-3 shadow-sm grid grid-cols-3 gap-2 items-center">
            <button onClick={() => setAmountToBuy(Math.max(50, amountToBuy - 50))} className="p-2 bg-slate-100 rounded-xl flex items-center justify-center"><Minus className="w-4 h-4"/></button>
            <span className="font-black text-sm text-center">{amountToBuy}</span>
            <button onClick={() => setAmountToBuy(amountToBuy + 50)} className="p-2 bg-slate-100 rounded-xl flex items-center justify-center"><Plus className="w-4 h-4"/></button>
            <button onClick={handleBuy} className="col-span-3 py-2 bg-sky-600 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1">
                <Zap className='w-3 h-3'/> Buy {amountToBuy} GRMF
            </button>
        </div>

        {/* Withdrawal */}
        <div className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-2 flex-grow">
            <h3 className="text-xs font-black text-slate-900 uppercase">Withdraw</h3>
            <input type="number" placeholder="Amt" value={withdrawAmount} onChange={(e) => setWithdrawAmount(Number(e.target.value))} className="p-2 bg-slate-50 rounded-xl text-xs" />
            <input type="text" placeholder="TON Address" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} className="p-2 bg-slate-50 rounded-xl text-xs" />
            <button onClick={handleWithdraw} className="py-2 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1">
                <Send className="w-3 h-3" /> Withdraw
            </button>
        </div>
        <TonConnectButton className="!scale-75 origin-center" />
    </motion.div>
  );
};
