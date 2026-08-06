import React from 'react';
import { X, CheckCircle, ExternalLink, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  txState: 'submitting' | 'confirming' | 'success' | 'failed';
  txHash: string | null;
  fromAmount: string;
  fromSymbol: string;
  toAmount: string;
  toSymbol: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  txState,
  txHash,
  fromAmount,
  fromSymbol,
  toAmount,
  toSymbol,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-2xl text-slate-900 p-6 text-center"
        >
          {txState !== 'submitting' && txState !== 'confirming' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Status Animation Graphic */}
          <div className="my-4 flex justify-center">
            {txState === 'submitting' || txState === 'confirming' ? (
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-400 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#24A1DE] animate-spin" />
                </div>
              </div>
            ) : txState === 'success' ? (
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center text-emerald-500 animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-400 flex items-center justify-center text-rose-500">
                <X className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* Titles */}
          <h3 className="text-lg font-black text-slate-900 mt-2">
            {txState === 'submitting' && 'Submitting to GRAM...'}
            {txState === 'confirming' && 'Confirming on Blockchain...'}
            {txState === 'success' && 'Transaction Successful!'}
            {txState === 'failed' && 'Transaction Failed'}
          </h3>

          <p className="text-xs text-slate-500 mt-1">
            {txState === 'submitting' && 'Please confirm in your wallet'}
            {txState === 'confirming' && 'Verifying smart contract execution'}
            {txState === 'success' && 'Tokens deposited to your wallet'}
          </p>

          {/* Swap Summary Box */}
          <div className="my-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block">Paid</span>
              <span className="font-bold text-slate-900 text-sm">{fromAmount} {fromSymbol}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-500" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block">Received</span>
              <span className="font-bold text-[#24A1DE] text-sm">{toAmount} {toSymbol}</span>
            </div>
          </div>

          {/* Tonscan explorer button */}
          {txHash && (
            <a
              href={`https://tonscan.org/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-100 text-[#24A1DE] hover:text-[#2094cc] text-xs font-bold flex items-center justify-center gap-2 hover:border-blue-200 transition-all mb-3 shadow-sm"
            >
              <span>View on Tonscan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Dismiss button when completed */}
          {(txState === 'success' || txState === 'failed') && (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-[#24A1DE] text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-transform active:scale-95 hover:bg-[#2094cc]"
            >
              Close
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
