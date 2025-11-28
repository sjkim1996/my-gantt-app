import React from 'react';
import { parseDate, formatDate, getDaysDiff } from '../utils/date';
import { getColorSet } from '../utils/colors';
import { getPackedProjects } from '../utils/gantt';
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
    <div
      className="flex-1 rounded-xl shadow-sm bg-white border border-gray-200 flex flex-col w-full relative mx-auto max-w-[1400px] mb-8 overflow-x-auto"
      ref={chartContainerRef}
    >
      <div className="overflow-auto custom-scrollbar rounded-xl">
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
                  className={`py-2 text-center border-b border-r border-gray-300/70 first:rounded-l-lg last:rounded-r-lg ${
                    w.isTodayWeek ? 'bg-indigo-50/50' : blockHasEvent[w.id] ? 'bg-amber-50' : 'bg-white'
                  }`}
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
                            <div
                              key={w.id}
                              className={`flex-1 border-r border-gray-300/70 last:border-0 ${
                                w.isTodayWeek ? 'bg-indigo-50/10' : blockHasEvent[w.id] ? 'bg-amber-50/30' : ''
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
                              className="absolute h-3 rounded bg-slate-200/70 border border-slate-300/80 z-10"
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
                          const duration = Math.max(1, getDaysDiff(chartStart, chartEnd) + 1);

                          const isDimmed = hoveredProjectName && hoveredProjectName !== proj.name;
                          const isHighlighted = hoveredProjectName === proj.name;
                          const colorSet = getColorSet(proj);
                          const barTitle = proj.notes ? `${proj.name} - 메모: ${proj.notes}` : proj.name;

                          const milestonesInRange = (proj.milestones || []).filter(m => {
                            const d = parseDate(m.date);
                            return d >= effectiveStart && d <= effectiveEnd;
                          }).sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

                          const blockSegments: { start: Date; end: Date }[] = [];
                          timeline.forEach(block => {
                            const bStart = parseDate(formatDate(block.start));
                            const bEnd = parseDate(formatDate(block.end));
                            const segStart = bStart > effectiveStart ? bStart : effectiveStart;
                            const segEnd = bEnd < effectiveEnd ? bEnd : effectiveEnd;
                            if (segStart > segEnd) return;

                            let curStart = segStart;
                            const ms = milestonesInRange.filter(m => {
                              const d = parseDate(m.date);
                              return d >= segStart && d <= segEnd;
                            });
                            if (ms.length === 0) {
                              blockSegments.push({ start: segStart, end: segEnd });
                            } else {
                              ms.forEach((m) => {
                                const mDate = parseDate(m.date);
                                const leftEnd = new Date(mDate);
                                leftEnd.setDate(leftEnd.getDate() - 1);
                                if (leftEnd >= curStart) blockSegments.push({ start: curStart, end: leftEnd });
                                curStart = mDate;
                              });
                              if (curStart <= segEnd) blockSegments.push({ start: curStart, end: segEnd });
                            }
                          });

                          return (
                            <div key={proj.id}>
                              {blockSegments.map((seg, idx) => {
                                const segOffset = getDaysDiff(chartStart, seg.start);
                                const segDuration = Math.max(1, getDaysDiff(seg.start, seg.end) + 1);
                                const left = (segOffset / duration) * 100;
                                const width = (segDuration / duration) * 100;
                                const top = `${proj.row * 30 + 4}px`;
                                return (
                                  <div
                                    key={`${proj.id}-seg-${idx}`}
                                    onClick={() => handleProjectClick(proj)}
                                    onMouseEnter={() => setHoveredProjectName(proj.name)}
                                    onMouseLeave={() => setHoveredProjectName(null)}
                                    className={`
                                            absolute h-7 rounded shadow-sm cursor-pointer flex items-center px-2 z-20 transition-all duration-200 border group
                                            ${colorSet.customBg ? '' : `${colorSet.bg} ${colorSet.border}`}
                                            ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100 hover:shadow-md group-hover:h-9'}
                                            ${isHighlighted ? 'ring-2 ring-indigo-400 ring-offset-1 scale-[1.01] z-30' : ''}
                                        `}
                                    style={{ left: `${left}%`, width: `${width}%`, top, backgroundColor: colorSet.customBg, borderColor: colorSet.customBorder }}
                                    title={barTitle}
                                  >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorSet.barClass || ''}`} style={{ backgroundColor: colorSet.barColor }}></div>
                                    <span className={`text-[11px] font-bold truncate ml-1 ${colorSet.textClass || ''}`} style={{ color: colorSet.customText }}>
                                      {proj.name}
                                    </span>
                                    {proj.notes && (
                                      <div className="absolute left-0 right-0 top-full mt-1 px-2 py-1 bg-white/95 text-[10px] text-gray-600 rounded border border-gray-200 shadow opacity-0 group-hover:opacity-100 transition-all">
                                        {proj.notes}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {(proj.milestones || []).map((m) => {
                                const mDate = parseDate(m.date);
                                if (mDate < effectiveStart || mDate > effectiveEnd) return null;
                                const offset = getDaysDiff(chartStart, mDate);
                                const leftPos = (offset / duration) * 100;
                                const markerWidth = viewMode === 'day' ? 10 : 6;
                                return (
                                  <div
                                    key={m.id}
                                    className="absolute z-40 hover:scale-110 transition-transform cursor-help rounded-sm shadow-sm"
                                    style={{ left: `${leftPos}%`, width: `${markerWidth}px`, minWidth: `${markerWidth}px`, backgroundColor: m.color || '#ef4444', top: `${proj.row * 30 + 4}px` }}
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
