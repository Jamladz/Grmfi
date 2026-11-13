import React from 'react';
import { Smartphone, CheckCircle2, ChevronRight } from 'lucide-react';
import { useHomeScreenShortcut } from '../hooks/useHomeScreenShortcut';

export const HomeScreenShortcutMenuItem: React.FC = () => {
  const { status, isAdded, addToHomeScreen, reopenPrompt } = useHomeScreenShortcut();

  if (status === 'loading') {
    return null;
  }

  if (isAdded) {
    return (
      <div className="min-h-[52px] flex items-center justify-between px-5 py-3.5 bg-white w-full text-left">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shrink-0 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-900">Home Screen Shortcut</span>
        </div>
        <span className="text-xs font-bold text-emerald-600">Verified & Added</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        reopenPrompt();
        addToHomeScreen();
      }}
      className="min-h-[52px] flex items-center justify-between px-5 py-3.5 bg-white hover:bg-slate-50/80 transition-colors cursor-pointer w-full text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200/60 flex items-center justify-center shrink-0 text-[#0088CC]">
          <Smartphone className="w-4 h-4" />
        </div>
        <span className="text-xs font-bold text-slate-900">Add to Home Screen</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#0088CC]">Add Now</span>
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
    </button>
  );
};
