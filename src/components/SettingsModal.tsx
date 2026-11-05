import React from 'react';
import { X, SlidersHorizontal, Info, Globe, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slippage: number;
  setSlippage: (val: number) => void;
  deadline: number;
  setDeadline: (val: number) => void;
  isExpertMode: boolean;
  setIsExpertMode: (val: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  slippage,
  setSlippage,
  deadline,
  setDeadline,
  isExpertMode,
  setIsExpertMode,
}) => {
  if (!isOpen) return null;

  const standardSlippages = [0.1, 0.5, 1.0, 2.0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-2xl text-slate-900 p-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#24A1DE]" />
              Swap Settings
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-4 space-y-5">
            {/* Slippage Tolerance */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  Slippage Tolerance
                </label>
                <span className="text-xs font-black text-[#24A1DE]">{slippage}%</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {standardSlippages.map((val) => (
                  <button
                    key={val}
                    onClick={() => setSlippage(val)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      slippage === val
                        ? 'bg-blue-50 border-[#24A1DE] text-[#24A1DE] shadow-xs'
                        : 'bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-500'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Deadline */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-600">
                  Tx Deadline (minutes)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={deadline}
                  onChange={(e) => setDeadline(Number(e.target.value) || 10)}
                  className="w-24 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 text-center focus:outline-none focus:border-[#24A1DE]"
                />
                <span className="text-xs font-medium text-slate-500">
                  mins
                </span>
              </div>
            </div>

            {/* Expert Mode */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Expert Mode
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Bypass high slippage alerts
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isExpertMode}
                onChange={(e) => setIsExpertMode(e.target.checked)}
                className="w-5 h-5 accent-[#24A1DE] rounded cursor-pointer"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
