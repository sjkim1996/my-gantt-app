import React from 'react';
import { X } from 'lucide-react';
import { Vacation } from '../types';
import styles from '../styles/VacationModal.module.css';

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
            <div className={styles.col2}>팀</div>
            <div className={styles.col3}>휴가 시작일</div>
            <div className={styles.col3}>휴가 종료일</div>
            <div className={styles.col1}>비고</div>
          </div>
          {vacations.map((v) => (
            <div key={v.id} className={styles.row}>
              <input
                className={`${styles.input} ${styles.col3}`}
                value={v.person}
                onChange={(e) => onChange(v.id, 'person', e.target.value)}
                placeholder="이름"
              />
              <input
                className={`${styles.input} ${styles.col2}`}
                value={v.team || ''}
                onChange={(e) => onChange(v.id, 'team', e.target.value)}
                placeholder="팀"
              />
              <input
                type="date"
                className={`${styles.input} ${styles.col3}`}
                value={v.start}
                onChange={(e) => onChange(v.id, 'start', e.target.value)}
              />
              <input
                type="date"
                className={`${styles.input} ${styles.col3}`}
                value={v.end}
                onChange={(e) => onChange(v.id, 'end', e.target.value)}
              />
              <div className={`${styles.col1} flex items-center gap-1`}>
                <input
                  className={styles.noteInput}
                  value={v.label || ''}
                  onChange={(e) => onChange(v.id, 'label', e.target.value)}
                  placeholder="메모"
                />
                <button onClick={() => onRemove(v.id)} className={styles.removeButton}>′</button>
              </div>
            </div>
          ))}
          <button onClick={onAdd} className={styles.addButton}>
            + 휴가 추가
          </button>
        </div>
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancel}>취소</button>
          <button onClick={onSave} className={styles.save}>저장</button>
        </div>
      </div>
    </div>
  );
};

export default VacationModal;
