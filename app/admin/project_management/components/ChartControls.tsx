import React from 'react';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import styles from '../styles/ChartControls.module.css';

type Props = {
  viewMode: 'week' | 'day';
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (mode: 'week' | 'day') => void;
};

const ChartControls: React.FC<Props> = ({ viewMode, onPrev, onNext, onToday, onViewChange }) => {
  return (
    <div className={styles.controls}>
      <div className={styles.buttonGroup}>
        <button onClick={onPrev} className={styles.navButton}>
          <ChevronLeft className="w-4 h-4" /> 이전
        </button>
        <button onClick={onToday} className={styles.todayButton}>
          오늘 (Today)
        </button>
        <button onClick={onNext} className={styles.navButton}>
          다음 <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className={styles.buttonGroup}>
        <button
          onClick={() => onViewChange('week')}
          className={`${styles.viewButton} ${viewMode === 'week' ? styles.viewActive : styles.viewInactive}`}
        >
          주간
        </button>
        <button
          onClick={() => onViewChange('day')}
          className={`${styles.viewButton} ${viewMode === 'day' ? styles.viewActive : styles.viewInactive}`}
        >
          일간
        </button>
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} bg-gray-200`}></span> 대기
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} bg-blue-500`}></span> 진행
        </div>
        <div className={styles.legendItem}>
          <Flag className="w-3 h-3 text-red-500" /> 마일스톤
        </div>
      </div>
    </div>
  );
};

export default ChartControls;
