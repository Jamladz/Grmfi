const fs = require('fs');
const file = 'src/components/ReferralHub.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'if (!auth.currentUser || claimingId) return;',
  'const targetId = userProfile?.id || auth.currentUser?.uid;\n    if (!targetId || claimingId) return;'
);

code = code.replace(
  'const success = await claimMilestone(auth.currentUser.uid, milestone);',
  'const success = await claimMilestone(targetId, milestone);'
);

fs.writeFileSync(file, code);
