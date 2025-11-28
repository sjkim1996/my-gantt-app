import React from 'react';
import { parseDate, getDaysDiff } from '../utils/date';
import { getColorSet } from '../utils/colors';
import { getPackedProjects, getProjectStyle } from '../utils/gantt';
import { Project, Team } from '../types';

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
  return (
    <div
      className="flex-1 rounded-xl shadow-sm bg-white border border-gray-200 flex flex-col w-full relative mx-auto max-w-[1400px] mb-8 overflow-x-auto"
      ref={chartContainerRef}
    >
      <div className="overflow-auto custom-scrollbar">
        <table className="w-full border-collapse min-w-[1100px]">
          <thead className="sticky top-0 z-50 bg-white shadow-sm">
            <tr>
              <th className="sticky left-0 z-50 bg-gray-50 w-24 min-w-[96px] text-left py-3 pl-4 text-xs font-bold text-gray-500 uppercase border-b border-r border-gray-200">
                Team
              </th>
              <th className="sticky left-24 z-50 bg-gray-50 w-28 min-w-[112px] text-left py-3 pl-4 text-xs font-bold text-gray-500 uppercase border-b border-r border-gray-200 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                Member
              </th>

              {timeline.map((w) => (
                <th
                  key={w.id}
                  ref={w.isTodayWeek ? todayColumnRef : null}
                  style={{ minWidth: viewMode === 'week' ? 140 : 80 }}
                  className={`py-2 text-center border-b border-r border-gray-300/70 ${w.isTodayWeek ? 'bg-indigo-50/50' : 'bg-white'}`}
                >
                  <div className={`text-xs font-bold ${w.isTodayWeek ? 'text-indigo-600' : 'text-gray-700'}`}>
                    {w.label}{' '}
                    {w.isTodayWeek && <span className="inline-block w-1.5 h-1.5 bg-indigo-500 rounded-full ml-1 align-middle mb-0.5"></span>}
                  </div>
                  <div className="text-[9px] text-gray-400 font-medium">{w.subLabel}</div>
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
                  const rowHeight = Math.max(44, totalRows * 32 + 12);

                  return (
                    <tr
                      key={rowKey}
                      ref={(el) => {
                        rowRefs.current[rowKey] = el;
                      }}
                      className="group hover:bg-gray-50/50 transition-colors"
                    >
                      <td
                        className={`sticky left-0 z-40 bg-white align-top py-3 pl-4 text-xs font-bold text-gray-700 border-r border-gray-200 ${
                          isLast ? 'border-b border-gray-200' : 'border-b-transparent'
                        }`}
                      >
                        {isFirst ? team.name : ''}
                      </td>

                      <td className="sticky left-24 z-40 bg-white align-top py-3 pl-4 text-sm font-medium text-black border-r border-gray-200 border-b border-gray-200 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                        <div>{member}</div>
                      </td>

                      <td colSpan={timeline.length} className="relative p-0 align-top border-b border-gray-200" style={{ height: rowHeight }}>
                        <div className="absolute inset-0 w-full h-full flex pointer-events-none">
                          {timeline.map((w) => (
                            <div key={w.id} className={`flex-1 border-r border-gray-300/70 last:border-0 ${w.isTodayWeek ? 'bg-indigo-50/10' : ''}`}></div>
                          ))}
                        </div>

                        {packed.map((proj) => {
                          const projPlacement = getProjectStyle(proj, timeline, chartTotalDays);
                          if (!projPlacement) return null;
                          const { style, displayStart, displayEnd } = projPlacement;
                          const isDimmed = hoveredProjectName && hoveredProjectName !== proj.name;
                          const isHighlighted = hoveredProjectName === proj.name;
                          const colorSet = getColorSet(proj);
                          const projStart = parseDate(proj.start);
                          const projEnd = parseDate(proj.end);
                          const effectiveStart = displayStart || projStart;
                          const effectiveEnd = displayEnd || projEnd;
                          const duration = Math.max(1, getDaysDiff(effectiveStart, effectiveEnd) + 1);
                          const barTitle = proj.notes ? `${proj.name} - 메모: ${proj.notes}` : proj.name;

                          const milestonesInRange = (proj.milestones || [])
                            .filter((m) => {
                              const d = parseDate(m.date);
                              return d >= effectiveStart && d <= effectiveEnd;
                            })
                            .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

                          const segments: { start: Date; end: Date }[] = [];
                          if (milestonesInRange.length === 0) {
                            segments.push({ start: effectiveStart, end: effectiveEnd });
                          } else {
                            let curStart = effectiveStart;
                            milestonesInRange.forEach((m) => {
                              const mDate = parseDate(m.date);
                              const leftEnd = new Date(mDate);
                              leftEnd.setDate(leftEnd.getDate() - 1);
                              if (leftEnd >= curStart) segments.push({ start: curStart, end: leftEnd });
                              curStart = mDate;
                            });
                            if (curStart <= effectiveEnd) segments.push({ start: curStart, end: effectiveEnd });
                          }

                          return (
                            <div key={proj.id}>
                              {segments.map((seg, idx) => {
                                const segOffset = getDaysDiff(effectiveStart, seg.start);
                                const segDuration = Math.max(1, getDaysDiff(seg.start, seg.end) + 1);
                                const left = (segOffset / duration) * 100;
                                const width = (segDuration / duration) * 100;
                                return (
                                  <div
                                    key={`${proj.id}-seg-${idx}`}
                                    onClick={() => handleProjectClick(proj)}
                                    onMouseEnter={() => setHoveredProjectName(proj.name)}
                                    onMouseLeave={() => setHoveredProjectName(null)}
                                    className={`
                                            absolute h-7 rounded shadow-sm cursor-pointer flex items-center px-2 z-20 transition-all duration-200 border group/bar
                                            ${colorSet.customBg ? '' : `${colorSet.bg} ${colorSet.border}`}
                                            ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100 hover:shadow-md'}
                                            ${isHighlighted ? 'ring-2 ring-indigo-400 ring-offset-1 scale-[1.01] z-30' : ''}
                                        `}
                                    style={{ left: `${left}%`, width: `${width}%`, top: style.top, backgroundColor: colorSet.customBg, borderColor: colorSet.customBorder }}
                                    title={barTitle}
                                  >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorSet.barClass || ''}`} style={{ backgroundColor: colorSet.barColor }}></div>
                                    <span className={`text-[11px] font-bold truncate ml-1 ${colorSet.textClass || ''}`} style={{ color: colorSet.customText }}>
                                      {proj.name}
                                    </span>
                                    {proj.notes && (
                                      <span
                                        className="ml-2 text-[10px] text-gray-700 bg-white/70 px-1 rounded border border-gray-200 truncate max-w-[160px]"
                                        title={proj.notes}
                                      >
                                        {proj.notes}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}

                              {(proj.milestones || []).map((m) => {
                                const mDate = parseDate(m.date);
                                if (mDate < effectiveStart || mDate > effectiveEnd) return null;
                                const offset = getDaysDiff(effectiveStart, mDate);
                                const leftPos = (offset / duration) * 100;
                                const markerWidth = viewMode === 'day' ? 10 : 6;
                                return (
                                  <div
                                    key={m.id}
                                    className="absolute z-40 hover:scale-110 transition-transform cursor-help rounded-sm shadow-sm"
                                    style={{ left: `${leftPos}%`, width: `${markerWidth}px`, minWidth: `${markerWidth}px`, backgroundColor: m.color || '#ef4444', top: style.top }}
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
