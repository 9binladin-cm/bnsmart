import React from 'react';
import { useLocationContext } from './LocationContext';
import { TableView } from './TableView';
import { Search } from 'lucide-react';

export const SearchView: React.FC = () => {
  const { searchQuery, setSearchQuery } = useLocationContext();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="p-4 border-b dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, พิกัด หรือรายละเอียด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <TableView />
      </div>
    </div>
  );
};
