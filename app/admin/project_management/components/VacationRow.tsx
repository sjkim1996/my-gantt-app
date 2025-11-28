import React from 'react';
import { Vacation } from '../types';

type Props = {
  vacations: Vacation[];
  onChange: (id: string, field: 'label' | 'start' | 'end', value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

const VacationRow: React.FC<Props> = ({ vacations, onChange, onAdd, onRemove }) => {
  return (
    <div className="md:col-span-12 space-y-2">
      <label className="block text-xs font-bold text-gray-400">구성원 휴가</label>
      <div className="flex flex-col gap-2">
        {vacations.map((v, idx) => (
          <div key={v.id} className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={v.label}
              onChange={(e) => onChange(v.id, 'label', e.target.value)}
              placeholder={`휴가 ${idx + 1} 메모`}
              className="flex-1 min-w-[140px] border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <input
              type="date"
              value={v.start}
              onChange={(e) => onChange(v.id, 'start', e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <span className="text-gray-400 text-xs">~</span>
            <input
              type="date"
              value={v.end}
              onChange={(e) => onChange(v.id, 'end', e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <button type="button" onClick={onAdd} className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700">
              +
            </button>
            <button type="button" onClick={() => onRemove(v.id)} className="px-3 py-2 bg-gray-100 text-gray-500 text-xs font-bold rounded hover:bg-gray-200">
              ′
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VacationRow;
