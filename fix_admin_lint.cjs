const fs = require('fs');
let code = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

code = code.replace(
  "onClick={fetchData}",
  "onClick={() => fetchData()}"
);

fs.writeFileSync('src/components/AdminView.tsx', code);
