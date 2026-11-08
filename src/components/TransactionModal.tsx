import React from 'react';
import { X, CheckCircle, ExternalLink, Loader2, ArrowRight, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TransactionState } from '../types';
import { openTelegramLink } from '../lib/telegram';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  txState: TransactionState;
  txHash: string | null;
  fromAmount?: string;
  fromSymbol?: string;
  toAmount?: string;
  toSymbol?: string;
  onGoToTasks?: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  txState,
  txHash,
  fromAmount = '0',
  fromSymbol = 'GRMF',
  toAmount = '0',
  toSymbol = 'TON',
  onGoToTasks,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-2xl text-slate-900 p-6 text-center"
        >
          {txState !== 'submitting' && txState !== 'confirming' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Status Animation Graphic */}
          <div className="my-3 flex justify-center">
            {txState === 'submitting' || txState === 'confirming' ? (
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-[#0088CC] animate-spin" />
                </div>
              </div>
            ) : txState === 'success' ? (
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                <X className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Titles */}
          <h3 className="text-lg font-extrabold text-slate-900 mt-1">
            {txState === 'submitting' && 'Routing Liquidity...'}
            {txState === 'confirming' && 'Confirming Swap...'}
            {txState === 'success' && 'Swap Completed!'}
            {txState === 'failed' && 'Transaction Failed'}
          </h3>

          <p className="text-xs text-slate-500 mt-1">
            {txState === 'submitting' && 'Executing order across TON liquidity pool'}
            {txState === 'confirming' && 'Updating your token balances & mission progress'}
            {txState === 'success' && 'Tokens credited & Swap Mission progress recorded'}
          </p>

          {/* Swap Summary Box */}
          <div className="my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between font-mono tabular-nums">
            <div className="text-left">
              <span className="text-[10px] font-sans text-slate-400 block">Paid</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {fromAmount} {fromSymbol}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#0088CC]" />
            <div className="text-right">
              <span className="text-[10px] font-sans text-slate-400 block">Received</span>
              <span className="font-extrabold text-[#0088CC] text-sm">
                {toAmount} {toSymbol}
              </span>
            </div>
          </div>

          {txState === 'success' && (
            <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Swap Mission Counted (+50 GRMF Ready)</span>
            </div>
          )}

          {/* Tonscan explorer button */}
          {txHash && (
            <button
              type="button"
              onClick={() => openTelegramLink(`https://tonscan.org/tx/${txHash}`)}
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-200/80 text-[#0088CC] hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-2 transition-all mb-2.5 cursor-pointer"
            >
              <span>View on Tonscan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Action buttons when completed */}
          {(txState === 'success' || txState === 'failed') && (
            <div className="flex flex-col gap-2">
              {txState === 'success' && onGoToTasks && (
                <button
                  onClick={() => {
                    onClose();
                    onGoToTasks();
                  }}
                  className="w-full min-h-[44px] py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <ListTodo className="w-4 h-4" />
                  <span>Go to Tasks & Claim +50 GRMF</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full min-h-[42px] py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
              >
                Continue Swapping
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
