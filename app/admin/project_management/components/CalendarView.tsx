import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Flag, Users, X } from 'lucide-react';
import { Assignee, Project, Team, Vacation } from '../types';
import { formatDate, parseDate } from '../utils/date';
import { getColorSet, getReadableTextColor, lightenColor, darkenColor } from '../utils/colors';
import styles from '../styles/CalendarView.module.css';

type Props = {
  month: Date;
  onMonthChange: (next: Date) => void;
  teams: Team[];
  selectedMembers: Assignee[];
  onToggleTeam: (teamName: string) => void;
  onToggleMember: (teamName: string, memberName: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  projects: Project[];
  vacations: Vacation[];
};

type ProjectGroup = {
  key: string;
  name: string;
  start: Date;
  end: Date;
  members: Assignee[];
  color: string;
  textColor: string;
  barHex: string;
  milestones: { id: string; date: Date; label: string }[];
};

type Segment = {
  projectKey: string;
  name: string;
  members: Assignee[];
  weekIndex: number;
  startIdx: number;
  span: number;
  color: string;
  textColor: string;
};

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const CalendarView: React.FC<Props> = ({
  month,
  onMonthChange,
  teams,
  selectedMembers,
  onToggleTeam,
  onToggleMember,
  onSelectAll,
  onClearAll,
  projects,
  vacations,
}) => {
  const [modalDayKey, setModalDayKey] = useState<string | null>(null);
  const selectedSet = useMemo(
    () => new Set(selectedMembers.map((m) => `${m.team.toLowerCase()}__${m.name.toLowerCase()}`)),
    [selectedMembers]
  );

  const startOfMonth = useMemo(() => {
    const d = new Date(month);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [month]);
  const monthLabel = useMemo(() => `${month.getFullYear()}년 ${month.getMonth() + 1}월`, [month]);

  const startOfGrid = useMemo(() => {
    const base = new Date(startOfMonth);
    const day = base.getDay();
    base.setDate(base.getDate() - day);
    return base;
  }, [startOfMonth]);

  const days = useMemo(() => {
    return Array.from({ length: 42 }).map((_, idx) => {
      const d = new Date(startOfGrid);
      d.setDate(startOfGrid.getDate() + idx);
      return {
        key: formatDate(d),
        date: d,
        inMonth: d.getMonth() === month.getMonth(),
        isToday: formatDate(d) === formatDate(new Date()),
        weekIndex: Math.floor(idx / 7),
        colIndex: idx % 7,
      };
    });
  }, [startOfGrid, month]);

  const groupedProjects = useMemo<ProjectGroup[]>(() => {
    const map = new Map<string, ProjectGroup>();
    projects.forEach((p) => {
      const memberKey = `${p.team.toLowerCase()}__${p.person.toLowerCase()}`;
      if (!selectedSet.has(memberKey)) return;
      const key = p.name;
      const start = parseDate(p.start);
      const end = parseDate(p.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
      const colorSet = getColorSet(p);
      const barColor = colorSet.barHex || '#3b82f6';
      const soft = lightenColor(barColor, 0.8);
      const textColor = getReadableTextColor(soft);

      const milestoneList =
        (p.milestones || [])
          .filter((m) => !Number.isNaN(parseDate(m.date).getTime()))
          .map((m) => ({ id: m.id, date: parseDate(m.date), label: m.label || '마일스톤' })) || [];

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: p.name,
          start,
          end,
          members: [{ name: p.person, team: p.team }],
          color: soft,
          textColor,
          barHex: barColor,
          milestones: milestoneList,
        });
      } else {
        const g = map.get(key)!;
        if (start < g.start) g.start = start;
        if (end > g.end) g.end = end;
        if (!g.members.find((m) => m.name === p.person && m.team === p.team)) {
          g.members.push({ name: p.person, team: p.team });
        }
        g.milestones = [...g.milestones, ...milestoneList];
      }
    });

    return Array.from(map.values()).map((g) => {
      const dedup = new Map<string, { id: string; date: Date; label: string }>();
      g.milestones.forEach((m) => {
        const key = `${m.label}-${formatDate(m.date)}`;
        if (!dedup.has(key)) dedup.set(key, m);
      });
      return { ...g, milestones: Array.from(dedup.values()) };
    });
  }, [projects, selectedSet]);

  const projectMap = useMemo(() => {
    const m = new Map<string, ProjectGroup>();
    groupedProjects.forEach((g) => m.set(g.key, g));
    return m;
  }, [groupedProjects]);

  const BAR_HEIGHT = 22;
  const BAR_GAP = 6;
  const DAY_HEIGHT = 126;
  const VAC_HEIGHT = DAY_HEIGHT - 16;
  const VAC_GAP = 4;
  const DAY_GAP = 8;
  const GRID_OFFSET = 26;

  const weeklySegments = useMemo<Segment[][]>(() => {
    const segsByWeek: Segment[][] = Array.from({ length: 6 }).map(() => []);
    groupedProjects.forEach((g) => {
      for (let w = 0; w < 6; w++) {
        const weekStart = new Date(startOfGrid);
        weekStart.setDate(startOfGrid.getDate() + w * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (g.end < weekStart || g.start > weekEnd) continue;
        const segStart = g.start < weekStart ? weekStart : g.start;
        const segEnd = g.end > weekEnd ? weekEnd : g.end;
        const startIdx = segStart.getDay();
        const span = Math.max(1, Math.floor((segEnd.getTime() - segStart.getTime()) / 86400000) + 1);
        segsByWeek[w].push({
          projectKey: g.key,
          name: g.name,
          members: g.members,
          weekIndex: w,
          startIdx,
          span,
          color: g.color,
          textColor: g.textColor,
        });
      }
    });
    return segsByWeek;
  }, [groupedProjects, startOfGrid]);

  const lanesByWeek = useMemo<Segment[][][]>(() => {
    return weeklySegments.map((segs) => {
      const lanes: Segment[][] = [];
      segs.forEach((seg) => {
        let placed = false;
        for (const lane of lanes) {
          const collision = lane.some(
            (s) => !(seg.startIdx + seg.span <= s.startIdx || s.startIdx + s.span <= seg.startIdx)
          );
          if (!collision) {
            lane.push(seg);
            placed = true;
            break;
          }
        }
        if (!placed) lanes.push([seg]);
      });
      return lanes;
    });
  }, [weeklySegments]);

  const dayOverlaps = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((d) => map.set(d.key, 0));

    groupedProjects.forEach((g) => {
      days.forEach((d) => {
        if (d.date >= g.start && d.date <= g.end) {
          map.set(d.key, (map.get(d.key) || 0) + 1);
        }
      });
    });
    vacations.forEach((v) => {
      const key = `${(v.team || '').toLowerCase()}__${(v.person || '').toLowerCase()}`;
      if (!selectedSet.has(key)) return;
      const s = parseDate(v.start);
      const e = parseDate(v.end);
      days.forEach((d) => {
        if (d.date >= s && d.date <= e) {
          map.set(d.key, (map.get(d.key) || 0) + 1);
        }
      });
    });
    return map;
  }, [days, groupedProjects, vacations, selectedSet]);

  const dayDetails = useMemo(() => {
    const map = new Map<
      string,
      { projects: ProjectGroup[]; milestones: { label: string; project: string; color?: string }[]; vacations: Vacation[] }
    >();
    days.forEach((d) => {
      const projectsOnDay = groupedProjects.filter((g) => d.date >= g.start && d.date <= g.end);
      const milestones = groupedProjects
        .flatMap((g) =>
          g.milestones
            .filter((m) => formatDate(m.date) === d.key)
            .map((m) => ({ label: m.label, project: g.name, color: g.barHex || g.color }))
        );
      const vacs = vacations.filter((v) => {
        const key = `${(v.team || '').toLowerCase()}__${(v.person || '').toLowerCase()}`;
        if (!selectedSet.has(key)) return false;
        const s = parseDate(v.start);
        const e = parseDate(v.end);
        return d.date >= s && d.date <= e;
      });
      map.set(d.key, { projects: projectsOnDay, milestones, vacations: vacs });
    });
    return map;
  }, [days, groupedProjects, vacations, selectedSet]);

  const shouldHideSegment = (weekIdx: number, seg: Segment) => {
    const weekStart = new Date(startOfGrid);
    weekStart.setDate(startOfGrid.getDate() + weekIdx * 7 + seg.startIdx);
    for (let i = 0; i < seg.span; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const count = dayOverlaps.get(formatDate(d)) || 0;
      if (count >= 4) return true;
    }
    return false;
  };

  const maxVacLanes = 0;

  const handleMonthOffset = (delta: number) => {
    const next = new Date(month);
    next.setMonth(month.getMonth() + delta);
    next.setDate(1);
    onMonthChange(next);
  };

  const handleMonthInput = (value: string) => {
    if (!value) return;
    const [y, m] = value.split('-').map(Number);
    if (!y || !m) return;
    const next = new Date(y, m - 1, 1);
    onMonthChange(next);
  };

  const openDayModal = (key: string) => setModalDayKey(key);
  const closeDayModal = () => setModalDayKey(null);

  const dayModalData = modalDayKey ? dayDetails.get(modalDayKey) : null;

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitle}>
              <Users className="w-4 h-4" /> 팀 리모컨
            </div>
            <div className={styles.sidebarActions}>
              <button className={styles.smallButton} onClick={onSelectAll}>전체 선택</button>
              <button className={styles.smallButton} onClick={onClearAll}>모두 해제</button>
            </div>
          </div>
          <div className={styles.teamList}>
            {teams.map((team) => {
              const members = team.members || [];
              const selectedCount = members.filter((m) =>
                selectedSet.has(`${team.name.toLowerCase()}__${m.toLowerCase()}`)
              ).length;
              const allChecked = members.length > 0 && selectedCount === members.length;
              return (
                <div key={team.id || team.name} className={styles.teamCard}>
                  <label className={styles.teamHeader}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={() => onToggleTeam(team.name)}
                      className={styles.checkbox}
                    />
                    <span className={styles.teamName}>{team.name}</span>
                    <span className={styles.countBadge}>{selectedCount}/{members.length}</span>
                  </label>
                  <div className={styles.memberList}>
                    {members.map((m) => {
                      const checked = selectedSet.has(`${team.name.toLowerCase()}__${m.toLowerCase()}`);
                      return (
                        <label key={m} className={styles.memberRow}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleMember(team.name, m)}
                            className={styles.checkbox}
                          />
                          <span className={styles.memberName}>{m}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.main}>
          <div className={styles.monthBar}>
            <div className={styles.monthTitle}>
              <CalendarDays className="w-5 h-5" />
              <span>{monthLabel}</span>
            </div>
            <div className={styles.monthControls}>
              <button className={styles.navButton} onClick={() => handleMonthOffset(-1)}>
                <ChevronLeft className="w-4 h-4" /> 이전
              </button>
              <input
                type="month"
                value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => handleMonthInput(e.target.value)}
                className={styles.monthInput}
              />
              <button className={styles.navButton} onClick={() => handleMonthOffset(1)}>
                다음 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={styles.calendar}>
            <div className={styles.dayHeaders}>
              {DAY_NAMES.map((d) => (
                <div key={d} className={styles.dayHeader}>{d}</div>
              ))}
            </div>
            <div className={styles.calendarGrid} style={{ minHeight: GRID_OFFSET + 6 * (DAY_HEIGHT + DAY_GAP) }}>
              {days.map((day) => {
                const overlapCount = dayOverlaps.get(day.key) || 0;
                const showMore = overlapCount > 3;
                const vacs = dayDetails.get(day.key)?.vacations || [];
                const vacationNames = Array.from(
                  new Set(
                    vacs
                      .filter((v) => !!v.person)
                      .map((v) => (v.person || '').trim())
                  )
                );
                return (
                  <div
                    key={day.key}
                    className={`${styles.dayCell} ${!day.inMonth ? styles.dayMuted : ''} ${day.isToday ? styles.dayToday : ''}`}
                  >
                    <div className={styles.dayNumberRow}>
                      <span
                        className={`${styles.dayNumber} ${
                          day.colIndex === 0 ? styles.daySunday : day.colIndex === 6 ? styles.daySaturday : ''
                        }`}
                      >
                        {day.date.getDate()}
                      </span>
                      {showMore && (
                        <button className={styles.moreBadge} onClick={() => openDayModal(day.key)}>+more</button>
                      )}
                    </div>
                    {vacationNames.length > 0 && (
                      <div className={styles.vacationList}>
                        {vacationNames.join(', ')} 휴가
                      </div>
                    )}
                    {showMore && (
                      <div className={styles.overflowNotice}>
                        일정이 너무 많아 표시할 수 없습니다. 우측 +more를 확인하세요.
                      </div>
                    )}
                  </div>
                );
              })}

              <div className={styles.barLayer} style={{ height: GRID_OFFSET + 6 * (DAY_HEIGHT + DAY_GAP) }}>
                {lanesByWeek.map((lanes, weekIdx) =>
                  lanes.map((lane, laneIdx) =>
                    lane.map((seg) => {
                      const left = seg.startIdx;
                      const width = seg.span;
                      const project = projectMap.get(seg.projectKey);
                      if (shouldHideSegment(weekIdx, seg)) return null;
                      return (
                        <div
                          key={`${seg.projectKey}-${weekIdx}-${laneIdx}-${left}`}
                          className={styles.bar}
                          style={{
                            top: GRID_OFFSET + weekIdx * (DAY_HEIGHT + DAY_GAP) + maxVacLanes * (VAC_HEIGHT + VAC_GAP) + laneIdx * (BAR_HEIGHT + BAR_GAP),
                            left: `calc((var(--col-width) + var(--day-gap)) * ${left})`,
                            width: `calc(var(--col-width) * ${width} + var(--day-gap) * ${width - 1})`,
                            height: BAR_HEIGHT,
                            backgroundColor: seg.color,
                            color: seg.textColor,
                          }}
                          title={seg.name}
                        >
                          <div className={styles.barLabel}>
                            <span className={styles.barTitle}>
                              {seg.name} · {seg.members.map((m) => m.name).join(', ')}
                            </span>
                          </div>
                          <div className={styles.milestoneDots}>
                            {(project?.milestones || [])
                              .filter((m) => {
                                const weekStart = new Date(startOfGrid);
                                weekStart.setDate(startOfGrid.getDate() + weekIdx * 7);
                                const weekEnd = new Date(weekStart);
                                weekEnd.setDate(weekEnd.getDate() + 6);
                                return m.date >= weekStart && m.date <= weekEnd;
                              })
                              .map((m) => {
                                const weekStart = new Date(startOfGrid);
                                weekStart.setDate(startOfGrid.getDate() + weekIdx * 7);
                                const offset = m.date.getDay();
                                if (offset < seg.startIdx || offset >= seg.startIdx + seg.span) return null;
                                const pct = ((offset - seg.startIdx) / seg.span) * 100;
                                const base = project?.barHex || '#3b82f6';
                                const milestoneColor = darkenColor(base, 0.25);
                                const milestoneText = getReadableTextColor(milestoneColor);
                                return (
                                  <span
                                    key={m.id}
                                    className={styles.milestoneDot}
                                    style={{ left: `${pct}%`, backgroundColor: milestoneColor, color: milestoneText, borderColor: darkenColor(base, 0.35) }}
                                    title={`${seg.name} · ${m.label}`}
                                  >
                                    <span className={styles.milestoneFlag}>
                                      <Flag className="w-3 h-3" />
                                    </span>
                                    <span className={styles.milestoneLabel}>{m.label}</span>
                                  </span>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalDayKey && (
        <div className={styles.modalOverlay} onClick={closeDayModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>{modalDayKey} 일정</div>
              <button className={styles.modalClose} onClick={closeDayModal}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={styles.modalBody}>
              {(dayModalData?.projects || []).map((p) => (
                <div key={`p-${p.key}`} className={styles.modalItem}>
                  <div className={styles.modalItemTitleRow}>
                    <span className={styles.modalColorDot} style={{ backgroundColor: p.color }}></span>
                    <span className={styles.modalItemTitle}>{p.name}</span>
                  </div>
                  <div className={styles.modalMeta}>{p.members.map((m) => m.name).join(', ')}</div>
                </div>
              ))}
              {(dayModalData?.milestones || []).map((m, idx) => (
                <div key={`m-${idx}`} className={styles.modalItem}>
                  <div className={styles.modalItemTitleRow}>
                    <span className={styles.milestoneDot} style={{ backgroundColor: m.color || '#f59e0b' }}>
                      <Flag className="w-3 h-3" />
                    </span>
                    <div>
                      <div className={styles.modalItemTitle}>{m.project}</div>
                      <div className={styles.modalMeta}>{m.label}</div>
                    </div>
                  </div>
                </div>
              ))}
              {(dayModalData?.vacations || []).map((v, idx) => (
                <div key={`v-${idx}`} className={styles.modalItem}>
                  <div className={styles.modalItemTitle}>[휴가] {v.person}</div>
                  <div className={styles.modalMeta}>{v.label || `${v.start} ~ ${v.end}`}</div>
                </div>
              ))}
              {(!dayModalData ||
                ((dayModalData.projects || []).length === 0 &&
                  (dayModalData.milestones || []).length === 0 &&
                  (dayModalData.vacations || []).length === 0)) && (
                <div className={styles.modalEmpty}>일정이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
