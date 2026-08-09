const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import { Users, ShieldAlert } from 'lucide-react';",
  "import { Users, ShieldAlert, Gift } from 'lucide-react';"
);

fs.writeFileSync('src/App.tsx', code);
