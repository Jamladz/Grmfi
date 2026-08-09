const fs = require('fs');
let code = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

code = code.replace(
  "{user.referralCount || 0}",
  "{user.referralsCount || 0}"
);

fs.writeFileSync('src/components/AdminView.tsx', code);
