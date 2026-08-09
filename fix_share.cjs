const fs = require('fs');
let code = fs.readFileSync('src/components/ReferralHub.tsx', 'utf8');
code = code.replace(
  "const text = `Join me on GRMF and get your Welcome Bonus! 🚀\\n`;",
  "const text = `\\n\\nJoin me on GRMF and get your Welcome Bonus! 🚀`;"
);
fs.writeFileSync('src/components/ReferralHub.tsx', code);
