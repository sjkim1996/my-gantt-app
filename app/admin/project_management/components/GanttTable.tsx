import React from 'react';
import { parseDate, formatDate, getDaysDiff } from '../utils/date';
import { getColorSet } from '../utils/colors';
import { getPackedProjects } from '../utils/gantt';
import { Project, Team } from '../types';
import styles from '../styles/GanttTable.module.css';

export type TimelineBlock = {
  id: number;
  label: string;
  subLabel: string;
  start: Date;
  end: Date;
  isTodayWeek: boolean;
  isToday?: boolean;
};

type Props = {
  timeline: TimelineBlock[];
  teams: Team[];
  projects: Project[];
  viewMode: 'week' | 'day';
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  todayColumnRef: React.RefObject<HTMLTableHeaderCellElement | null>;
  rowRefs: React.MutableRefObject<Record<string, HTMLTableRowElement | null>>;
  hoveredProjectName: string | null;
  setHoveredProjectName: (name: string | null) => void;
  handleProjectClick: (project: Project) => void;
  chartTotalDays: number;
};

const GanttTable: React.FC<Props> = ({
  timeline,
  teams,
  projects,
  viewMode,
  chartContainerRef,
  todayColumnRef,
  rowRefs,
  hoveredProjectName,
  setHoveredProjectName,
  handleProjectClick,
  chartTotalDays,
}) => {
  const chartStart = timeline.length > 0 ? parseDate(formatDate(timeline[0].start)) : null;
  const chartEnd = timeline.length > 0 ? parseDate(formatDate(timeline[timeline.length - 1].end)) : null;
  const blockHasEvent = timeline.map((block) => {
    const bStart = parseDate(formatDate(block.start));
    const bEnd = parseDate(formatDate(block.end));
    return projects.some((p) =>
      (p.milestones || []).some((m) => {
        const d = parseDate(m.date);
        return d >= bStart && d <= bEnd;
      })
    );
  });

  return (
    <div className={styles.container} ref={chartContainerRef}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.header}>
            <tr>
              <th className={styles.teamHeader}>
                Team
              </th>
              <th className={styles.memberHeader}>
                Member
              </th>

              {timeline.map((w) => (
                <th
                  key={w.id}
                  ref={w.isTodayWeek ? todayColumnRef : null}
                  style={{ minWidth: viewMode === 'week' ? 140 : 80 }}
                  className={`${styles.timelineHead} ${
                    w.isTodayWeek ? styles.timelineToday : blockHasEvent[w.id] ? styles.timelineEvent : styles.timelineDefault
                  }`}
                >
                  <div className={`${styles.timelineLabel} ${w.isTodayWeek ? styles.timelineLabelToday : styles.timelineLabelDefault}`}>
                    {w.label}{' '}
                    {w.isTodayWeek && <span className="inline-block w-1.5 h-1.5 bg-indigo-500 rounded-full ml-1 align-middle mb-0.5"></span>}
                  </div>
                  <div className={styles.timelineSublabel}>{w.subLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <React.Fragment key={team.id}>
                {team.members.map((member, mIdx) => {
                  const isFirst = mIdx === 0;
                  const isLast = mIdx === team.members.length - 1;
                  const rowKey = `${team.name}-${member}`;
                  const myProjects = projects.filter((p) => p.person === member && p.team === team.name);
                  const { packed, totalRows } = getPackedProjects(myProjects);
                  const memberVacations = (() => {
                    const map = new Map<string, { label: string; start: Date; end: Date; color: string }>();
                    myProjects.forEach(p => (p.vacations || []).forEach(v => {
                      const s = parseDate(v.start);
                      const e = parseDate(v.end);
                      const key = `${v.label || ''}-${v.start}-${v.end}`;
                      if (!map.has(key)) map.set(key, { label: v.label || '', start: s, end: e, color: v.color || '#94a3b8' });
                    }));
                    return Array.from(map.values());
                  })();
                  const hasNotes = myProjects.some(p => p.notes && p.notes.trim().length > 0);
                  const laneHeight = 32;
                  const rowHeight = Math.max(48, totalRows * laneHeight + (hasNotes ? 38 : 12));

                  return (
                    <tr
                      key={rowKey}
                      ref={(el) => {
                        rowRefs.current[rowKey] = el;
                      }}
                      className={styles.row}
                    >
                      <td
                        className={`${styles.teamCell} ${isLast ? styles.teamCellBottom : styles.teamCellSpacer}`}
                      >
                        {isFirst ? team.name : ''}
                      </td>

                      <td className={styles.memberCell}>
                        <div>{member}</div>
                      </td>

                      <td colSpan={timeline.length} className={styles.rowBody} style={{ height: rowHeight }}>
                        <div className={styles.gridRow}>
                          {timeline.map((w) => (
                            <div
                              key={w.id}
                              className={`${styles.gridCell} ${
                                w.isTodayWeek ? styles.gridToday : blockHasEvent[w.id] ? styles.gridEvent : ''
                              }`}
                            ></div>
                          ))}
                        </div>

                        {chartStart && chartEnd && memberVacations.map((vac, idx) => {
                          if (vac.end < chartStart || vac.start > chartEnd) return null;
                          const effectiveStart = vac.start < chartStart ? chartStart : vac.start;
                          const effectiveEnd = vac.end > chartEnd ? chartEnd : vac.end;
                          const duration = Math.max(1, getDaysDiff(chartStart, chartEnd) + 1);
                          const left = (getDaysDiff(chartStart, effectiveStart) / duration) * 100;
                          const width = (getDaysDiff(effectiveStart, effectiveEnd) + 1) / duration * 100;
                          return (
                            <div
                              key={`vac-${rowKey}-${idx}`}
                              className={styles.vacation}
                              style={{ left: `${left}%`, width: `${width}%`, top: '2px' }}
                              title={vac.label ? `휴가: ${vac.label}` : '휴가'}
                            />
                          );
                        })}

                        {packed.map((proj) => {
                          if (!chartStart || !chartEnd || chartTotalDays <= 0) return null;
                          const pStart = parseDate(proj.start);
                          const pEnd = parseDate(proj.end);
                          if (pEnd < chartStart || pStart > chartEnd) return null;

                          const effectiveStart = pStart < chartStart ? chartStart : pStart;
                          const effectiveEnd = pEnd > chartEnd ? chartEnd : pEnd;
                          const duration = Math.max(1, chartTotalDays);
                          const offsetDays = getDaysDiff(chartStart, effectiveStart);
                          const spanDays = Math.max(1, getDaysDiff(effectiveStart, effectiveEnd) + 1);
                          const left = (offsetDays / duration) * 100;
                          const width = (spanDays / duration) * 100;
                          const top = `${proj.row * laneHeight + 4}px`;

                          const isDimmed = hoveredProjectName && hoveredProjectName !== proj.name;
                          const isHighlighted = hoveredProjectName === proj.name;
                          const showNote = isHighlighted;
                          const colorSet = getColorSet(proj);
                          const barTitle = proj.notes ? `${proj.name} - 메모: ${proj.notes}` : proj.name;

                          return (
                            <div key={proj.id}>
                              <div
                                onClick={() => handleProjectClick(proj)}
                                onMouseEnter={() => setHoveredProjectName(proj.name)}
                                onMouseLeave={() => setHoveredProjectName(null)}
                                className={`${styles.projectBlock} group ${colorSet.customBg ? '' : `${colorSet.bg} ${colorSet.border}`} ${
                                  isDimmed ? styles.projectDimmed : styles.projectHover
                                } ${isHighlighted ? styles.projectHighlighted : ''}`}
                                style={{ left: `${left}%`, width: `${width}%`, top, backgroundColor: colorSet.customBg, borderColor: colorSet.customBorder }}
                                title={barTitle}
                              >
                                <div className={`${styles.projectBar} ${colorSet.barClass || ''}`} style={{ backgroundColor: colorSet.barColor }}></div>
                                <span className={`${styles.projectText} ${colorSet.textClass || ''}`} style={{ color: colorSet.customText }}>
                                  {proj.name}
                                </span>
                                {proj.notes && (
                                  <div
                                    className={styles.projectNote}
                                    style={{ opacity: showNote ? 1 : undefined, visibility: showNote ? 'visible' : 'hidden' }}
                                  >
                                    {proj.notes}
                                  </div>
                                )}
                              </div>

                              {(proj.milestones || []).map((m) => {
                                const mDate = parseDate(m.date);
                                if (mDate < effectiveStart || mDate > effectiveEnd) return null;
                                const offset = getDaysDiff(chartStart, mDate);
                                const leftPos = (offset / duration) * 100;
                                const markerWidth = viewMode === 'day' ? 10 : 6;
                                return (
                                  <div
                                    key={m.id}
                                    className={styles.milestoneMarker}
                                    style={{ left: `${leftPos}%`, width: `${markerWidth}px`, minWidth: `${markerWidth}px`, backgroundColor: m.color || '#ef4444', top: `${proj.row * laneHeight + 4}px` }}
                                    title={`${m.label} (${m.date})`}
                                  />
                                );
                              })}
                            </div>
                          );
                        })}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GanttTable;
