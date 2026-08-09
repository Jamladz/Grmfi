const fs = require('fs');
let code = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

const searchAreaOld = `          <div className="p-5 border-b border-slate-100 flex items-center gap-4 bg-slate-50/30">
            <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search by Name, TG Username or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 font-bold placeholder:text-slate-400/70"
            />
          </div>`;

const searchAreaNew = `          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30">
            <div className="flex-1 flex items-center gap-4 w-full">
              <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search by Name, TG Username or ID..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full text-slate-700 font-bold placeholder:text-slate-400/70"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm outline-none cursor-pointer w-full sm:w-auto"
            >
              <option value="referrals">Top Referrers</option>
              <option value="grmf">Top Tokens</option>
              <option value="recent">Recently Active</option>
            </select>
          </div>`;

code = code.replace(searchAreaOld, searchAreaNew);

fs.writeFileSync('src/components/AdminView.tsx', code);
