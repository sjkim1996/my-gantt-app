'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; 
import { Plus, Trash2, RefreshCw, Search, AlertCircle, Settings, X, Check, Briefcase, LogOut } from 'lucide-react';
import { Project, Team, Assignee, GroupedProject, EditingMember, ApiProjectsResponse, Milestone } from './types';
import { parseDate, formatDate, getDaysDiff, getStartOfWeek, generateWeeks, generateDays } from './utils/date';
import { BAR_COLORS, getRandomHexColor } from './utils/colors';
import { mergeMilestones, mergeVacations, dedupeProjects } from './utils/gantt';
import GanttTable, { TimelineBlock } from './components/GanttTable';
import ChartControls from './components/ChartControls';
import Dashboard from './components/Dashboard';
import ProjectForm from './components/ProjectForm';
import { Vacation } from './types';

// Auth Logic (Inlined for single-file stability)
const hasValidLoginToken = () => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('isLoggedIn') === 'true';
};

const clearLoginToken = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('isLoggedIn');
};

const DEFAULT_TEAMS: Team[] = [
  { id: 't1', name: '기획팀', members: ['김철수', '이영희', '최기획'] },
  { id: 't2', name: '개발팀', members: ['박지성', '손흥민', '김철수', '차범근'] },
  { id: 't3', name: '디자인팀', members: ['홍길동', '신사임당'] },
];

const MOCK_PROJECTS_2025: Project[] = [
  { id: 1, name: '2025 웹사이트 리뉴얼', person: '김철수', team: '기획팀', start: '2025-01-05', end: '2025-02-20', colorIdx: 0, docUrl: 'https://example.com/spec', isTentative: false },
  { id: 2, name: '2025 웹사이트 리뉴얼', person: '박지성', team: '개발팀', start: '2025-01-05', end: '2025-02-20', colorIdx: 0, docUrl: 'https://example.com/spec', isTentative: false },
  { id: 3, name: '2025 웹사이트 리뉴얼', person: '홍길동', team: '디자인팀', start: '2025-01-10', end: '2025-02-10', colorIdx: 0, docUrl: 'https://example.com/spec', isTentative: false },
  { id: 4, name: '모바일 앱 기획', person: '이영희', team: '기획팀', start: '2025-02-01', end: '2025-03-15', colorIdx: 1, isTentative: true },
  { id: 5, name: '모바일 앱 기획', person: '최기획', team: '기획팀', start: '2025-02-01', end: '2025-03-15', colorIdx: 1, isTentative: true },
  { id: 6, name: '관리자 페이지 고도화', person: '박지성', team: '개발팀', start: '2025-03-01', end: '2025-04-15', colorIdx: 5 }, 
  { id: 7, name: '관리자 페이지 고도화', person: '손흥민', team: '개발팀', start: '2025-03-01', end: '2025-04-15', colorIdx: 5 }, 
];

