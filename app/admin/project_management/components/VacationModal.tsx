import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Vacation, Assignee } from '../types';
import styles from '../styles/VacationModal.module.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  vacations: Vacation[];
  onChange: (id: string, field: 'person' | 'team' | 'label' | 'start' | 'end', value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onSave: (v: Vacation[]) => void;
  allAssignees: Assignee[];
};

const VacationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  vacations,
  onChange,
  onAdd,
  onRemove,
  onSave,
  allAssignees,
}) => {
  const [openSuggestId, setOpenSuggestId] = useState<string | null>(null);

  if (!isOpen) return null;
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>구성원 휴가 입력</h3>
          <button onClick={onClose} className={styles.iconButton}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.gridHeader}>
            <div className={styles.col3}>구성원명</div>
            <div className={styles.col3}>휴가 시작일</div>
            <div className={styles.col3}>휴가 종료일</div>
            <div className={styles.col3}>비고</div>
          </div>
          {vacations.map((v) => (
            <div key={v.id} className="bg-gray-50 p-3 rounded border border-gray-100 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3 relative">
                  <input
                    className={`${styles.input} w-full`}
                    value={v.person}
                    onFocus={() => setOpenSuggestId(v.id)}
                    onChange={(e) => {
                      onChange(v.id, 'person', e.target.value);
                      setOpenSuggestId(v.id);
                    }}
                    placeholder="이름"
                  />
                  {openSuggestId === v.id && v.person && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg py-1 z-[95] max-h-40 overflow-y-auto">
                      {allAssignees
                        .filter((s) => s.name.toLowerCase().includes(v.person.toLowerCase()))
                        .slice(0, 8)
                        .map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              onChange(v.id, 'person', s.name);
                              onChange(v.id, 'team', s.team);
                              setOpenSuggestId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center transition-colors"
                          >
                            <span className="font-bold text-gray-700">{s.name}</span>
                            <span className="text-gray-400 text-xs">{s.team}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <input
                  type="date"
                  className={`${styles.input} col-span-3`}
                  value={v.start}
                  onChange={(e) => onChange(v.id, 'start', e.target.value)}
                />
                <input
                  type="date"
                  className={`${styles.input} col-span-3`}
                  value={v.end}
                  onChange={(e) => onChange(v.id, 'end', e.target.value)}
                />
                <button
                  onClick={() => onRemove(v.id)}
                  className="col-span-1 text-sm font-bold text-red-500 hover:text-red-600 border border-red-200 rounded px-2 py-1 transition"
                  aria-label="휴가 삭제"
                >
                  -
                </button>
              </div>
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-12">
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    rows={2}
                    value={v.label || ''}
                    onChange={(e) => onChange(v.id, 'label', e.target.value)}
                    placeholder="비고 메모"
                  />
                </div>
              </div>
            </div>
          ))}
          <button onClick={onAdd} className={styles.addButton}>
            + 휴가 추가
          </button>
        </div>
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancel}>취소</button>
          <button onClick={() => onSave(vacations)} className={styles.save}>저장</button>
        </div>
      </div>
    </div>
  );
};

export default VacationModal;
