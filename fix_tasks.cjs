const fs = require('fs');
let code = fs.readFileSync('src/components/TasksView.tsx', 'utf8');
code = code.replace(
  "openTelegramLink('https://t.me/grmfdex');",
  "openTelegramLink('https://t.me/Grmfdex');"
);
code = code.replace(
  "window.open('https://t.me/grmfdex', '_blank');",
  "window.open('https://t.me/Grmfdex', '_blank');"
);
fs.writeFileSync('src/components/TasksView.tsx', code);

let hub = fs.readFileSync('src/components/ReferralHub.tsx', 'utf8');
hub = hub.replace(
  "{ms.vipDays ? `& ${ms.vipDays}d VIP` : ''}",
  ""
);
fs.writeFileSync('src/components/ReferralHub.tsx', hub);
