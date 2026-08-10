const fs = require('fs');
const file = 'src/lib/referrals.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `    const numCode = Number(referrerCode);
    if (!isNaN(numCode)) {
      const qNum = query(collection(db, 'users'), where('telegramId', '==', numCode));
      const snapNum = await getDocs(qNum);
      if (!snapNum.empty) {
        referrerDocId = snapNum.docs[0].id;
      }
    }`,
  `    const numCode = Number(referrerCode);
    if (!isNaN(numCode)) {
      const qNum = query(collection(db, 'users'), where('telegramId', 'in', [numCode, String(numCode)]));
      const snapNum = await getDocs(qNum);
      if (!snapNum.empty) {
        referrerDocId = snapNum.docs[0].id;
      }
    }`
);

fs.writeFileSync(file, code);
