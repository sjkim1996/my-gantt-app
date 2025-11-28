import { Milestone, Project, Vacation } from '../types';
import { parseDate, formatDate, getDaysDiff } from './date';
import { getColorSet } from './colors';

export const mergeMilestones = (a: Milestone[] = [], b: Milestone[] = []) => {
  const map = new Map<string, Milestone>();
  [...a, ...b].forEach(m => {
    const key = `${m.date}-${m.label}`;
    if (!map.has(key)) {
      map.set(key, { ...m, color: m.color || '#ef4444' });
    }
  });
  return Array.from(map.values());
};

export const mergeVacations = (a: Vacation[] = [], b: Vacation[] = []) => {
  const map = new Map<string, Vacation>();
  [...a, ...b].forEach(v => {
    const key = `${v.person || ''}-${v.start}-${v.end}-${v.label || ''}`;
    if (!map.has(key)) {
      map.set(key, { ...v, person: v.person || '', color: v.color || '#94a3b8' });
    }
  });
  return Array.from(map.values());
};

export const dedupeProjects = (list: Project[]) => {
  const map = new Map<string, Project>();
  list.forEach((p) => {
    const key = `${p.name}__${p.person}__${p.team}`;
    if (!map.has(key)) {
      map.set(key, p);
    } else {
      const exist = map.get(key)!;
      map.set(key, {
        ...exist,
        docUrl: exist.docUrl || p.docUrl,
        docName: exist.docName || p.docName,
        isTentative: exist.isTentative || p.isTentative,
        customColor: exist.customColor || p.customColor,
        notes: exist.notes || p.notes,
        milestones: mergeMilestones(exist.milestones, p.milestones),
        vacations: mergeVacations(exist.vacations, p.vacations),
      });
    }
  });
  return Array.from(map.values());
};

export const getPackedProjects = (memberProjects: Project[]) => {
  const sorted = [...memberProjects].sort((a, b) => parseDate(a.start).getTime() - parseDate(b.start).getTime());
  const packed: (Project & { row: number })[] = [];
  const lanes: Date[] = []; 
  sorted.forEach(proj => {
    const start = parseDate(proj.start);
    let assignedLane = -1;
    for (let i = 0; i < lanes.length; i++) { if (lanes[i] < start) { assignedLane = i; break; } }
    if (assignedLane === -1) { assignedLane = lanes.length; lanes.push(parseDate(proj.end)); } else { lanes[assignedLane] = parseDate(proj.end); }
    packed.push({ ...proj, row: assignedLane });
  });
  return { packed, totalRows: lanes.length };
};

export const getProjectStyle = (proj: Project & { row: number }, timeline: { start: Date; end: Date }[], chartTotalDays: number) => {
  if (timeline.length === 0 || chartTotalDays <= 0) return null;
  const chartStart = parseDate(formatDate(timeline[0].start));
  const chartEnd = parseDate(formatDate(timeline[timeline.length - 1].end));
  const pStart = parseDate(proj.start);
  const pEnd = parseDate(proj.end);

  if (pEnd < chartStart || pStart > chartEnd) return null;

  const displayStart = pStart < chartStart ? chartStart : pStart;
  const displayEnd = pEnd > chartEnd ? chartEnd : pEnd;

  const offsetDays = getDaysDiff(chartStart, displayStart);
  const durationDays = getDaysDiff(displayStart, displayEnd) + 1;

  const left = (offsetDays / chartTotalDays) * 100;
  const width = (durationDays / chartTotalDays) * 100;
  return { style: { left: `${left}%`, width: `${width}%`, top: `${proj.row * 30 + 4}px` }, displayStart, displayEnd };
};

export { getColorSet };
