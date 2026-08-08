import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { TonConnectButton } from '@tonconnect/ui-react';

interface HeaderProps {
  onOpenWalletDrawer: () => void;
  onOpenSettings: () => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenWalletDrawer,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-400 via-blue-500 to-blue-600 p-[1.5px] shadow-lg shadow-blue-500/10 group-hover:scale-105 transition-all duration-300">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden border border-slate-100">
                <img src="https://i.suar.me/JpxXB/l" alt="GRMF Logo" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-slate-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-lg font-black tracking-tighter text-slate-900 leading-none">
                GRMF Fi
              </span>
              <div className="flex items-center gap-1.5 mt-1.5 opacity-60">
                <div className="h-[1px] w-3 bg-blue-500/50" />
                <span className="text-[8px] font-black text-slate-500 tracking-[0.25em] uppercase whitespace-nowrap">
                  GRMF DEX
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:text-blue-500 hover:border-blue-200 transition-all sm:p-2.5 sm:rounded-2xl"
            title="Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Real TonConnect Button */}
          <div className="ton-connect-wrapper scale-90 sm:scale-100 origin-right">
            <TonConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};
