const fs = require('fs');
let code = fs.readFileSync('src/components/ReferralHub.tsx', 'utf8');
code = code.replace(
  "You've successfully claimed your reward for inviting friends.",
  'Reward calculated and securely added to your <span className="font-bold text-slate-700">Global Assets</span> profile.'
);
fs.writeFileSync('src/components/ReferralHub.tsx', code);
