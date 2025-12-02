import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Vacation, Assignee } from '../types';
import styles from '../styles/VacationModal.module.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  vacations: Vacation[];
  allVacations: Vacation[];
  onChange: (id: string, field: 'person' | 'team' | 'label' | 'start' | 'end', value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onSave: (v: Vacation[]) => void;
  allAssignees: Assignee[];
  defaultTab?: 'create' | 'list';
};

const VacationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  vacations,
  allVacations,
  onChange,
  onAdd,
  onRemove,
  onSave,
  allAssignees,
  defaultTab = 'create',
}) => {
  const [openSuggestId, setOpenSuggestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>(defaultTab);

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  if (!isOpen) return null;
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>구성원 휴가</h3>
          <button onClick={onClose} className={styles.iconButton}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabButton} ${activeTab === 'create' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('create')}
          >
            휴가 등록
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'list' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('list')}
          >
            휴가 현황
          </button>
        </div>
        <div className={styles.body}>
          {activeTab === 'list' ? (
            <div className="space-y-2">
              <div className={styles.gridHeader}>
                <div className={styles.col3}>구성원</div>
                <div className={styles.col3}>팀</div>
                <div className={styles.col3}>기간</div>
                <div className={styles.col3}>비고</div>
              </div>
              {allVacations.length === 0 ? (
                <div className="text-sm text-gray-500">등록된 휴가가 없습니다.</div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {allVacations.map((v, idx) => (
                    <div key={v.id || idx} className="grid grid-cols-12 gap-2 text-sm items-center px-2 py-1 border-b border-gray-100">
                      <div className="col-span-3 font-bold text-gray-800">{v.person}</div>
                      <div className="col-span-3 text-gray-600">{v.team}</div>
                      <div className="col-span-3 text-gray-700">{v.start} ~ {v.end}</div>
                      <div className="col-span-3 text-gray-500 truncate">{v.label || '-'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
<>
          <div className={styles.gridHeader}>
            <div className={styles.col2}>구성원명</div>
            <div className={styles.col2}>팀</div>
            <div className={styles.col3}>휴가 시작일</div>
            <div className={styles.col3}>휴가 종료일</div>
            <div className={styles.col2}>비고 / 삭제</div>
          </div>
          {vacations.map((v) => (
            <div key={v.id} className="bg-gray-50 p-3 rounded border border-gray-100 space-y-2 shadow-sm">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2 relative">
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
                  className={`${styles.input} col-span-2`}
                  value={v.team || ''}
                  onChange={(e) => onChange(v.id, 'team', e.target.value)}
                  placeholder="팀"
                />
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
                  className="col-span-2 text-sm font-bold text-red-600 hover:text-red-700 border border-red-200 rounded px-2 py-2 transition flex items-center justify-center gap-1 bg-red-50"
                  aria-label="휴가 삭제"
                >
                  <Trash2 className="w-4 h-4" />
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
        </>
          )}
        </div>
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancel}>취소</button>
          {activeTab === 'create' && <button onClick={() => onSave(vacations)} className={styles.save}>저장</button>}
        </div>
      </div>
    </div>
  );
};

export default VacationModal;
