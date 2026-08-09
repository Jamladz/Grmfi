const fs = require('fs');
let code = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

// Add sort state
code = code.replace(
  "  const [activeTab, setActiveTab] = useState<'users' | 'withdrawals'>('users');",
  "  const [activeTab, setActiveTab] = useState<'users' | 'withdrawals'>('users');\n  const [sortBy, setSortBy] = useState<'recent' | 'referrals' | 'grmf'>('referrals');"
);

// Update fetchData
code = code.replace(
  "  const fetchData = async () => {",
  "  const fetchData = async (currentSort: string = sortBy) => {"
);

code = code.replace(
  "const qUsers = query(collection(db, 'users'), orderBy('lastActiveTimestamp', 'desc'), limit(100));",
  "let orderField = 'lastActiveTimestamp';\n      if (currentSort === 'referrals') orderField = 'referralsCount';\n      if (currentSort === 'grmf') orderField = 'realBalances.GRMF';\n      const qUsers = query(collection(db, 'users'), orderBy(orderField, 'desc'), limit(100));"
);

// Fix useEffect
code = code.replace(
  "  useEffect(() => {\n    fetchData();\n  }, []);",
  "  useEffect(() => {\n    fetchData(sortBy);\n  }, [sortBy]);"
);

// Fix localTotalRefs
code = code.replace(
  "const localTotalRefs = usersData.reduce((acc: number, u: any) => acc + (u.referralCount || 0), 0);",
  "const localTotalRefs = usersData.reduce((acc: number, u: any) => acc + (u.referralsCount || 0), 0);"
);

fs.writeFileSync('src/components/AdminView.tsx', code);
