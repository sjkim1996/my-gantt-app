import React from 'react';
import { Clock, Edit3, Target, Flag } from 'lucide-react';
import { GroupedProject, Project } from '../types';
import { BAR_COLORS } from '../utils/colors';
import styles from '../styles/Dashboard.module.css';

type Props = {
  todayDate: Date;
  activeProjectsToday: GroupedProject[];
  groupedProjects: GroupedProject[];
  hoveredProjectName: string | null;
  onShortcutClick: (group: GroupedProject) => void;
  onProjectClick: (project: Project) => void;
  setHoveredProjectName: (name: string | null) => void;
};

const Dashboard: React.FC<Props> = ({
  todayDate,
  activeProjectsToday,
  groupedProjects,
  hoveredProjectName,
  onShortcutClick,
  onProjectClick,
  setHoveredProjectName,
}) => {
  return (
    <div className={styles.layout}>
      <div className={styles.todayCard}>
        <h2 className={styles.todayHeader}>
          <span className={styles.todayPulse}></span> Today&apos;s Active
          <span className={styles.todayDate}>{todayDate.toLocaleDateString()}</span>
        </h2>
        <div className={styles.todayList}>
          {activeProjectsToday.length === 0 ? (
            <div className={styles.emptyState}>
              <Clock className="w-4 h-4 mb-1 opacity-50" /> 
              진행 중인 프로젝트가 없습니다.
            </div>
          ) : (
            activeProjectsToday.map((p) => {
              const upcoming = (p.milestones || []).map((m) => m.date).sort();
              return (
                <div
                  key={p.id}
                  className={styles.todayItem}
                >
                  <div className={styles.todayItemTop}>
                    <span className={styles.todayTitle}>{p.name}</span>
                    <span className={styles.todayBadge}>
                      {p.members.length}명 참여
                    </span>
                  </div>
                  <div className={styles.todayMembers}>
                    {p.members.map((m, idx) => (
                      <span key={idx} className={styles.todayMemberChip}>
                        {m.person}
                      </span>
                    ))}
                  </div>
                  <div className={styles.todayMeta}>
                    <span className={styles.todayRange}>
                      {p.start} ~ {p.end}
                    </span>
                    {upcoming.length > 0 && (
                      <span className="flex items-center gap-1 text-red-600 font-semibold">
                        <Flag className="w-3 h-3" />
                        {upcoming[0]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={styles.allCard}>
        <h2 className={styles.allHeader}>
          <Target className="w-3.5 h-3.5" /> All Projects <span className={styles.allHint}>(click to jump)</span>
        </h2>
        <div className={styles.allList}>
          <div className={styles.allGrid}>
            {groupedProjects.map((group) => (
              <div
                key={group.id}
                onClick={() => onShortcutClick(group)}
                onMouseEnter={() => setHoveredProjectName(group.name)}
                onMouseLeave={() => setHoveredProjectName(null)}
                className={`${styles.projectCard} group ${hoveredProjectName === group.name ? styles.projectActive : ''}`}
              >
                <div className={`${styles.projectBar} ${BAR_COLORS[group.colorIdx % BAR_COLORS.length].bar}`}></div>
                <div className={styles.projectBody}>
                  <div className={styles.projectName} title={group.name}>
                    {group.name}
                  </div>
                  <div className={styles.projectMembers}>
                    {group.members.slice(0, 2).map((m, i) => (
                      <span key={i} className={styles.projectChip}>
                        {m.person}
                      </span>
                    ))}
                    {group.members.length > 2 && (
                      <span className={styles.projectMore}>+{group.members.length - 2}</span>
                    )}
                  </div>
                </div>
                <button
                  className={styles.editButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onProjectClick(group);
                  }}
                  aria-label="프로젝트 수정"
                >
                  <div className={styles.editButtonInner}>
                    <Edit3 className="w-3 h-3" />
                  </div>
                </button>
              </div>
            ))}
            {groupedProjects.length === 0 && (
              <div className={styles.emptyProjects}>
                아직 프로젝트가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
