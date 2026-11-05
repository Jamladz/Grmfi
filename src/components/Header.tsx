import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { TonConnectButton } from '@tonconnect/ui-react';

interface HeaderProps {
  onOpenWalletDrawer: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/70 px-4 lg:px-8 h-14 flex items-center">
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Clean Brand Lockup */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-slate-900 p-0.5 shadow-xs overflow-hidden shrink-0">
            <img
              src="https://i.suar.me/vAdG5/l"
              alt="GRMF Fi"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
            GRMF Fi
          </span>
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSettings}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Swap Settings"
            aria-label="Swap Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="ton-connect-wrapper scale-90 sm:scale-95 origin-right">
            <TonConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};
