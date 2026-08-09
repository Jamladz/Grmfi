const fs = require('fs');
let code = fs.readFileSync('src/components/TasksView.tsx', 'utf8');

code = code.replace(
  `{String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s`,
  `{String(dailyStatus.login.timeLeft.hours).padStart(2, '0')}h {String(dailyStatus.login.timeLeft.minutes).padStart(2, '0')}m {String(dailyStatus.login.timeLeft.seconds).padStart(2, '0')}s`
);

code = code.replace(
  `{String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s`,
  `{String(dailyStatus.box.timeLeft.hours).padStart(2, '0')}h {String(dailyStatus.box.timeLeft.minutes).padStart(2, '0')}m {String(dailyStatus.box.timeLeft.seconds).padStart(2, '0')}s`
);

code = code.replace(
  `        {/* Swap Mission Tasks */}`,
  `        {/* New Task: Join Channel */}
        {(activeTab === 'all' || activeTab === 'special') && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:border-blue-200 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
              <ExternalLink className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                  Join GRMF Channel
                </h4>
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                  +500 GRMF
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {tgChannelCompleted 
                  ? 'Task completed successfully' 
                  : 'Join our official Telegram channel'}
              </p>
            </div>
            <div>
              {tgChannelCompleted ? (
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completed</span>
                </div>
              ) : (
                <button
                  onClick={handleJoinChannel}
                  disabled={claimingId === 'tg_channel'}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{claimingId === 'tg_channel' ? 'Verifying...' : 'Join Channel'}</span>
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Swap Mission Tasks */}`
);

fs.writeFileSync('src/components/TasksView.tsx', code);
