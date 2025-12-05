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
            <X size={20} />
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
            <div className={styles.listWrapper}>
              <div className={styles.gridHeader}>
                <div className={styles.col3}>구성원</div>
                <div className={styles.col3}>팀</div>
                <div className={styles.col3}>기간</div>
                <div className={styles.col3}>비고</div>
              </div>
              {allVacations.length === 0 ? (
                <div className={styles.listEmpty}>등록된 휴가가 없습니다.</div>
              ) : (
                <div className={styles.listScroller}>
                  {allVacations.map((v, idx) => (
                    <div key={v.id || idx} className={styles.listRow}>
                      <div className={`${styles.listCol3} ${styles.listCellStrong}`}>{v.person}</div>
                      <div className={`${styles.listCol3} ${styles.listCell}`}>{v.team}</div>
                      <div className={`${styles.listCol3} ${styles.listCell}`}>{v.start} ~ {v.end}</div>
                      <div className={`${styles.listCol3} ${styles.listCellMuted}`}>{v.label || '-'}</div>
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
            <div key={v.id} className={styles.rowCard}>
              <div className={styles.rowGrid}>
                <div className={`${styles.colSpan2} ${styles.relativeWrap}`}>
                  <input
                    className={styles.input}
                    value={v.person}
                    onFocus={() => setOpenSuggestId(v.id)}
                    onChange={(e) => {
                      onChange(v.id, 'person', e.target.value);
                      setOpenSuggestId(v.id);
                    }}
                    placeholder="이름"
                  />
                  {openSuggestId === v.id && v.person && (
                    <div className={styles.suggestionMenu}>
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
                            className={styles.suggestionItem}
                          >
                            <span className={styles.suggestionName}>{s.name}</span>
                            <span className={styles.suggestionTeam}>{s.team}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <input
                  className={`${styles.input} ${styles.colSpan2}`}
                  value={v.team || ''}
                  onChange={(e) => onChange(v.id, 'team', e.target.value)}
                  placeholder="팀"
                />
                <input
                  type="date"
                  className={`${styles.input} ${styles.colSpan3}`}
                  value={v.start}
                  onChange={(e) => onChange(v.id, 'start', e.target.value)}
                />
                <input
                  type="date"
                  className={`${styles.input} ${styles.colSpan3}`}
                  value={v.end}
                  onChange={(e) => onChange(v.id, 'end', e.target.value)}
                />
                <button
                  onClick={() => onRemove(v.id)}
                  className={styles.rowButtonRemove}
                  aria-label="휴가 삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className={styles.rowGrid}>
                <div className={styles.colSpan12}>
                  <textarea
                    className={styles.rowTextarea}
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
