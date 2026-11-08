import React from 'react';
import { SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { TonConnectButton } from '@tonconnect/ui-react';

interface HeaderProps {
  onOpenWalletDrawer: () => void;
  onOpenSettings: () => void;
  onOpenWhitepaper?: () => void;
  isAdmin?: boolean;
  isAdminViewActive?: boolean;
  onToggleAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  isAdmin,
  isAdminViewActive,
  onToggleAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/70 px-3 sm:px-6 h-14 flex items-center">
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-2 min-w-0">
        {/* Zone 1: Clean Brand Lockup */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 p-0.5 shadow-xs overflow-hidden shrink-0">
            <img
              src="https://i.suar.me/vAdG5/l"
              alt="GRMF Fi"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 truncate">
            GRMF Fi
          </span>
        </div>

        {/* Zone 2: Actions — Strictly fitted within mobile viewport */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAdmin && onToggleAdmin && (
            <button
              onClick={onToggleAdmin}
              className={`h-9 w-9 sm:w-auto sm:px-2.5 flex items-center justify-center gap-1 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer border shrink-0 ${
                isAdminViewActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-[#0088CC]/10 hover:bg-[#0088CC]/15 text-[#0088CC] border-[#0088CC]/25'
              }`}
              title="Admin Console (@sekanedr_is)"
              aria-label="Admin Console"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
            title="Swap Settings"
            aria-label="Swap Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="ton-connect-wrapper flex items-center shrink-0">
            <TonConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};
