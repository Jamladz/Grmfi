const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "const updatedBeta = { ...balances, GRMF: (balances.GRMF || 0) + WELCOME_REWARD };\n    \n    setBalances(updatedBeta);\n    setShowWelcomeModal(false);",
  "const updatedBeta = { ...balances, GRMF: (balances.GRMF || 0) + WELCOME_REWARD };\n    \n    setBalances(updatedBeta);\n    setRealGrmf(prev => prev + WELCOME_REWARD);\n    setUserProfile(prev => prev ? {\n      ...prev,\n      realBalances: {\n        ...(prev.realBalances || {}),\n        GRMF: (prev.realBalances?.GRMF || 0) + WELCOME_REWARD\n      },\n      betaBalances: {\n        ...(prev.betaBalances || {}),\n        GRMF: (prev.betaBalances?.GRMF || 0) + WELCOME_REWARD\n      }\n    } : prev as any);\n    setShowWelcomeModal(false);"
);

fs.writeFileSync('src/App.tsx', code);
