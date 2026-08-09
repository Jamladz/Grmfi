const fs = require('fs');
let code = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

code = code.replace(
  '<Users className="w-2.5 h-2.5 text-slate-400" />\n                        <span className="text-[10px] text-slate-500 font-bold">{user.referralsCount || 0}</span>',
  '<UserPlus className="w-3 h-3 text-emerald-500" />\n                        <span className="text-[10px] text-slate-500 font-bold">{user.referralsCount || 0} Refs</span>'
);

fs.writeFileSync('src/components/AdminView.tsx', code);
