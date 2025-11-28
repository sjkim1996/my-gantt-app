import React from 'react';
import { X } from 'lucide-react';
import { Vacation } from '../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  vacations: Vacation[];
  onChange: (id: string, field: 'person' | 'team' | 'label' | 'start' | 'end', value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onSave: () => void;
};

const VacationModal: React.FC<Props> = ({ isOpen, onClose, vacations, onChange, onAdd, onRemove, onSave }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">구성원 휴가 입력</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-3">
          <div className="grid grid-cols-12 text-xs font-bold text-gray-500 px-2">
            <div className="col-span-3">구성원명</div>
            <div className="col-span-2">팀</div>
            <div className="col-span-3">휴가 시작일</div>
            <div className="col-span-3">휴가 종료일</div>
            <div className="col-span-1">비고</div>
          </div>
          {vacations.map((v) => (
            <div key={v.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded border border-gray-100">
              <input
                className="col-span-3 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={v.person}
                onChange={(e) => onChange(v.id, 'person', e.target.value)}
                placeholder="이름"
              />
              <input
                className="col-span-2 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={v.team || ''}
                onChange={(e) => onChange(v.id, 'team', e.target.value)}
                placeholder="팀"
              />
              <input
                type="date"
                className="col-span-3 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={v.start}
                onChange={(e) => onChange(v.id, 'start', e.target.value)}
              />
              <input
                type="date"
                className="col-span-3 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={v.end}
                onChange={(e) => onChange(v.id, 'end', e.target.value)}
              />
              <div className="col-span-1 flex items-center gap-1">
                <input
                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={v.label || ''}
                  onChange={(e) => onChange(v.id, 'label', e.target.value)}
                  placeholder="메모"
                />
                <button onClick={() => onRemove(v.id)} className="text-gray-400 hover:text-red-500">′</button>
              </div>
            </div>
          ))}
          <button onClick={onAdd} className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600">
            + 휴가 추가
          </button>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded">취소</button>
          <button onClick={onSave} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm">저장</button>
        </div>
      </div>
    </div>
  );
};

export default VacationModal;
