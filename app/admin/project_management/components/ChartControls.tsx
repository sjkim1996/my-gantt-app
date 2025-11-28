import React from 'react';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';

type Props = {
  viewMode: 'week' | 'day';
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (mode: 'week' | 'day') => void;
};

const ChartControls: React.FC<Props> = ({ viewMode, onPrev, onNext, onToday, onViewChange }) => {
  return (
    <div className="flex items-center justify-between px-1 pb-2 gap-3">
      <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
        <button onClick={onPrev} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 flex items-center gap-1 text-xs font-bold">
          <ChevronLeft className="w-4 h-4" /> 이전
        </button>
        <button onClick={onToday} className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100">
          오늘 (Today)
        </button>
        <button onClick={onNext} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 flex items-center gap-1 text-xs font-bold">
          다음 <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
        <button
          onClick={() => onViewChange('week')}
          className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'week' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          주간
        </button>
        <button
          onClick={() => onViewChange('day')}
          className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'day' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          일간
        </button>
      </div>
      <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-200 rounded-full"></span> 대기
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span> 진행
        </div>
        <div className="flex items-center gap-1">
          <Flag className="w-3 h-3 text-red-500" /> 마일스톤
        </div>
      </div>
    </div>
  );
};

export default ChartControls;
