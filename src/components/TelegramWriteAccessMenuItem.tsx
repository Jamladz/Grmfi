import React from 'react';
import { Bell, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { useTelegramWriteAccess } from '../hooks/useTelegramWriteAccess';

interface TelegramWriteAccessMenuItemProps {
  userProfile?: any;
}

export const TelegramWriteAccessMenuItem: React.FC<TelegramWriteAccessMenuItemProps> = ({
  userProfile
}) => {
  const { status, isAllowed, isDeclined, isRequesting, requestPermission } =
    useTelegramWriteAccess(userProfile);

  if (status === 'unsupported') {
    return null;
  }

  if (isAllowed) {
    return (
      <div className="min-h-[52px] flex items-center justify-between px-5 py-3.5 bg-white w-full text-left">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shrink-0 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-900">Telegram Bot Messages</span>
        </div>
        <span className="text-xs font-bold text-emerald-600">Write Access Granted</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        requestPermission();
      }}
      disabled={isRequesting}
      className="min-h-[52px] flex items-center justify-between px-5 py-3.5 bg-white hover:bg-slate-50/80 transition-colors cursor-pointer w-full text-left disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200/60 flex items-center justify-center shrink-0 text-[#0088CC]">
          {isRequesting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
        </div>
        <span className="text-xs font-bold text-slate-900">Telegram Bot Messages</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${isDeclined ? 'text-amber-600' : 'text-[#0088CC]'}`}>
          {isRequesting ? 'Requesting...' : isDeclined ? 'Declined • Tap to Allow' : 'Allow Access'}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
    </button>
  );
};