// --- 4. 메인 컴포넌트 ---
export default function ResourceGanttChart() {
  const router = useRouter();
  const [chartStartDate, setChartStartDate] = useState('2025-01-01');
  
  // 실제 오늘 날짜
  const todayDate = useMemo(() => new Date(), []); 
  
  const rowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLTableHeaderCellElement | null>(null); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  const [masterProjectName, setMasterProjectName] = useState('');
  const [masterColorIdx, setMasterColorIdx] = useState(0);
  const [masterStart, setMasterStart] = useState('');
  const [masterEnd, setMasterEnd] = useState('');
  const [masterDocUrl, setMasterDocUrl] = useState('');
  const [masterDocName, setMasterDocName] = useState('');
  const [masterTentative, setMasterTentative] = useState(false);
  const [masterCustomColor, setMasterCustomColor] = useState('');
  const [masterNotes, setMasterNotes] = useState('');
  const [masterMilestones, setMasterMilestones] = useState<Milestone[]>([]);
  const [masterMilestoneLabel, setMasterMilestoneLabel] = useState('');
  const [masterMilestoneDate, setMasterMilestoneDate] = useState('');
  const [editingMembers, setEditingMembers] = useState<EditingMember[]>([]);
  
  const [modalAssigneeInput, setModalAssigneeInput] = useState('');
  const [modalShowSuggestions, setModalShowSuggestions] = useState(false);
  const modalInputRef = useRef<HTMLInputElement>(null);

  const [deleteConfirmMode, setDeleteConfirmMode] = useState(false);
  const [hoveredProjectName, setHoveredProjectName] = useState<string | null>(null);
  const [ambiguousCandidates, setAmbiguousCandidates] = useState<Assignee[]>([]); 
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingScrollTarget, setPendingScrollTarget] = useState<{ date: Date; rowId: string; desiredStart: string } | null>(null);

  // Data State
  const [teams, setTeams] = useState<Team[]>(DEFAULT_TEAMS);
  const [projects, setProjects] = useState<Project[]>([]);

  // Input Form State
  const [projectName, setProjectName] = useState('');
  const [projectStart, setProjectStart] = useState(formatDate(todayDate));
  const [projectEnd, setProjectEnd] = useState(formatDate(new Date(todayDate.getTime() + 86400000 * 30)));
  const [projectDocUrl, setProjectDocUrl] = useState('');
  const [projectDocName, setProjectDocName] = useState('');
  const [projectTentative, setProjectTentative] = useState(false);
  const [projectCustomColor, setProjectCustomColor] = useState(getRandomHexColor());
  const [projectNotes, setProjectNotes] = useState('');
  const [projectMilestones, setProjectMilestones] = useState<Milestone[]>([{ id: 'init-m1', label: '', date: '', color: getRandomHexColor() }]);
  const [projectVacations, setProjectVacations] = useState<Vacation[]>([{ id: 'init-v1', label: '', start: '', end: '', color: '#94a3b8' }]);
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[]>([{ name: '김철수', team: '기획팀' }]);
  const [assigneeInput, setAssigneeInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [banner, setBanner] = useState<{ text: string; tone?: 'success' | 'error' | 'info' } | null>(null);
  const [editingTeams, setEditingTeams] = useState<Team[]>([]);
  // Tracking hook for future highlighting; only setter used to satisfy references
  const [, setRecentlyAddedProject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  useEffect(() => {
    if (banner) {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), 3000);
    }
    return () => { if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current); };
  }, [banner]);

  const showBanner = (text: string, tone: 'success' | 'error' | 'info' = 'success') => {
    setBanner({ text, tone });
  };

  useEffect(() => {
    if (viewMode === 'week') {
      setChartStartDate(prev => formatDate(getStartOfWeek(new Date(prev))));
    }
  }, [viewMode]);

  useEffect(() => {
    const lockScroll = isModalOpen || isTeamModalOpen;
    if (lockScroll) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isModalOpen, isTeamModalOpen]);

  // --- Auth & Data Fetch ---
  useEffect(() => {
    if (!hasValidLoginToken()) {
      clearLoginToken();
      setIsAuthorized(false);
      setAuthChecked(true);
      setIsLoading(false);
      router.replace('/login'); 
      return;
    }

    setIsAuthorized(true);
    setAuthChecked(true);

    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        const data = (await res.json()) as ApiProjectsResponse;

        if (!res.ok || !data.success) {
          setProjects(MOCK_PROJECTS_2025);
          return;
        }

        const loadedProjects = (data.data || []).map((p, idx) => {
          const normalizedId = typeof p._id === 'string'
            ? p._id
            : p._id
            ? String(p._id)
            : typeof p.id === 'string'
            ? p.id
            : `local-${idx}`;
          return { ...p, _id: normalizedId, id: normalizedId };
        });
        setProjects(dedupeProjects(loadedProjects));
      } catch (error) {
        console.error('API Fetch failed (Preview Mode), using mock data.', error);
        setProjects(dedupeProjects(MOCK_PROJECTS_2025));
      } finally {
        setIsLoading(false);
      }
    };

    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams');
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data)) {
          const loaded = data.data.map((t: Team, idx: number) => ({ ...t, id: t._id || `t${idx}` }));
          setTeams(loaded);
          return;
        }
      } catch (error) {
        console.error('[API] /api/teams failed, using defaults.', error);
      }
      setTeams(DEFAULT_TEAMS);
    };

    fetchProjects();
    fetchTeams();
  }, [router]);

  const timeline = useMemo<TimelineBlock[]>(() => {
    const blocks = viewMode === 'week'
      ? generateWeeks(chartStartDate, 60, todayDate)
      : generateDays(chartStartDate, 120, todayDate);
    return blocks.map(b => ({
      ...b,
      isToday: b.isTodayWeek || (formatDate(b.start) === formatDate(todayDate))
    }));
  }, [chartStartDate, todayDate, viewMode]);

  const chartTotalDays = useMemo(() => {
    if (timeline.length === 0) return 0;
    const start = parseDate(formatDate(timeline[0].start));
    const end = parseDate(formatDate(timeline[timeline.length - 1].end));
    return getDaysDiff(start, end) + 1;
  }, [timeline]);

  const activeProjectsToday = useMemo(() => {
    const todayTime = parseDate(formatDate(todayDate)).getTime();
    const map = new Map<string, GroupedProject>();
    projects.forEach(p => {
      const s = parseDate(p.start).getTime();
      const e = parseDate(p.end).getTime();
      if (todayTime >= s && todayTime <= e) {
        if (!map.has(p.name)) {
          map.set(p.name, { ...p, members: [], start: p.start, end: p.end, milestones: p.milestones ? mergeMilestones(p.milestones, []) : [], vacations: p.vacations ? mergeVacations(p.vacations, []) : [] });
        }
        const group = map.get(p.name)!;
        if (!group.members.find(m => m.person === p.person && m.team === p.team)) group.members.push({ person: p.person, team: p.team });
        if (parseDate(p.start) < parseDate(group.start)) group.start = p.start;
        if (parseDate(p.end) > parseDate(group.end)) group.end = p.end;
        group.milestones = mergeMilestones(group.milestones, p.milestones);
        group.vacations = mergeVacations(group.vacations, p.vacations);
      }
    });
    return Array.from(map.values());
  }, [projects, todayDate]);

  const allMembers = useMemo(() => {
    const list: Assignee[] = [];
    teams.forEach(t => Array.from(new Set(t.members)).forEach(m => list.push({ name: m, team: t.name })));
    return list;
  }, [teams]);

  // Initial Scroll to Today
  useEffect(() => {
    if (!isLoading && todayColumnRef.current && chartContainerRef.current) {
      const timer = setTimeout(() => {
        todayColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, viewMode, timeline]);

  type ApiResponse<T> = { success: boolean; data?: T; error?: string };
  type ProjectPayload = Omit<Project, 'id'> & { id?: string | number; _id?: string };

  const apiCreateProject = async (newProjects: ProjectPayload[]): Promise<ApiResponse<ProjectPayload[]>> => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProjects),
      });
      return res.json();
    } catch {
      return { success: true, data: newProjects.map((p, i) => ({ ...p, id: `${Date.now()}-${i}` })) };
    }
  };

  const apiUpdateProject = async (project: ProjectPayload): Promise<ApiResponse<ProjectPayload>> => {
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      return res.json();
    } catch {
      return { success: true, data: project };
    }
  };

  const apiDeleteProject = async (id: string) => {
    const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `DELETE failed: ${res.status}`);
    }
  };

  const handlePrevMonth = () => {
    const d = new Date(chartStartDate);
    if (viewMode === 'week') {
      d.setMonth(d.getMonth() - 1);
      setChartStartDate(formatDate(getStartOfWeek(d)));
    } else {
      d.setDate(d.getDate() - 14);
      setChartStartDate(formatDate(d));
    }
  };
  const handleNextMonth = () => {
    const d = new Date(chartStartDate);
    if (viewMode === 'week') {
      d.setMonth(d.getMonth() + 1);
      setChartStartDate(formatDate(getStartOfWeek(d)));
    } else {
      d.setDate(d.getDate() + 14);
      setChartStartDate(formatDate(d));
    }
  };
  const handleJumpToToday = () => {
    const base = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const startPoint = viewMode === 'week' ? getStartOfWeek(base) : todayDate;
    setChartStartDate(formatDate(startPoint));
    setTimeout(() => {
        todayColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 300);
  };

  const getSuggestions = useCallback((input: string) => {
    if (!input.trim()) return [];
    const lowerInput = input.toLowerCase();
    return allMembers.filter(m => m.name.toLowerCase().includes(lowerInput) || m.team.toLowerCase().includes(lowerInput));
  }, [allMembers]);
  const mainSuggestions = useMemo(() => getSuggestions(assigneeInput), [assigneeInput, getSuggestions]);
  const modalSuggestions = useMemo(() => getSuggestions(modalAssigneeInput), [modalAssigneeInput, getSuggestions]);

  useEffect(() => {
    if (!pendingScrollTarget || !chartContainerRef.current) return;
    if (chartStartDate !== pendingScrollTarget.desiredStart) return;

    const timeout = setTimeout(() => {
      const { date, rowId } = pendingScrollTarget;
      const chartStart = timeline.length > 0 ? parseDate(formatDate(timeline[0].start)) : parseDate(chartStartDate);
      const diffDays = getDaysDiff(chartStart, date);
      const container = chartContainerRef.current!;
      const scrollWidth = container.scrollWidth;
      const offsetRatio = Math.max(0, Math.min(1, diffDays / chartTotalDays));
      const scrollPos = Math.max(0, (scrollWidth * offsetRatio) - 250);
      container.scrollTo({ left: scrollPos, behavior: 'smooth' });

      const row = rowRefs.current[rowId];
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('bg-yellow-100');
        setTimeout(() => row.classList.remove('bg-yellow-100'), 1500);
      } else {
        showBanner('행을 찾을 수 없습니다. 팀/멤버를 확인하세요.', 'info');
      }
      setPendingScrollTarget(null);
    }, 100);

    return () => clearTimeout(timeout);
  }, [pendingScrollTarget, chartStartDate, chartTotalDays, timeline]);

  const groupedProjects = useMemo(() => {
    const map = new Map<string, GroupedProject>();
    projects.forEach(p => {
      if (!map.has(p.name)) {
        map.set(p.name, { ...p, members: [], start: p.start, end: p.end, milestones: p.milestones ? mergeMilestones(p.milestones, []) : [], vacations: p.vacations ? mergeVacations(p.vacations, []) : [] });
      }
      const group = map.get(p.name)!;
      if (!group.docUrl && p.docUrl) group.docUrl = p.docUrl;
      if (p.isTentative) group.isTentative = true;
      if (!group.customColor && p.customColor) group.customColor = p.customColor;
      group.milestones = mergeMilestones(group.milestones, p.milestones);
      group.vacations = mergeVacations(group.vacations, p.vacations);
      if (!group.notes && p.notes) group.notes = p.notes;
      if (!group.members.find(m => m.person === p.person && m.team === p.team)) group.members.push({ person: p.person, team: p.team });
      if (parseDate(p.start) < parseDate(group.start)) group.start = p.start;
      if (parseDate(p.end) > parseDate(group.end)) group.end = p.end;
    });
    return Array.from(map.values());
  }, [projects]);

  const isEventComposing = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as unknown as { isComposing?: boolean };
    return Boolean(native?.isComposing);
  };

  const addAssignee = (assignee: Assignee) => {
    const exists = selectedAssignees.find(a => a.name === assignee.name && a.team === assignee.team);
    if (!exists) setSelectedAssignees([...selectedAssignees, assignee]);
    setAssigneeInput(''); setShowSuggestions(false); inputRef.current?.focus();
  };
  const removeAssignee = (idx: number) => {
    const newArr = [...selectedAssignees]; newArr.splice(idx, 1); setSelectedAssignees(newArr);
  };
  
  const addProjectMilestone = () => {
    setProjectMilestones(prev => [...prev, { id: `${Date.now()}`, label: '', date: '', color: getRandomHexColor() }]);
  };
  const updateProjectMilestone = (id: string, field: 'label' | 'date', value: string) => {
    setProjectMilestones(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };
  const removeProjectMilestone = (id: string) => {
    setProjectMilestones(prev => prev.filter(x => x.id !== id));
  };
  const addProjectVacation = () => {
    setProjectVacations(prev => [...prev, { id: `${Date.now()}`, label: '', start: '', end: '', color: '#94a3b8' }]);
  };
  const updateProjectVacation = (id: string, field: 'label' | 'start' | 'end', value: string) => {
    setProjectVacations(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };
  const removeProjectVacation = (id: string) => {
    setProjectVacations(prev => prev.filter(v => v.id !== id));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isEventComposing(e)) return;
    if (e.key === 'Backspace' && assigneeInput === '' && selectedAssignees.length > 0) { removeAssignee(selectedAssignees.length - 1); return; }
    if (e.key === 'Enter' && assigneeInput.trim()) {
      e.preventDefault();
      if (mainSuggestions.length === 1) { addAssignee(mainSuggestions[0]); return; }
      const exact = allMembers.filter(m => m.name === assigneeInput.trim());
      if (exact.length > 1) { setAmbiguousCandidates(exact); return; }
      if (exact.length === 1) { addAssignee(exact[0]); return; }
      let newName = assigneeInput.trim(); let newTeam = '미배정';
      if (newName.includes('-')) { const parts = newName.split('-'); newTeam = parts[0].trim(); newName = parts[1].trim(); }
      addAssignee({ name: newName, team: newTeam, isNew: true });
    }
  };

  const handleAddProject = async () => {
    if (!projectName || selectedAssignees.length === 0) return;

    const existingGroup = groupedProjects.find((g) => g.name === projectName);
    const existingPairs = new Set(projects.filter(p => p.name === projectName).map(p => `${p.person}__${p.team}`));

    let targetName = projectName;
    let assigneesToAdd = [...selectedAssignees];
    const colorIdx = existingGroup ? existingGroup.colorIdx : Math.floor(Math.random() * BAR_COLORS.length);
    const finalDocUrl = projectDocUrl || existingGroup?.docUrl || '';
    const finalDocName = projectDocName || existingGroup?.docName || '';
    const finalTentative = projectTentative || Boolean(existingGroup?.isTentative);
    const finalCustomColor = projectCustomColor || existingGroup?.customColor || '';

    if (existingGroup) {
      const isSame = window.confirm(`이미 \"${projectName}\" 프로젝트가 있습니다.\n같은 프로젝트로 인원만 추가할까요?`);
      if (isSame) {
        assigneesToAdd = assigneesToAdd.filter(a => !existingPairs.has(`${a.name}__${a.team}`));
        if (assigneesToAdd.length === 0) {
          showBanner('이미 등록된 인원입니다.', 'info');
          return;
        }
      } else {
        let suffix = 1;
        let newName = `${projectName} (${suffix})`;
        while (projects.some(p => p.name === newName)) {
          suffix += 1;
          newName = `${projectName} (${suffix})`;
        }
        targetName = newName;
      }
    }

    const cleanedMilestones = projectMilestones.filter(m => m.label && m.date).map(m => ({ ...m, color: m.color || getRandomHexColor() }));
    const cleanedVacations = projectVacations.filter(v => v.label && v.start && v.end).map(v => ({ ...v, color: v.color || '#94a3b8' }));

    const newEntries: ProjectPayload[] = assigneesToAdd.map((assignee) => ({
      name: targetName,
      person: assignee.name,
      team: assignee.team,
      start: projectStart,
      end: projectEnd,
      colorIdx,
      docUrl: finalDocUrl || undefined,
      docName: finalDocName || undefined,
      isTentative: finalTentative,
      customColor: finalCustomColor || undefined,
      notes: projectNotes || undefined,
      milestones: cleanedMilestones,
      vacations: cleanedVacations,
    }));
    
    const res = await apiCreateProject(newEntries);
    if (res.success && res.data) {
        const normalized = res.data.map((p, idx) => {
          const normalizedId = typeof p._id === 'string'
            ? p._id
            : p._id
            ? String(p._id)
            : typeof p.id === 'string'
            ? p.id
            : `${Date.now()}-${idx}`;
          return { ...p, _id: normalizedId, id: normalizedId };
        });
        setProjects(prev => dedupeProjects([...prev, ...normalized]));
        setProjectName(''); setSelectedAssignees([]); setProjectDocUrl(''); setProjectDocName(''); setProjectTentative(false); setProjectCustomColor(getRandomHexColor()); setProjectNotes(''); setProjectMilestones([{ id: `${Date.now()}`, label: '', date: '', color: getRandomHexColor() }]); setProjectVacations([{ id: `${Date.now()}`, label: '', start: '', end: '', color: '#94a3b8' }]);
        showBanner('프로젝트가 추가되었습니다.', 'success');
        setRecentlyAddedProject(targetName);
        setHoveredProjectName(targetName);
        setTimeout(() => setHoveredProjectName(null), 2000);
        setTimeout(() => setRecentlyAddedProject(null), 2500);
    } else {
      showBanner(res.error || '프로젝트 추가에 실패했습니다.', 'error');
    }
  };

  const handleProjectClick = (project: Project) => {
    const targetName = project.name;
    const relatedProjects = dedupeProjects(projects.filter(p => p.name === targetName));
    setMasterProjectName(targetName); 
    setMasterColorIdx(project.colorIdx); 
    setMasterCustomColor(project.customColor || '');
    setMasterStart(project.start); 
    setMasterEnd(project.end);
    setMasterDocUrl(project.docUrl || '');
    setMasterDocName(project.docName || '');
    setMasterTentative(Boolean(project.isTentative));
    setMasterNotes(project.notes || '');
          setMasterMilestones(project.milestones ? mergeMilestones(project.milestones, []) : []);
    setMasterMilestoneLabel('');
    setMasterMilestoneDate('');
    const members: EditingMember[] = relatedProjects.map(p => ({ 
        id: p.id,
        _id: typeof p._id === 'string' ? p._id : undefined,
        person: p.person,
        team: p.team,
        start: p.start,
        end: p.end,
        docUrl: p.docUrl,
        docName: p.docName,
        isTentative: p.isTentative,
        customColor: p.customColor,
        notes: p.notes,
        milestones: p.milestones,
        vacations: p.vacations,
    }));
    setEditingMembers(members); setIsModalOpen(true);
  };

  const addMemberInModal = (assignee: Assignee) => {
    if (editingMembers.some(m => m.person === assignee.name && m.team === assignee.team && !m.isDeleted)) { setModalAssigneeInput(''); return; }
    const newMember: EditingMember = { id: Date.now(), person: assignee.name, team: assignee.team, start: masterStart, end: masterEnd, isNew: true, docUrl: masterDocUrl, docName: masterDocName, isTentative: masterTentative, customColor: masterCustomColor, notes: masterNotes, milestones: [...masterMilestones], vacations: [] };
    setEditingMembers([...editingMembers, newMember]); setModalAssigneeInput(''); setModalShowSuggestions(false); modalInputRef.current?.focus();
  };
  const removeMemberInModal = (index: number) => { const updated = [...editingMembers]; updated[index].isDeleted = true; setEditingMembers(updated); };
  const updateMemberDate = (index: number, field: 'start' | 'end', value: string) => { const updated = [...editingMembers]; updated[index][field] = value; setEditingMembers(updated); };
  const syncDatesToAll = () => { const updated = editingMembers.map(m => ({ ...m, start: masterStart, end: masterEnd })); setEditingMembers(updated); };
  
  const handleSaveMasterProject = async () => {
    const deletedMembers = editingMembers.filter(m => m.isDeleted && !m.isNew);
    let deleteFailed = false;
    for (const m of deletedMembers) { 
      const deleteId = typeof m._id === 'string' ? m._id : (typeof m.id === 'string' ? m.id : undefined);
      if (deleteId) {
        try {
          await apiDeleteProject(deleteId); 
        } catch (err) {
          deleteFailed = true;
          console.error('[DELETE] member failed', err);
        }
      }
    }

    const newMembers = editingMembers.filter(m => (m.isNew || !m._id) && !m.isDeleted);
    if (newMembers.length > 0) {
        await apiCreateProject(newMembers.map(m => ({
            name: masterProjectName, person: m.person, team: m.team, start: m.start, end: m.end, colorIdx: masterColorIdx, docUrl: masterDocUrl, docName: masterDocName, isTentative: masterTentative, customColor: masterCustomColor || undefined, notes: masterNotes, milestones: masterMilestones, vacations: m.vacations
        })));
    }

    const updatedMembers = editingMembers.filter(m => !m.isNew && !m.isDeleted && m._id);
    for (const m of updatedMembers) {
        await apiUpdateProject({
            _id: m._id, name: masterProjectName, person: m.person, team: m.team, start: m.start, end: m.end, colorIdx: masterColorIdx, docUrl: masterDocUrl, docName: masterDocName, isTentative: masterTentative, customColor: masterCustomColor || undefined, notes: masterNotes, milestones: masterMilestones, vacations: m.vacations
        });
    }

    try {
        const res = await fetch('/api/projects');
        if (res.ok) {
            const data = await res.json() as ApiResponse<ProjectPayload[]>;
            if (data.success && data.data) { 
              const normalized = data.data.map((p, idx) => {
                const normalizedId = typeof p._id === 'string'
                  ? p._id
                  : p._id
                  ? String(p._id)
                  : typeof p.id === 'string'
                  ? p.id
                  : `reload-${idx}`;
                return { ...p, _id: normalizedId, id: normalizedId };
              });
              setProjects(dedupeProjects(normalized)); 
            }
        }
    } catch {
      showBanner('프로젝트를 다시 불러오는데 실패했습니다.', 'error');
    }
    showBanner('프로젝트가 저장되었습니다.', 'success');
    if (deleteFailed) showBanner('일부 항목 삭제에 실패했습니다. 새로고침 후 다시 시도하세요.', 'error');
    setRecentlyAddedProject(masterProjectName);
    setIsModalOpen(false);
  };

  const handleDeleteAll = async () => { 
      const idsToDelete = editingMembers
        .filter(m => !m.isNew)
        .map(m => {
          if (typeof m._id === 'string') return m._id;
          if (typeof m.id === 'string') return m.id;
          return String(m.id);
        })
        .filter(Boolean);

      let deleteFailed = false;
      for (const id of idsToDelete) { 
        try { await apiDeleteProject(id); } catch (err) { 
          deleteFailed = true;
          console.error('[DELETE] failed', err); 
        }
      }

      setProjects(prev => prev.filter(p => {
        const key = typeof p._id === 'string' ? p._id : (typeof p.id === 'string' ? p.id : String(p.id));
        return !idsToDelete.includes(key);
      }));

      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json() as ApiResponse<ProjectPayload[]>;
          if (data.success && data.data) {
            const normalized = data.data.map((p, idx) => {
              const normalizedId = typeof p._id === 'string'
                ? p._id
                : p._id
                ? String(p._id)
                : typeof p.id === 'string'
                ? p.id
                : `reload-${idx}`;
              return { ...p, _id: normalizedId, id: normalizedId };
            });
            setProjects(dedupeProjects(normalized));
          }
        }
      } catch (err) {
        console.error('[DELETE ALL] reload failed', err);
      }

      setIsModalOpen(false); 
      if (deleteFailed) {
        showBanner('일부 항목 삭제에 실패했습니다. 새로고침 후 다시 시도하세요.', 'error');
      } else {
        showBanner(idsToDelete.length > 0 ? '프로젝트가 삭제되었습니다.' : '삭제할 항목이 없습니다.', 'info');
      }
  };
  
  const handleShortcutClick = (group: GroupedProject) => {
    if (!chartTotalDays || timeline.length === 0) return;
    const firstMember = group.members[0]; 
    const rowId = `${firstMember.team}-${firstMember.person}`; 
    const projStart = parseDate(group.start);
    
    const chartStart = parseDate(formatDate(timeline[0].start));
    const diffDays = getDaysDiff(chartStart, projStart);
    
    let desiredStart = chartStartDate;
    if (diffDays < 0 || diffDays > chartTotalDays) {
        const newStart = new Date(projStart);
        newStart.setDate(newStart.getDate() - (viewMode === 'week' ? 7 : 3));
        desiredStart = formatDate(viewMode === 'week' ? getStartOfWeek(newStart) : newStart);
        setChartStartDate(desiredStart);
    }

    setPendingScrollTarget({ date: projStart, rowId, desiredStart });
    setHoveredProjectName(group.name); 
    setTimeout(() => setHoveredProjectName(null), 3000);
  };

  const openTeamModal = () => { setEditingTeams(JSON.parse(JSON.stringify(teams))); setIsTeamModalOpen(true); };

  const saveTeams = async () => {
    try {
      const payload = editingTeams.map(({ name, members }) => ({ name, members }));
      const res = await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || `Status ${res.status}`);
      }
      const stored = (data.data as Team[]).map((t, idx) => ({ ...t, id: t._id || `t${idx}` }));
      setTeams(stored);
      setIsTeamModalOpen(false);
      showBanner('팀 정보가 저장되었습니다.', 'success');
    } catch (error) {
      console.error('[API] save teams failed:', error);
      setTeams(editingTeams);
      setIsTeamModalOpen(false);
      showBanner('팀 저장에 실패했습니다. 네트워크를 확인하세요.', 'error');
    }
  };

  const addTeam = () => { setEditingTeams([...editingTeams, { id: `t${Date.now()}`, name: '새 팀', members: [] }]); };
  const updateTeamName = (idx: number, name: string) => { const n = [...editingTeams]; n[idx].name = name; setEditingTeams(n); };
  const addMemberToTeam = (teamIdx: number) => { const name = prompt("이름:"); if (name) { const n = [...editingTeams]; n[teamIdx].members.push(name); setEditingTeams(n); } };
  const removeMember = (tIdx: number, mIdx: number) => { const n = [...editingTeams]; n[tIdx].members.splice(mIdx, 1); setEditingTeams(n); };
  const handleModalInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isEventComposing(e)) return;
    if (e.key === 'Enter' && modalAssigneeInput.trim()) { e.preventDefault(); if (modalSuggestions.length === 1) { addMemberInModal(modalSuggestions[0]); return; } const exact = allMembers.filter(m => m.name === modalAssigneeInput.trim()); if (exact.length === 1) { addMemberInModal(exact[0]); return; } let newName = modalAssigneeInput.trim(); let newTeam = '미배정'; if (newName.includes('-')) { const parts = newName.split('-'); newTeam = parts[0].trim(); newName = parts[1].trim(); } addMemberInModal({ name: newName, team: newTeam, isNew: true }); }
  };
  useEffect(() => { if (isModalOpen) setDeleteConfirmMode(false); }, [isModalOpen]);

  const handleLogout = () => { 
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('isLoggedIn'); 
        document.cookie = 'auth_token=; Max-Age=0; path=/;';
    }
    router.push('/login'); 
  };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-gray-500">Access 확인 중...</div>;
  if (!isAuthorized) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-gray-500">로그인이 필요합니다. 이동 중...</div>;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-gray-500">Loading Projects...</div>;

  return (
    <div
      className={`flex flex-col min-h-screen bg-gray-50 font-sans relative text-gray-900 px-3 md:px-6 lg:px-8 ${isModalOpen || isTeamModalOpen ? 'overflow-hidden' : ''}`}
      onClick={() => { setShowSuggestions(false); setModalShowSuggestions(false); }}
    >
      
      {/* --- Modals --- */}
      {ambiguousCandidates.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-orange-50">
              <h3 className="font-bold text-orange-800 flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4" /> 동명이인 선택</h3>
              <p className="text-xs text-orange-600 mt-1">&apos;{ambiguousCandidates[0].name}&apos;님이 여러 팀에 존재합니다.</p>
            </div>
            <div className="p-2 space-y-1">
              {ambiguousCandidates.map((c, i) => (
                <button key={i} onClick={() => { addAssignee(c); setAmbiguousCandidates([]); }} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition text-left group text-sm">
                  <div><div className="font-bold text-gray-900">{c.name}</div><div className="text-xs text-gray-500 mt-0.5">{c.team}</div></div>
                  <Check className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100 text-center"><button onClick={() => { setAmbiguousCandidates([]); setAssigneeInput(''); }} className="text-xs text-gray-400 hover:text-gray-600 underline">취소</button></div>
          </div>
        </div>
      )}

      {isTeamModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-white px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">팀 & 멤버 관리</h3>
              <button onClick={() => setIsTeamModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-gray-50">
              {editingTeams.map((team, tIdx) => (
                <div key={team.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded">Team</span>
                    <input className="font-bold text-gray-800 bg-transparent border-b border-gray-200 focus:border-indigo-500 outline-none flex-1 pb-1 transition-colors" value={team.name} onChange={(e) => updateTeamName(tIdx, e.target.value)} />
                    <button onClick={() => addMemberToTeam(tIdx)} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors font-medium">+ 추가</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {team.members.length === 0 ? <span className="text-xs text-gray-400 pl-1">구성원 없음</span> :
                      team.members.map((member, mIdx) => (
                        <div key={mIdx} className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-200 text-sm text-gray-700">
                          {member}
                          <button onClick={() => removeMember(tIdx, mIdx)} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-3 h-3"/></button>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
              <button onClick={addTeam} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:bg-white hover:border-gray-400 hover:text-gray-600 flex items-center justify-center gap-2 font-medium text-sm"><Plus className="w-4 h-4"/> 새 팀 추가</button>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-white flex-shrink-0">
              <button onClick={() => setIsTeamModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">취소</button>
              <button onClick={saveTeams} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold shadow-sm transition-all">저장하기</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-indigo-100">
            <div className="bg-indigo-600 px-6 py-4 text-white flex justify-between items-start flex-shrink-0">
              <div className="flex-1">
                <div className="text-[11px] font-semibold text-indigo-200 mb-1 uppercase tracking-[0.08em]">Project Edit</div>
                <input type="text" value={masterProjectName} onChange={(e) => setMasterProjectName(e.target.value)} className="bg-transparent border-b border-indigo-400 focus:border-white outline-none p-0 text-xl font-bold w-full placeholder-indigo-300 text-white"/>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 -mr-2 text-indigo-100 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {/* 1. Global Settings */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><Settings className="w-4 h-4 text-gray-500" /> 통합 설정 (Global)</h4>
                    <div className="flex flex-wrap items-end gap-6">
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-bold text-gray-500 mb-2">기간 설정</label>
                            <div className="flex gap-2 items-center">
                                <input type="date" value={masterStart} onChange={(e) => setMasterStart(e.target.value)} className="w-full p-2 border border-gray-300 rounded bg-white text-sm text-gray-700 focus:border-indigo-500 outline-none transition-all"/>
                                <span className="text-gray-400">-</span>
                                <input type="date" value={masterEnd} onChange={(e) => setMasterEnd(e.target.value)} className="w-full p-2 border border-gray-300 rounded bg-white text-sm text-gray-700 focus:border-indigo-500 outline-none transition-all"/>
                            </div>
                        </div>
                        <div className="min-w-[120px]">
                            <label className="block text-xs font-bold text-gray-500 mb-2">색상 태그</label>
                            <div className="flex gap-2 flex-wrap">
                                {BAR_COLORS.map((color, idx) => (
                                    <button key={idx} onClick={() => setMasterColorIdx(idx)} className={`w-7 h-7 rounded-full border-2 ${color.bg} ${color.border} ${masterColorIdx === idx ? 'ring-2 ring-indigo-500 border-white shadow' : ''} transition-all`}/>
                                ))}
                            </div>
                        </div>
                        <button onClick={syncDatesToAll} className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 h-[38px] transition-colors"><RefreshCw className="w-3.5 h-3.5"/> 일정 동기화</button>
                    </div>
                </div>

                {/* 2. Notes & Milestones */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">메모</h4>
                  <textarea value={masterNotes} onChange={(e) => setMasterNotes(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[90px]" placeholder="프로젝트 메모 수정" />
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">중요 일정 (시사일/PPM 등)</h4>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input type="text" value={masterMilestoneLabel} onChange={(e) => setMasterMilestoneLabel(e.target.value)} placeholder="이벤트 이름" className="flex-1 min-w-[140px] border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                    <input type="date" value={masterMilestoneDate} onChange={(e) => setMasterMilestoneDate(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                    <button type="button" onClick={() => {
                      if (!masterMilestoneLabel || !masterMilestoneDate) return;
                      const m: Milestone = { id: `${Date.now()}`, label: masterMilestoneLabel, date: masterMilestoneDate, color: getRandomHexColor() };
                      setMasterMilestones(prev => [...prev, m]);
                      setMasterMilestoneLabel(''); setMasterMilestoneDate('');
                    }} className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700">추가</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {masterMilestones.map(m => (
                      <span key={m.id} className="px-2 py-1 rounded border border-gray-200 bg-gray-50 text-xs flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></span>
                        <span className="font-bold text-gray-800">{m.label}</span>
                        <span className="text-gray-500">{m.date}</span>
                        <button onClick={() => setMasterMilestones(prev => prev.filter(x => x.id !== m.id))} className="text-gray-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. Member List */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 ml-1">참여 멤버</h4>
                    {Object.entries(editingMembers.filter(m => !m.isDeleted).reduce((acc, member) => { (acc[member.team] = acc[member.team] || []).push(member); return acc; }, {} as Record<string, EditingMember[]>)).map(([teamName, members]) => (
                        <div key={teamName} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-600 tracking-wide">{teamName}</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {members.map((member) => {
                                    const realIndex = editingMembers.findIndex(m => m === member); 
                                    const isDiffDate = member.start !== masterStart || member.end !== masterEnd;
                                    return (
                                        <div key={member.id} className="p-3 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                                            <div className="w-24 font-medium text-sm text-gray-900">{member.person}</div>
                                            <div className="flex-1 flex items-center gap-2">
                                                <input type="date" value={member.start} onChange={(e) => updateMemberDate(realIndex, 'start', e.target.value)} className={`p-1 rounded text-xs border border-transparent focus:border-gray-300 ${isDiffDate ? 'text-orange-600 font-bold bg-orange-50' : 'text-gray-500 bg-transparent group-hover:bg-white group-hover:border-gray-200'}`}/> 
                                                <span className="text-gray-400 text-xs">~</span> 
                                                <input type="date" value={member.end} onChange={(e) => updateMemberDate(realIndex, 'end', e.target.value)} className={`p-1 rounded text-xs border border-transparent focus:border-gray-300 ${isDiffDate ? 'text-orange-600 font-bold bg-orange-50' : 'text-gray-500 bg-transparent group-hover:bg-white group-hover:border-gray-200'}`}/> 
                                                {isDiffDate && (<span className="text-[10px] text-orange-500"><AlertCircle className="w-3 h-3 inline"/></span>)}
                                            </div>
                                            <button onClick={() => removeMemberInModal(realIndex)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* 4. Add Member Input */}
                <div className="mt-6 relative">
                    <div className="flex items-center gap-3 border border-gray-300 rounded p-2 bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-colors">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input ref={modalInputRef} type="text" className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400 text-gray-900" placeholder="새로운 멤버 검색 (엔터로 추가)" value={modalAssigneeInput} onChange={(e) => { setModalAssigneeInput(e.target.value); setModalShowSuggestions(true); }} onFocus={() => setModalShowSuggestions(true)} onKeyDown={handleModalInputKeyDown}/>
                    </div>
                    {modalShowSuggestions && modalAssigneeInput && (
                         <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-[60]">
                            {modalSuggestions.length > 0 ? modalSuggestions.map((s, idx) => (<button key={idx} onClick={() => addMemberInModal(s)} className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 text-left transition-colors border-b border-gray-50 last:border-0"><span className="text-sm font-bold text-gray-700 ml-1">{s.name}</span> <span className="text-xs text-gray-400">{s.team}</span></button>)) : <div className="p-3 text-xs text-center text-gray-400">엔터로 추가하기</div>}
                         </div>
                    )}
                </div>
            </div>

            {/* Footer - Fixed */}
            <div className="bg-white px-6 py-4 flex justify-between items-center border-t border-gray-100 flex-shrink-0">
               {!deleteConfirmMode ? (<button onClick={() => setDeleteConfirmMode(true)} className="text-gray-400 hover:text-red-600 text-xs font-medium flex items-center gap-1.5 transition-colors"><Trash2 className="w-3.5 h-3.5" /> 전체 삭제</button>) : (<div className="flex items-center gap-3"><span className="text-xs text-red-600 font-bold">정말 삭제할까요?</span><button onClick={handleDeleteAll} className="text-red-600 text-xs font-bold hover:underline">네</button><button onClick={() => setDeleteConfirmMode(false)} className="text-gray-400 text-xs hover:underline">아니오</button></div>)}
               <div className="flex gap-2"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded">취소</button><button onClick={handleSaveMasterProject} className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm transition-all">저장 완료</button></div>
            </div>
          </div>
        </div>
      )}
      
      {/* --- Header & Controls Area (Fixed at top) --- */}
      <div className="flex-none space-y-6 mb-4 px-3 md:px-6 lg:px-8 pt-4 w-full max-w-[1400px] mx-auto">
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1 flex items-center gap-2">
                    <Briefcase className="w-6 h-6 text-indigo-600"/> Resource Gantt
                </h1>
                <p className="text-sm text-gray-500 font-medium">팀 리소스 및 프로젝트 일정 관리 (2025)</p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={openTeamModal} className="h-10 text-sm font-bold text-gray-700 hover:text-indigo-600 flex items-center gap-2 transition-all bg-white px-5 rounded-lg border border-gray-300 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md active:scale-95 transform"><Settings className="w-4 h-4" /> 팀 설정</button>
                <button onClick={handleLogout} className="h-10 w-10 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition"><LogOut className="w-4 h-4" /></button>
            </div>
        </div>

        {banner && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm ${banner.tone === 'error' ? 'bg-red-50 text-red-700 border-red-100' : banner.tone === 'info' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
            <Check className="w-4 h-4" />
            <span className="text-sm font-semibold">{banner.text}</span>
          </div>
        )}
        
        {/* Input Row */}
        <ProjectForm
          projectName={projectName}
          setProjectName={setProjectName}
          selectedAssignees={selectedAssignees}
          removeAssignee={removeAssignee}
          assigneeInput={assigneeInput}
          setAssigneeInput={setAssigneeInput}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          mainSuggestions={mainSuggestions}
          addAssignee={addAssignee}
          handleInputKeyDown={handleInputKeyDown}
          inputRef={inputRef}
          projectStart={projectStart}
          setProjectStart={setProjectStart}
          projectEnd={projectEnd}
          setProjectEnd={setProjectEnd}
          handleAddProject={handleAddProject}
          projectNotes={projectNotes}
          setProjectNotes={setProjectNotes}
          projectMilestones={projectMilestones}
          addProjectMilestone={addProjectMilestone}
          updateProjectMilestone={updateProjectMilestone}
          removeProjectMilestone={removeProjectMilestone}
          vacations={projectVacations}
          addVacation={addProjectVacation}
          updateVacation={updateProjectVacation}
          removeVacation={removeProjectVacation}
        />

        {/* Dashboard Grid */}
        <div className="w-full h-[240px]">
          <Dashboard
            todayDate={todayDate}
            activeProjectsToday={activeProjectsToday}
            groupedProjects={groupedProjects}
            hoveredProjectName={hoveredProjectName}
            onShortcutClick={handleShortcutClick}
            onProjectClick={handleProjectClick}
            setHoveredProjectName={setHoveredProjectName}
          />
        </div>

        {/* Chart Controls */}
        <ChartControls
          viewMode={viewMode}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
          onToday={handleJumpToToday}
          onViewChange={setViewMode}
        />
      </div>

      {/* --- Main Gantt Table (Scrollable) --- */}
      <GanttTable
        timeline={timeline}
        teams={teams}
        projects={projects}
        viewMode={viewMode}
        chartContainerRef={chartContainerRef}
        todayColumnRef={todayColumnRef}
        rowRefs={rowRefs}
        hoveredProjectName={hoveredProjectName}
        setHoveredProjectName={setHoveredProjectName}
        handleProjectClick={handleProjectClick}
        chartTotalDays={chartTotalDays}
      />
    </div>
  );
}
