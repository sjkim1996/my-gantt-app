import React, { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { Project } from '../types';
import { formatDate, getDaysDiff, parseDate } from '../utils/date';
import styles from '../styles/CalendarView.module.css';

type Props = {
  timeline: { start: Date; end: Date }[];
  projects: Project[];
  onProjectClick: (project: Project) => void;
};

type CalendarDay = {
  date: Date;
  label: string;
  projects: Project[];
};

const CalendarView: React.FC<Props> = ({ timeline, projects, onProjectClick }) => {
  const days = useMemo<CalendarDay[]>(() => {
    if (!timeline.length) return [];
    const start = parseDate(formatDate(timeline[0].start));
    const end = parseDate(formatDate(timeline[timeline.length - 1].end));
    const total = getDaysDiff(start, end);
    const list: CalendarDay[] = [];
    for (let i = 0; i <= total; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const label = formatDate(current);
      const active = projects.filter((p) => {
        const s = parseDate(p.start);
        const e = parseDate(p.end);
        return current >= s && current <= e;
      });
      list.push({ date: current, label, projects: active });
    }
    return list;
  }, [timeline, projects]);

  if (!days.length) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <CalendarClock size={18} />
          <span>Calendar View</span>
        </div>
        <p className={styles.subTitle}>기간 내 일별 진행 현황</p>
      </div>
      <div className={styles.grid}>
        {days.map((day) => (
          <div key={day.label} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.cardDate}>{day.label}</span>
              <span className={styles.cardCount}>{day.projects.length}개 진행</span>
            </div>
            <div className={styles.projectList}>
              {day.projects.length === 0 ? (
                <span className={styles.empty}>없음</span>
              ) : (
                day.projects.slice(0, 4).map((p) => (
                  <button
                    key={`${p.id}-${p.person}-${p.team}`}
                    onClick={() => onProjectClick(p)}
                    className={styles.projectChip}
                  >
                    <span className={styles.projectName}>{p.name}</span>
                    <span className={styles.projectPerson}>{p.person}</span>
                  </button>
                ))
              )}
              {day.projects.length > 4 && (
                <span className={styles.more}>+{day.projects.length - 4} 더보기</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
