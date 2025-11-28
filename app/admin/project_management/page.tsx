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
import VacationModal from './components/VacationModal';
import { Vacation } from './types';
import pageStyles from './styles/Page.module.css';
import { handlePdfUpload } from '@/lib/pdfUpload';

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
  const [projectVacations, setProjectVacations] = useState<Vacation[]>([{ id: 'init-v1', person: '', team: '', label: '', start: '', end: '', color: '#94a3b8' }]);
  const [vacationContext, setVacationContext] = useState<'create' | 'edit'>('create');
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[]>([]);
  const [assigneeInput, setAssigneeInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [banner, setBanner] = useState<{ text: string; tone?: 'success' | 'error' | 'info' } | null>(null);
  const [editingTeams, setEditingTeams] = useState<Team[]>([]);
  // Tracking hook for future highlighting; only setter used to satisfy references
  const [, setRecentlyAddedProject] = useState<string | null>(null);
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
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

  const lastViewMode = useRef<'week' | 'day'>(viewMode);
  useEffect(() => {
    if (viewMode !== lastViewMode.current) {
      if (viewMode === 'week') {
        setChartStartDate(prev => formatDate(getStartOfWeek(new Date(prev))));
      } else {
        setChartStartDate(formatDate(todayDate));
      }
      lastViewMode.current = viewMode;
    }
  }, [viewMode, todayDate]);

  useEffect(() => {
    const lockScroll = isModalOpen || isTeamModalOpen || isVacationModalOpen;
    if (lockScroll) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isModalOpen, isTeamModalOpen, isVacationModalOpen]);

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
          return { 
            ...p, 
            vacations: (p.vacations || []).map(v => ({ ...v, person: v.person || p.person || '', team: v.team || p.team || '' })), 
            _id: normalizedId, 
            id: normalizedId 
          };
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
    setProjectVacations(prev => [...prev, { id: `${Date.now()}`, person: '', team: '', label: '', start: '', end: '', color: '#94a3b8' }]);
  };
  const updateProjectVacation = (id: string, field: 'person' | 'team' | 'label' | 'start' | 'end', value: string) => {
    setProjectVacations(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };
  const removeProjectVacation = (id: string) => {
    setProjectVacations(prev => prev.filter(v => v.id !== id));
  };
  const distributeVacationsToMembers = (vacs: Vacation[]) => {
    setEditingMembers(prev => prev.map(m => {
      const matched = vacs.filter(v => (v.person || '').toLowerCase() === m.person.toLowerCase() && (v.team || '').toLowerCase() === m.team.toLowerCase());
      return { ...m, vacations: matched.length ? matched : m.vacations || [] };
    }));
  };

  const openVacationModal = (mode: 'create' | 'edit') => {
    if (mode === 'edit') {
      const combined = editingMembers.flatMap(m => (m.vacations || []).map(v => ({ ...v, person: v.person || m.person, team: v.team || m.team })));
      setProjectVacations(combined.length ? combined : [{ id: `${Date.now()}`, person: '', team: '', label: '', start: '', end: '', color: '#94a3b8' }]);
    } else {
      setProjectVacations(prev => prev.length ? prev : [{ id: `${Date.now()}`, person: '', team: '', label: '', start: '', end: '', color: '#94a3b8' }]);
    }
    setVacationContext(mode);
    setIsVacationModalOpen(true);
  };

  const handleVacationSave = (vacs: Vacation[]) => {
    const valid = vacs.filter(v => v.person && v.start && v.end && !isNaN(Date.parse(v.start)) && !isNaN(Date.parse(v.end)) && new Date(v.start) <= new Date(v.end))
      .map(v => ({ ...v, team: v.team || '미배정', color: v.color || '#94a3b8' }));
    setProjectVacations(valid.length ? valid : [{ id: `${Date.now()}`, person: '', team: '', label: '', start: '', end: '', color: '#94a3b8' }]);
    if (vacationContext === 'edit') distributeVacationsToMembers(valid);
    showBanner('휴가가 적용되었습니다.', 'info');
    setIsVacationModalOpen(false);
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
    if (!projectName.trim()) { showBanner('프로젝트명을 입력하세요.', 'error'); return; }
    if (selectedAssignees.length === 0) { showBanner('담당자를 최소 1명 선택하세요.', 'error'); return; }
    if (!projectStart || !projectEnd) { showBanner('시작일과 종료일을 입력하세요.', 'error'); return; }

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
    const cleanedVacations = projectVacations.filter(v => v.person && v.start && v.end).map(v => ({ ...v, color: v.color || '#94a3b8' }));

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
          return { 
            ...p, 
            vacations: (p.vacations || []).map(v => ({ ...v, person: v.person || p.person || '', team: v.team || p.team || '' })), 
            _id: normalizedId, 
            id: normalizedId 
          };
        });
        setProjects(prev => dedupeProjects([...prev, ...normalized]));
        setProjectName(''); setSelectedAssignees([]); setProjectDocUrl(''); setProjectDocName(''); setProjectTentative(false); setProjectCustomColor(getRandomHexColor()); setProjectNotes(''); setProjectMilestones([{ id: `${Date.now()}`, label: '', date: '', color: getRandomHexColor() }]); setProjectVacations([{ id: `${Date.now()}`, person: '', team: '', label: '', start: '', end: '', color: '#94a3b8' }]);
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
        vacations: (p.vacations || []).map(v => ({ ...v, person: v.person || p.person, team: v.team || p.team })),
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
  const removeTeamCompletely = (tIdx: number) => { const n = [...editingTeams]; n.splice(tIdx, 1); setEditingTeams(n); };
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

  if (!authChecked) return <div className={pageStyles.fullPageMessage}>Access 확인 중...</div>;
  if (!isAuthorized) return <div className={pageStyles.fullPageMessage}>로그인이 필요합니다. 이동 중...</div>;
  if (isLoading) return <div className={pageStyles.fullPageMessage}>Loading Projects...</div>;

  return (
    <div
      className={`${pageStyles.page} ${(isModalOpen || isTeamModalOpen) ? pageStyles.pageModalOpen : ''}`}
      onClick={() => { setShowSuggestions(false); setModalShowSuggestions(false); }}
    >
      
      {/* --- Modals --- */}
      {ambiguousCandidates.length > 0 && (
        <div className={`${pageStyles.overlay} ${pageStyles.overlayHigh}`}>
          <div className={pageStyles.ambiguousCard}>
              <div className={pageStyles.ambiguousHeader}>
              <h3 className={pageStyles.ambiguousTitle}><AlertCircle className="w-4 h-4" /> 동명이인 선택</h3>
              <p className={pageStyles.ambiguousDesc}>&apos;{ambiguousCandidates[0].name}&apos;님이 여러 팀에 존재합니다.</p>
            </div>
            <div className={pageStyles.ambiguousList}>
              {ambiguousCandidates.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { addAssignee(c); setAmbiguousCandidates([]); }}
                  className={`${pageStyles.ambiguousButton} group`}
                >
                  <div><div className="font-bold text-gray-900">{c.name}</div><div className="text-xs text-gray-500 mt-0.5">{c.team}</div></div>
                  <Check className={pageStyles.ambiguousButtonIcon} />
                </button>
              ))}
            </div>
            <div className={pageStyles.ambiguousFooter}><button onClick={() => { setAmbiguousCandidates([]); setAssigneeInput(''); }} className={pageStyles.ambiguousCancel}>취소</button></div>
          </div>
        </div>
      )}

      {isTeamModalOpen && (
        <div className={`${pageStyles.overlay} ${pageStyles.overlayHigh}`}>
           <div className={pageStyles.teamModal}>
            <div className={pageStyles.teamModalHeader}>
              <h3 className={pageStyles.teamModalTitle}>팀 & 멤버 관리</h3>
              <button onClick={() => setIsTeamModalOpen(false)} className={pageStyles.iconButton}><X className="w-5 h-5"/></button>
            </div>
            <div className={pageStyles.teamModalBody}>
              {editingTeams.map((team, tIdx) => (
                <div key={team.id} className={pageStyles.teamCard}>
                  <div className={pageStyles.teamRow}>
                    <span className={pageStyles.teamLabel}>Team</span>
                    <input className={pageStyles.teamInput} value={team.name} onChange={(e) => updateTeamName(tIdx, e.target.value)} />
                    <button onClick={() => addMemberToTeam(tIdx)} className={pageStyles.teamAddMember}>+ 추가</button>
                    <button onClick={() => removeTeamCompletely(tIdx)} className="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded border border-red-200">삭제</button>
                  </div>
                  <div className={pageStyles.memberList}>
                    {team.members.length === 0 ? <span className={pageStyles.emptyMembers}>구성원 없음</span> :
                      team.members.map((member, mIdx) => (
                        <div key={mIdx} className={pageStyles.memberChip}>
                          {member}
                          <button onClick={() => removeMember(tIdx, mIdx)} className={pageStyles.memberRemove}><X className="w-3 h-3"/></button>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
              <button onClick={addTeam} className={pageStyles.addTeamButton}><Plus className="w-4 h-4"/> 새 팀 추가</button>
            </div>
            <div className={pageStyles.teamModalFooter}>
              <button onClick={() => setIsTeamModalOpen(false)} className={pageStyles.footerCancel}>취소</button>
              <button onClick={saveTeams} className={pageStyles.footerSave}>저장하기</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className={`${pageStyles.overlay} ${pageStyles.overlayMax}`}>
          <div className={pageStyles.editModal}>
            <div className={pageStyles.editHeader}>
              <div className={pageStyles.editHeaderMeta}>
                <div className={pageStyles.editHeaderLabel}>Project Edit</div>
                <input type="text" value={masterProjectName} onChange={(e) => setMasterProjectName(e.target.value)} className={pageStyles.editTitleInput}/>
              </div>
              <button onClick={() => setIsModalOpen(false)} className={pageStyles.editClose}><X className="w-6 h-6" /></button>
            </div>
            
        <div className={pageStyles.editBody}>
                {/* 1. Global Settings */}
                <div className={pageStyles.card}>
                    <h4 className={pageStyles.cardTitle}><Settings className="w-4 h-4 text-gray-500" /> 통합 설정 (Global)</h4>
                    <div className={pageStyles.settingsRow}>
                        <div className={pageStyles.settingsCol}>
                            <label className={pageStyles.inputLabel}>기간 설정</label>
                            <div className={pageStyles.dateRow}>
                                <input type="date" value={masterStart} onChange={(e) => setMasterStart(e.target.value)} className={pageStyles.dateInput}/>
                                <span className="text-gray-400">-</span>
                                <input type="date" value={masterEnd} onChange={(e) => setMasterEnd(e.target.value)} className={pageStyles.dateInput}/>
                            </div>
                        </div>
                        <div className={pageStyles.colorCol}>
                            <label className={pageStyles.inputLabel}>색상 태그</label>
                            <div className={pageStyles.colorPickerRow}>
                                {BAR_COLORS.map((color, idx) => (
                                    <button key={idx} onClick={() => setMasterColorIdx(idx)} className={`${pageStyles.colorSwatch} ${color.bg} ${color.border} ${masterColorIdx === idx ? pageStyles.colorSwatchActive : ''}`}/>
                                ))}
                            </div>
                        </div>
                        <button onClick={syncDatesToAll} className={pageStyles.syncButton}><RefreshCw className="w-3.5 h-3.5"/> 일정 동기화</button>
                    </div>
                    <div className={`${pageStyles.docRow} hidden`}>
                      <div className="md:col-span-5">
                        <label className={pageStyles.inputLabel}>문서 제목</label>
                        <input value={masterDocName} onChange={(e) => setMasterDocName(e.target.value)} placeholder="파일명 또는 제목" className={pageStyles.docInput}/>
                      </div>
                      <div className="md:col-span-5">
                        <label className={pageStyles.inputLabel}>문서 URL</label>
                        <input value={masterDocUrl} onChange={(e) => setMasterDocUrl(e.target.value)} placeholder="URL 입력 (선택)" className={pageStyles.docInput}/>
                      </div>
                      <div className="md:col-span-2 flex items-end">
                        <label className={pageStyles.docUpload}>
                          PDF 업로드
                          <input type="file" accept="application/pdf" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) await handlePdfUpload(file, setMasterDocUrl, setMasterDocName);
                          }}/>
                        </label>
                      </div>
                    </div>
                </div>

                {/* 2. Notes & Milestones */}
                <div className={pageStyles.cardTight}>
                  <h4 className={pageStyles.subTitle}>메모</h4>
                  <textarea value={masterNotes} onChange={(e) => setMasterNotes(e.target.value)} className={pageStyles.textarea} placeholder="프로젝트 메모 수정" />
                </div>

                <div className={pageStyles.cardTight}>
                  <h4 className={pageStyles.subTitleRow}>중요 일정 (시사일/PPM 등)</h4>
                  <div className={pageStyles.milestoneRow}>
                    <input type="text" value={masterMilestoneLabel} onChange={(e) => setMasterMilestoneLabel(e.target.value)} placeholder="이벤트 이름" className={pageStyles.inlineInput} />
                    <input type="date" value={masterMilestoneDate} onChange={(e) => setMasterMilestoneDate(e.target.value)} className={pageStyles.inlineInput} />
                    <button type="button" onClick={() => {
                      if (!masterMilestoneLabel || !masterMilestoneDate) return;
                      const m: Milestone = { id: `${Date.now()}`, label: masterMilestoneLabel, date: masterMilestoneDate, color: getRandomHexColor() };
                      setMasterMilestones(prev => [...prev, m]);
                      setMasterMilestoneLabel(''); setMasterMilestoneDate('');
                    }} className={pageStyles.primarySmall}>추가</button>
                  </div>
                  <div className={pageStyles.tagList}>
                    {masterMilestones.map(m => (
                      <span key={m.id} className={pageStyles.tag}>
                        <span className={pageStyles.inlineDot} style={{ backgroundColor: m.color }}></span>
                        <span className="font-bold text-gray-800">{m.label}</span>
                        <span className="text-gray-500">{m.date}</span>
                        <button onClick={() => setMasterMilestones(prev => prev.filter(x => x.id !== m.id))} className={pageStyles.tagRemove}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

        <div className={pageStyles.cardTight}>
                  <div className={pageStyles.vacationHeader}>
                    <h4 className={pageStyles.subTitle}>구성원 휴가</h4>
                    <button onClick={() => openVacationModal('edit')} className={`${pageStyles.vacationButton} hidden`}>휴가 입력</button>
                  </div>
                  {editingMembers.some(m => m.vacations && m.vacations.length) ? (
                    <div className={pageStyles.vacationList}>
                      {editingMembers.flatMap((m, idx) => (m.vacations || []).map((v, i) => (
                        <div key={`${idx}-${i}`} className={pageStyles.vacationItem}>
                          <span className="font-bold">{v.person || m.person}</span>
                          <span className="text-gray-500">{v.team || m.team}</span>
                          <span className="text-gray-600">{v.start} ~ {v.end}</span>
                          {v.label && <span className="text-gray-500">({v.label})</span>}
                        </div>
                      )))}
                    </div>
                  ) : (
                    <div className={pageStyles.vacationEmpty}>등록된 휴가가 없습니다.</div>
                  )}
                </div>

                {/* 3. Member List */}
                <div className={pageStyles.memberSection}>
                    <h4 className={pageStyles.memberTitle}>참여 멤버</h4>
                    {Object.entries(editingMembers.filter(m => !m.isDeleted).reduce((acc, member) => { (acc[member.team] = acc[member.team] || []).push(member); return acc; }, {} as Record<string, EditingMember[]>)).map(([teamName, members]) => (
                        <div key={teamName} className={pageStyles.memberGroup}>
                            <div className={pageStyles.memberGroupHeader}>
                                <span className={pageStyles.memberGroupTitle}>{teamName}</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {members.map((member) => {
                                    const realIndex = editingMembers.findIndex(m => m === member); 
                                    const isDiffDate = member.start !== masterStart || member.end !== masterEnd;
                                    return (
                                        <div key={member.id} className={`${pageStyles.memberRow} group`}>
                                            <div className={pageStyles.memberName}>{member.person}</div>
                                            <div className={pageStyles.memberDateRow}>
                                                <input type="date" value={member.start} onChange={(e) => updateMemberDate(realIndex, 'start', e.target.value)} className={`${pageStyles.memberDateInput} ${isDiffDate ? pageStyles.memberDateDiff : pageStyles.memberDateDefault}`}/> 
                                                <span className={pageStyles.memberDateDivider}>~</span> 
                                                <input type="date" value={member.end} onChange={(e) => updateMemberDate(realIndex, 'end', e.target.value)} className={`${pageStyles.memberDateInput} ${isDiffDate ? pageStyles.memberDateDiff : pageStyles.memberDateDefault}`}/> 
                                                {isDiffDate && (<span className={pageStyles.memberDateAlert}><AlertCircle className="w-3 h-3 inline"/></span>)}
                                            </div>
                                            <button onClick={() => removeMemberInModal(realIndex)} className={pageStyles.memberRemoveBtn}><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* 4. Add Member Input */}
                <div className={pageStyles.memberInputWrap}>
                    <div className={pageStyles.memberSearch}>
                        <Search className="w-4 h-4 text-gray-400" />
                        <input ref={modalInputRef} type="text" className={pageStyles.memberSearchInput} placeholder="새로운 멤버 검색 (엔터로 추가)" value={modalAssigneeInput} onChange={(e) => { setModalAssigneeInput(e.target.value); setModalShowSuggestions(true); }} onFocus={() => setModalShowSuggestions(true)} onKeyDown={handleModalInputKeyDown}/>
                    </div>
                    {modalShowSuggestions && modalAssigneeInput && (
                         <div className={pageStyles.suggestionList}>
                            {modalSuggestions.length > 0 ? modalSuggestions.map((s, idx) => (<button key={idx} onClick={() => addMemberInModal(s)} className={pageStyles.suggestionButton}><span className={pageStyles.suggestionName}>{s.name}</span> <span className={pageStyles.suggestionTeam}>{s.team}</span></button>)) : <div className={pageStyles.suggestionEmpty}>엔터로 추가하기</div>}
                         </div>
                    )}
                </div>
            </div>

            {/* Footer - Fixed */}
            <div className={pageStyles.editFooter}>
               {!deleteConfirmMode ? (<button onClick={() => setDeleteConfirmMode(true)} className={pageStyles.deleteLink}><Trash2 className="w-3.5 h-3.5" /> 전체 삭제</button>) : (<div className={pageStyles.deleteConfirm}><span className={pageStyles.deleteConfirmText}>정말 삭제할까요?</span><button onClick={handleDeleteAll} className={pageStyles.deleteYes}>네</button><button onClick={() => setDeleteConfirmMode(false)} className={pageStyles.deleteNo}>아니오</button></div>)}
               <div className={pageStyles.footerActions}><button onClick={() => setIsModalOpen(false)} className={pageStyles.footerCancel}>취소</button><button onClick={handleSaveMasterProject} className={pageStyles.footerPrimary}>저장 완료</button></div>
            </div>
          </div>
        </div>
      )}
      
      {/* --- Header & Controls Area (Fixed at top) --- */}
      <div className={pageStyles.headerWrapper}>
        <div className={pageStyles.headerRow}>
            <div>
                <h1 className={pageStyles.title}>
                    <Briefcase className="w-6 h-6 text-indigo-600"/> Resource Gantt
                </h1>
                <p className={pageStyles.subtitle}>팀 리소스 및 프로젝트 일정 관리 (2025)</p>
            </div>
            <div className={pageStyles.headerButtons}>
                <button onClick={openTeamModal} className={pageStyles.teamButton}><Settings className="w-4 h-4" /> 팀 설정</button>
                <button onClick={handleLogout} className={pageStyles.logoutButton}><LogOut className="w-4 h-4" /></button>
            </div>
        </div>

        {banner && (
          <div className={`${pageStyles.banner} ${banner.tone === 'error' ? pageStyles.bannerError : banner.tone === 'info' ? pageStyles.bannerInfo : pageStyles.bannerSuccess}`}>
            <Check className="w-4 h-4" />
            <span className={pageStyles.bannerText}>{banner.text}</span>
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
          projectDocUrl={projectDocUrl}
          setProjectDocUrl={setProjectDocUrl}
          projectDocName={projectDocName}
          setProjectDocName={setProjectDocName}
          projectMilestones={projectMilestones}
          addProjectMilestone={addProjectMilestone}
          updateProjectMilestone={updateProjectMilestone}
          removeProjectMilestone={removeProjectMilestone}
          onOpenVacationModal={() => openVacationModal('create')}
        />

        <VacationModal
          isOpen={isVacationModalOpen}
          onClose={() => setIsVacationModalOpen(false)}
          vacations={projectVacations}
          onChange={updateProjectVacation}
          onAdd={addProjectVacation}
          onRemove={removeProjectVacation}
          onSave={handleVacationSave}
          allAssignees={allMembers}
        />

        {/* Dashboard Grid */}
        <div className={pageStyles.dashboardShell}>
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
      <div className={pageStyles.ganttShell}>
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
    </div>
  );
}
