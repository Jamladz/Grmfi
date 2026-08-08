import React from 'react';
import { Home, CheckCircle2, ChevronRight } from 'lucide-react';
import { useHomeScreenShortcut } from '../hooks/useHomeScreenShortcut';

export const HomeScreenShortcutMenuItem: React.FC = () => {
  const { status, addToHomeScreen } = useHomeScreenShortcut();

  if (status === 'unsupported' || status === 'loading') {
    return null;
  }

  const isAdded = status === 'added';

  if (isAdded) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 w-full text-left">
        <div className="flex items-center gap-3">
          <div className="text-emerald-500"><CheckCircle2 className="w-4 h-4" /></div>
          <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">Added to Home Screen</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-600">
           <span className="text-[10px] font-black uppercase tracking-wider">Added</span>
        </div>
      </div>
    );
  }

  return (
    <button 
      onClick={addToHomeScreen}
      className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition-colors active:scale-[0.98] shadow-sm cursor-pointer w-full text-left"
    >
      <div className="flex items-center gap-3">
        <div className="text-blue-500"><Home className="w-4 h-4" /></div>
        <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">Add to Home Screen</span>
      </div>
      <div className="flex items-center gap-2">
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
    </button>
  );
};
