const fs = require('fs');
let code = fs.readFileSync('src/components/TasksView.tsx', 'utf8');

code = code.replace(
  `  const handleClaimShortcut = async () => {`,
  `  const handleJoinChannel = async () => {
    if ((window as any).Telegram?.WebApp?.openTelegramLink) {
      (window as any).Telegram.WebApp.openTelegramLink('https://t.me/grmfdex');
    } else {
      window.open('https://t.me/grmfdex', '_blank');
    }
    // Simulate verification delay then claim
    setTimeout(() => {
      handleClaimTask('tg_channel', 500, 'task_tg_channel', {
        'taskProgress.tg_channel.status': 'completed',
        'taskProgress.tg_channel.completedAt': Date.now()
      });
    }, 5000);
  };

  const handleClaimShortcut = async () => {`
);

code = code.replace(
  `'taskProgress.daily_login.lastDate': todayStr,`,
  ``
);

code = code.replace(
  `'taskProgress.mystery_box.lastDate': todayStr,`,
  ``
);

code = code.replace(
  `Successfully credited to your account!`,
  `Reward calculated and securely added to your <span className="font-bold text-slate-700">Global Assets</span> profile.`
);

fs.writeFileSync('src/components/TasksView.tsx', code);
