import React from 'react';
import { Clock, Edit3, Target, Flag, List, X } from 'lucide-react';
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
  const [isListOpen, setIsListOpen] = React.useState(false);

  const closeList = () => setIsListOpen(false);

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
              <Clock size={16} className={styles.emptyIcon} /> 
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
                      <span className={styles.upcoming}>
                        <Flag size={12} className={styles.upcomingIcon} />
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
        <div className={styles.allHeaderRow}>
          <h2 className={styles.allHeader}>
            <Target size={14} /> All Projects <span className={styles.allHint}>(click to jump)</span>
          </h2>
          <button
            type="button"
            className={styles.listButton}
            onClick={() => setIsListOpen(true)}
            aria-label="전체 프로젝트 리스트 보기"
          >
            <List size={14} />
            목록
          </button>
        </div>
        <div className={styles.allList}>
          <div className={styles.allGrid}>
            {groupedProjects.map((group) => (
              <div
                key={group.id}
                onClick={() => onShortcutClick(group)}
                onMouseEnter={() => setHoveredProjectName(group.name)}
                onMouseLeave={() => setHoveredProjectName(null)}
                className={`${styles.projectCard} ${hoveredProjectName === group.name ? styles.projectActive : ''}`}
              >
                <div
                  className={styles.projectBar}
                  style={{ backgroundColor: BAR_COLORS[group.colorIdx % BAR_COLORS.length].barHex }}
                ></div>
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
                      <Edit3 size={12} />
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
      {isListOpen && (
        <div className={styles.listModalBackdrop} role="presentation" onClick={closeList}>
          <div
            className={styles.listModal}
            role="dialog"
            aria-modal="true"
            aria-label="전체 프로젝트 리스트"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.listModalHeader}>
              <div>
                <p className={styles.listModalEyebrow}>빠르게 찾기</p>
                <h3 className={styles.listModalTitle}>전체 프로젝트 목록</h3>
              </div>
              <button type="button" className={styles.listClose} onClick={closeList} aria-label="닫기">
                <X size={14} />
              </button>
            </div>
            <div className={styles.listModalBody}>
              {groupedProjects.length === 0 ? (
                <div className={styles.listEmpty}>아직 등록된 프로젝트가 없습니다.</div>
              ) : (
                <div className={styles.listRows}>
                  {groupedProjects.map((group) => (
                    <button
                      key={group.id}
                      className={styles.listRow}
                      onClick={() => {
                        onShortcutClick(group);
                        closeList();
                      }}
                    >
                      <div
                        className={styles.listSwatch}
                        style={{
                          backgroundColor: BAR_COLORS[group.colorIdx % BAR_COLORS.length].barHex,
                        }}
                      />
                      <div className={styles.listRowText}>
                        <div className={styles.listRowTop}>
                          <span className={styles.listName}>{group.name}</span>
                          <span className={styles.listRange}>{group.start} ~ {group.end}</span>
                        </div>
                        <div className={styles.listMembers}>
                          {group.members.slice(0, 3).map((m, idx) => (
                            <span key={idx} className={styles.listMember}>{m.person}</span>
                          ))}
                          {group.members.length > 3 && (
                            <span className={styles.listMore}>+{group.members.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
