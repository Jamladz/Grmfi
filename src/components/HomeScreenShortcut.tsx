import React from 'react';
import { Smartphone, CheckCircle2 } from 'lucide-react';
import { useHomeScreenShortcut } from '../hooks/useHomeScreenShortcut';

export const HomeScreenShortcut: React.FC = () => {
  const { status, addToHomeScreen } = useHomeScreenShortcut();

  if (status === 'unsupported' || status === 'loading') {
    return null;
  }

  const isAdded = status === 'added';

  return (
    <div className={`bg-white rounded-2xl p-4 border shadow-sm flex items-center justify-between gap-3 transition-all ${
      isAdded ? 'border-emerald-100' : 'border-slate-100 hover:border-blue-200'
    }`}>
      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner ${
        isAdded ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'
      }`}>
        <Smartphone className="w-6 h-6" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
          Home Screen
        </h4>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          {isAdded 
            ? 'Successfully added'
            : 'Add shortcut to home screen'
          }
        </p>
      </div>

      <div>
        {isAdded ? (
          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
            <span>Added</span>
          </div>
        ) : (
          <button
            onClick={addToHomeScreen}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
};
