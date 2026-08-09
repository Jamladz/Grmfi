const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Change reward amount
code = code.replace(
  'const WELCOME_REWARD = 5000;',
  'const WELCOME_REWARD = 4000;'
);

const oldModal = `        {showWelcomeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[40px] p-8 text-center shadow-2xl relative overflow-hidden border border-slate-100"
            >
              {/* Decorative background */}
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent -z-0" />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-blue-600 to-indigo-700 mb-6 flex items-center justify-center shadow-2xl shadow-blue-600/30 transform rotate-3">
                  <div className="relative">
                    <Trophy className="w-12 h-12 text-white fill-white/10" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center border-2 border-blue-600"
                    >
                      <Zap className="w-3 h-3 text-white fill-white" />
                    </motion.div>
                  </div>
                </div>
                
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight mb-3">Welcome Reward</h3>
                <p className="text-sm text-slate-500 font-medium px-4 mb-8">
                  Thanks for joining GRMF Fi. We've credited your account with a starter balance.
                </p>

                <div className="w-full bg-slate-50 border border-slate-100 p-8 rounded-[32px] mb-8 relative group">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Limited Gift</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">{WELCOME_REWARD.toLocaleString()}</span>
                    <span className="text-lg font-black text-blue-600 uppercase">GRMF</span>
                  </div>
                </div>

                <button
                  onClick={collectWelcomeBonus}
                  className="w-full py-5 rounded-[24px] bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-900/20 transition-all active:scale-[0.96] hover:bg-slate-800"
                >
                  Claim & Explore
                </button>
                
                <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Exclusive Telegram Member Bonus
                </p>
              </div>
            </motion.div>
          </div>
        )}`;

const newModal = `        {showWelcomeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-[280px] bg-white rounded-3xl p-5 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 mb-3 flex items-center justify-center">
                  <Gift className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-1">Welcome Gift</h3>
                <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
                  Glad to have you! Here is your starter bonus.
                </p>
                <div className="bg-slate-50 rounded-2xl py-3 px-4 w-full mb-4 border border-slate-100 flex items-center justify-center gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{WELCOME_REWARD.toLocaleString()}</span>
                  <span className="text-xs font-black text-blue-600 mt-1">GRMF</span>
                </div>
                <button
                  onClick={collectWelcomeBonus}
                  className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                >
                  Claim Gift
                </button>
              </div>
            </motion.div>
          </div>
        )}`;

code = code.replace(oldModal, newModal);
fs.writeFileSync('src/App.tsx', code);
