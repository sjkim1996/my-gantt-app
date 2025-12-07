'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; 
import Link from 'next/link';
import { Plus, Trash2, RefreshCw, Search, AlertCircle, Settings, X, Check, Briefcase, LogOut } from 'lucide-react';
import { Project, Team, Assignee, GroupedProject, EditingMember, ApiProjectsResponse, Milestone, Attachment } from './types';
import { parseDate, formatDate, getDaysDiff, getStartOfWeek, generateWeeks, generateDays } from './utils/date';
import { BAR_COLORS, getRandomHexColor, lightenColor } from './utils/colors';
import { mergeMilestones, mergeVacations, dedupeProjects } from './utils/gantt';
import GanttTable, { TimelineBlock } from './components/GanttTable';
import ChartControls from './components/ChartControls';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import ProjectForm from './components/ProjectForm';
import VacationModal from './components/VacationModal';
import { Vacation } from './types';
import pageStyles from './styles/Page.module.css';
import { uploadPdf, getPresignedViewUrl } from '@/lib/pdfUpload';
import { clearLoginToken } from '@/lib/auth';
import { UserRole, isEditRole } from '@/lib/authShared';

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
  const sessionRef = useRef<{ id: string; role: UserRole; label?: string; team?: string } | null>(null);
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [chartStartDate, setChartStartDate] = useState(formatDate(getStartOfWeek(new Date())));
  type AttachmentItem = Attachment & { id: string };
  const makeAttachment = (data?: Partial<AttachmentItem>): AttachmentItem => ({
    id: data?.id || `att-${Math.random().toString(36).slice(2, 7)}-${Date.now()}`,
    name: data?.name || '',
    url: data?.url || '',
    key: data?.key || '',
  });
  
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
  const [sessionUser, setSessionUser] = useState<{ id: string; role: UserRole; label?: string; team?: string } | null>(null);
  
  const [masterProjectName, setMasterProjectName] = useState('');
  const [masterColorIdx, setMasterColorIdx] = useState(0);
  const [masterStart, setMasterStart] = useState('');
  const [masterEnd, setMasterEnd] = useState('');
  const [masterAttachments, setMasterAttachments] = useState<AttachmentItem[]>([makeAttachment()]);
  const [masterTentative, setMasterTentative] = useState(false);
  const [masterCustomColor, setMasterCustomColor] = useState('');
  const [masterNotes, setMasterNotes] = useState('');
  const [masterMilestones, setMasterMilestones] = useState<Milestone[]>([]);
  const [masterMilestoneLabel, setMasterMilestoneLabel] = useState('');
  const [masterMilestoneDate, setMasterMilestoneDate] = useState('');
  const [masterMilestoneEnd, setMasterMilestoneEnd] = useState('');
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
  const [projectAttachments, setProjectAttachments] = useState<AttachmentItem[]>([makeAttachment()]);
  const [projectTentative, setProjectTentative] = useState(false);
  const [projectCustomColor, setProjectCustomColor] = useState(getRandomHexColor());
  const [projectNotes, setProjectNotes] = useState('');
  const [projectMilestones, setProjectMilestones] = useState<Milestone[]>([{ id: 'init-m1', label: '', date: '', end: '', color: getRandomHexColor() }]);
  const [projectVacations, setProjectVacations] = useState<Vacation[]>([{ id: 'init-v1', person: '', team: '', label: '', start: '', end: '', color: '#94a3b8' }]);
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
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [vacationModalDefaultTab, setVacationModalDefaultTab] = useState<'create' | 'list'>('create');
  const [activeTab, setActiveTab] = useState<'gantt' | 'calendar'>('gantt');
  const [calendarSelectedMembers, setCalendarSelectedMembers] = useState<Assignee[]>([]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const effectiveSession = sessionUser || sessionRef.current;
  const role = effectiveSession?.role ?? null;
  const canEdit = isEditRole(role);
  const initialScrolledRef = useRef(false);
  const colorForNameRef = useRef<Map<string, number>>(new Map());
  const colorCursorRef = useRef(0);
  const paletteSize = BAR_COLORS.length;
  const autoTeamSyncRef = useRef(false);
  const WEEK_SPANS = [4, 6, 8, 10, 12, 16, 20] as const;
  const DAY_SPANS: number[] = [7, 14, 21, 28, 31];
  const [weekSpan, setWeekSpan] = useState<number>(8);
  const [daySpan, setDaySpan] = useState<number>(28);
  const weekCellWidth = useMemo(() => {
    if (weekSpan <= 4) return 160;
    if (weekSpan <= 6) return 140;
    if (weekSpan <= 8) return 120;
    if (weekSpan <= 10) return 105;
    if (weekSpan <= 12) return 96;
    if (weekSpan <= 16) return 90;
    return 84;
  }, [weekSpan]);
  const dayCellWidth = useMemo(() => {
    if (daySpan <= 7) return 80;
    if (daySpan <= 14) return 70;
    if (daySpan <= 21) return 60;
    if (daySpan <= 28) return 46;
    return 40;
  }, [daySpan]);

  const findNearest = (value: number, pool: number[]) => pool.reduce((prev, cur) => (Math.abs(cur - value) < Math.abs(prev - value) ? cur : prev), pool[0]);

  const handleViewChange = (mode: 'week' | 'day') => {
    setViewMode(mode);
    if (mode === 'day') {
      const derived = weekSpan * 7;
      const nearest = findNearest(Math.min(derived, DAY_SPANS[DAY_SPANS.length - 1]), DAY_SPANS);
      if (nearest !== daySpan) setDaySpan(nearest);
    } else {
      const derivedWeek = Math.round(daySpan / 7);
      const nearest = findNearest(derivedWeek, [...WEEK_SPANS]);
      if (nearest !== weekSpan) setWeekSpan(nearest);
    }
  };

  const handleZoomIn = () => {
    if (viewMode === 'week') {
      const idx = WEEK_SPANS.findIndex((v) => v === weekSpan);
      const next = idx > 0 ? WEEK_SPANS[idx - 1] : WEEK_SPANS[0];
      setWeekSpan(next);
    } else {
      const idx = DAY_SPANS.findIndex((v) => v === daySpan);
      const next = idx > 0 ? DAY_SPANS[idx - 1] : DAY_SPANS[0];
      setDaySpan(next);
    }
  };

  const handleZoomOut = () => {
    if (viewMode === 'week') {
      const idx = WEEK_SPANS.findIndex((v) => v === weekSpan);
      const next = idx < WEEK_SPANS.length - 1 ? WEEK_SPANS[idx + 1] : WEEK_SPANS[WEEK_SPANS.length - 1];
      setWeekSpan(next);
    } else {
      const idx = DAY_SPANS.findIndex((v) => v === daySpan);
      const next = idx < DAY_SPANS.length - 1 ? DAY_SPANS[idx + 1] : DAY_SPANS[DAY_SPANS.length - 1];
      setDaySpan(next);
    }
  };

  const canZoomIn = viewMode === 'week' ? weekSpan > WEEK_SPANS[0] : daySpan > DAY_SPANS[0];
  const canZoomOut = viewMode === 'week' ? weekSpan < WEEK_SPANS[WEEK_SPANS.length - 1] : daySpan < DAY_SPANS[DAY_SPANS.length - 1];

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

  const guardEdit = () => {
    if (canEdit) return true;
    showBanner('조회 전용 계정입니다. 수정이나 신규 등록이 필요하면 팀장에게 요청하세요.', 'error');
    return false;
  };

  const getColorIdxForName = useCallback((name: string) => {
    const existing = colorForNameRef.current.get(name);
    if (typeof existing === 'number') return existing;
    const idx = colorCursorRef.current % paletteSize;
    colorCursorRef.current += 1;
    colorForNameRef.current.set(name, idx);
    return idx;
  }, [paletteSize]);

  const applyProjects = useCallback((list: Project[]) => {
    const viewerId = (effectiveSession?.id || '').toLowerCase();
    const viewerLabel = (effectiveSession?.label || '').toLowerCase();
    const filterVacations = (items?: Vacation[]) => {
      if (role !== 'member') return items || [];
      return (items || []).filter((v) => {
        const name = (v.person || '').toLowerCase();
        return name === viewerId || (!!viewerLabel && name === viewerLabel);
      });
    };
    const sanitized =
      role === 'member'
        ? list.map((p) => ({ ...p, vacations: filterVacations(p.vacations) }))
        : list;
    const colored = sanitized.map((p) => {
      const normalizedMilestones = (p.milestones || []).map((m) => ({
        ...m,
        end: m.end || m.date,
        color: m.color || getRandomHexColor(),
      }));
      const hasValidColor = typeof p.colorIdx === 'number' && !Number.isNaN(p.colorIdx);
      const colorIdx = hasValidColor ? p.colorIdx : getColorIdxForName(p.name);
      if (!colorForNameRef.current.has(p.name)) {
        colorForNameRef.current.set(p.name, colorIdx);
      }
      return { ...p, colorIdx, milestones: mergeMilestones(normalizedMilestones, []), vacations: p.vacations ? mergeVacations(p.vacations, []) : [] };
    });
    setProjects(dedupeProjects(colored));
  }, [role, getColorIdxForName, effectiveSession?.id, effectiveSession?.label]);

  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data?.success && Array.isArray(data.data)) {
        const normalized = (data.data as Project[]).map((p, idx) => {
          const docId = (p as Project & { _id?: string | number })._id;
          const normalizedId = typeof docId === 'string'
            ? docId
            : docId
            ? String(docId)
            : typeof p.id === 'string'
            ? p.id
            : `reload-${idx}`;
          return { ...p, _id: normalizedId, id: normalizedId };
        });
        applyProjects(normalized);
      }
    } catch (err) {
      console.error('[PROJECT REFRESH] failed', err);
    }
  }, [applyProjects]);

  const combinedVacations = useMemo(() => {
    if (role === 'member') {
      const viewerId = (effectiveSession?.id || '').toLowerCase();
      const viewerLabel = (effectiveSession?.label || '').toLowerCase();
      return vacations.filter((v) => {
        const name = (v.person || '').toLowerCase();
        return name === viewerId || (!!viewerLabel && name === viewerLabel);
      });
    }
    return vacations;
  }, [vacations, role, effectiveSession?.id, effectiveSession?.label]);

  useEffect(() => {
    const base = viewMode === 'week' ? getStartOfWeek(anchorDate) : anchorDate;
    setChartStartDate(formatDate(base));
  }, [anchorDate, viewMode]);

  useEffect(() => {
    setAnchorDate(parseDate(chartStartDate));
  }, [viewMode, chartStartDate]);

  useEffect(() => {
    const lockScroll = isModalOpen || isTeamModalOpen || isVacationModalOpen || isPasswordModalOpen;
    if (lockScroll) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isModalOpen, isTeamModalOpen, isVacationModalOpen, isPasswordModalOpen]);

  // --- Auth & Data Fetch ---
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
        const sessionJson = await sessionRes.json();
        if (!sessionRes.ok || !sessionJson?.success) {
          throw new Error('unauthorized');
        }
        const sessionData = sessionJson.data as { id: string; role: UserRole; label?: string; team?: string };
        sessionRef.current = sessionData;
        setSessionUser(sessionData);
        setIsAuthorized(true);

        const [projectsRes, teamsRes, vacationsRes] = await Promise.all([
          fetch('/api/projects', { cache: 'no-store' }),
          fetch('/api/teams', { cache: 'no-store' }),
          fetch('/api/vacations', { cache: 'no-store' }),
        ]);

        if (projectsRes.status === 401 || projectsRes.status === 403) throw new Error('unauthorized');
        const projectsJson = (await projectsRes.json()) as ApiProjectsResponse;
        if (projectsRes.ok && projectsJson.success && Array.isArray(projectsJson.data)) {
          const loadedProjects = (projectsJson.data || []).map((p, idx) => {
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
          applyProjects(loadedProjects);
        } else {
          applyProjects(MOCK_PROJECTS_2025);
        }

        if (teamsRes.status === 401 || teamsRes.status === 403) throw new Error('unauthorized');
        const teamJson = await teamsRes.json();
        if (teamsRes.ok && teamJson.success && Array.isArray(teamJson.data)) {
          const loaded = teamJson.data.map((t: Team, idx: number) => ({ ...t, id: t._id || `t${idx}` }));
          setTeams(loaded);
        } else {
          setTeams(DEFAULT_TEAMS);
        }

        if (vacationsRes.ok) {
          const vacJson = await vacationsRes.json();
          if (vacJson?.success && Array.isArray(vacJson.data)) {
            const loadedVac = vacJson.data.map((v: Vacation, idx: number) => ({ ...v, id: v._id || `vac-${idx}` }));
            setVacations(loadedVac);
          }
        } else if (vacationsRes.status === 403 || vacationsRes.status === 401) {
          setVacations([]);
        }
      } catch (error) {
        console.error('[AUTH] bootstrap failed', error);
        setIsAuthorized(false);
        setSessionUser(null);
        sessionRef.current = null;
        clearLoginToken();
        setProjects([]);
        setTeams(DEFAULT_TEAMS);
        setVacations([]);
        router.replace('/login'); 
      } finally {
        setAuthChecked(true);
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [router, applyProjects]);

  const timeline = useMemo<TimelineBlock[]>(() => {
    const blocks = viewMode === 'week'
      ? generateWeeks(chartStartDate, weekSpan, todayDate)
      : generateDays(chartStartDate, daySpan, todayDate);
    return blocks.map(b => ({
      ...b,
      isToday: b.isTodayWeek || (formatDate(b.start) === formatDate(todayDate))
    }));
  }, [chartStartDate, todayDate, viewMode, weekSpan, daySpan]);

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

  const calendarSeededRef = useRef(false);
  useEffect(() => {
    if (calendarSeededRef.current) return;
    if (calendarSelectedMembers.length === 0 && allMembers.length > 0) {
      setCalendarSelectedMembers(allMembers);
      calendarSeededRef.current = true;
    }
  }, [allMembers, calendarSelectedMembers.length]);

  const normalizeKey = (team: string, name: string) => `${team.toLowerCase()}__${name.toLowerCase()}`;
  const toggleCalendarTeam = (teamName: string) => {
    const team = teams.find((t) => t.name === teamName);
    if (!team) return;
    const members = team.members || [];
    setCalendarSelectedMembers((prev) => {
      const set = new Set(prev.map((m) => normalizeKey(m.team, m.name)));
      const allChecked = members.every((m) => set.has(normalizeKey(teamName, m)));
      if (allChecked) {
        return prev.filter((m) => m.team !== teamName);
      }
      const filtered = prev.filter((m) => m.team !== teamName);
      members.forEach((m) => filtered.push({ name: m, team: teamName }));
      return filtered;
    });
  };

  const toggleCalendarMember = (teamName: string, memberName: string) => {
    setCalendarSelectedMembers((prev) => {
      const key = normalizeKey(teamName, memberName);
      if (prev.some((m) => normalizeKey(m.team, m.name) === key)) {
        return prev.filter((m) => normalizeKey(m.team, m.name) !== key);
      }
      return [...prev, { name: memberName, team: teamName }];
    });
  };

  const selectAllCalendarMembers = () => {
    setCalendarSelectedMembers(allMembers);
    calendarSeededRef.current = true;
  };
  const clearCalendarMembers = () => {
    setCalendarSelectedMembers([]);
    calendarSeededRef.current = true;
  };

  // Initial Scroll to Today (run once)
  useEffect(() => {
    if (initialScrolledRef.current) return;
    if (!isLoading && todayColumnRef.current && chartContainerRef.current) {
      initialScrolledRef.current = true;
      const timer = setTimeout(() => {
        todayColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  type ApiResponse<T> = { success: boolean; data?: T; error?: string };
  type ProjectPayload = Omit<Project, 'id'> & { id?: string | number; _id?: string };

  const apiCreateProject = async (newProjects: ProjectPayload[]): Promise<ApiResponse<ProjectPayload[]>> => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProjects),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { success: false, error: data?.error || `저장 실패 (status ${res.status})` };
      }
      return data as ApiResponse<ProjectPayload[]>;
    } catch (error) {
      console.error('[API] create project failed', error);
      return { success: false, error: '네트워크 오류로 저장하지 못했습니다.' };
    }
  };

  const apiUpdateProject = async (project: ProjectPayload): Promise<ApiResponse<ProjectPayload>> => {
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { success: false, error: data?.error || `업데이트 실패 (status ${res.status})` };
      }
      return data as ApiResponse<ProjectPayload>;
    } catch (error) {
      console.error('[API] update project failed', error);
      return { success: false, error: '네트워크 오류로 업데이트하지 못했습니다.' };
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
    const currentStart = parseDate(chartStartDate);
    if (viewMode === 'week') {
      const base = getStartOfWeek(currentStart);
      base.setDate(base.getDate() - 7);
      setAnchorDate(base);
    } else {
      currentStart.setDate(currentStart.getDate() - 14);
      setAnchorDate(currentStart);
    }
  };
  const handleNextMonth = () => {
    const currentStart = parseDate(chartStartDate);
    if (viewMode === 'week') {
      const base = getStartOfWeek(currentStart);
      base.setDate(base.getDate() + 7);
      setAnchorDate(base);
    } else {
      currentStart.setDate(currentStart.getDate() + 14);
      setAnchorDate(currentStart);
    }
  };
  const handleJumpToToday = () => {
    setAnchorDate(todayDate);
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
        row.classList.add(pageStyles.rowHighlight);
        setTimeout(() => row.classList.remove(pageStyles.rowHighlight), 1500);
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

  const toAttachmentPayload = (items: AttachmentItem[]): Attachment[] =>
    items
      .filter((a) => a.name || a.key || a.url)
      .map((a) => ({
        name: a.name || a.key || a.url || '첨부',
        key: a.key || undefined,
        url: a.url || undefined,
      }));

  const normalizeProjectAttachments = (p: Project): AttachmentItem[] => {
    if (Array.isArray(p.attachments) && p.attachments.length) {
      return p.attachments.map((att) => makeAttachment(att));
    }
    if (p.docKey || p.docUrl || p.docName) {
      return [makeAttachment({ name: p.docName || '첨부', key: p.docKey, url: p.docUrl })];
    }
    return [];
  };

  const openAttachment = async (att?: Attachment) => {
    if (!att) { showBanner('첨부된 문서가 없습니다.', 'info'); return; }
    if (att.key) {
      try {
        const url = await getPresignedViewUrl(att.key);
        window.open(url, '_blank');
        return;
      } catch (err) {
        console.error('[DOC OPEN]', err);
        showBanner('문서 열기에 실패했습니다.', 'error');
        return;
      }
    }
    if (att.url) {
      window.open(att.url, '_blank');
    } else {
      showBanner('첨부된 문서가 없습니다.', 'info');
    }
  };

  const uploadAttachmentsToState = async (targetId: string, files: FileList | null, setState: React.Dispatch<React.SetStateAction<AttachmentItem[]>>) => {
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);
    try {
      const uploaded: { name: string; key: string; url: string }[] = [];
      for (const f of fileArr) {
        uploaded.push(await uploadPdf(f));
      }
      setState((prev) => {
        let next = [...prev];
        uploaded.forEach((res, idx) => {
          if (idx === 0) {
            next = next.map((att) => att.id === targetId ? { ...att, name: res.name, key: res.key, url: res.url } : att);
          } else {
            next.push(makeAttachment({ name: res.name, key: res.key, url: res.url }));
          }
        });
        if (!next.some((a) => !a.name && !a.key && !a.url)) {
          next.push(makeAttachment());
        }
        return next;
      });
      showBanner('파일이 업로드되었습니다.', 'success');
    } catch (err) {
      console.error('[ATTACH UPLOAD]', err);
      const message = err instanceof Error ? err.message : '파일 업로드에 실패했습니다.';
      showBanner(message, 'error');
    }
  };

  const addProjectAttachment = () => {
    const att = makeAttachment();
    setProjectAttachments((prev) => [...prev, att]);
    return att.id;
  };
  const removeProjectAttachment = (id: string) => setProjectAttachments((prev) => (prev.length === 1 ? prev : prev.filter((a) => a.id !== id)));
  const uploadProjectAttachment = (id: string, files: FileList | null) => uploadAttachmentsToState(id, files, setProjectAttachments);

  const removeMasterAttachment = (id: string) => setMasterAttachments((prev) => (prev.length === 1 ? prev : prev.filter((a) => a.id !== id)));
  const uploadMasterAttachment = (id: string, files: FileList | null) => uploadAttachmentsToState(id, files, setMasterAttachments);
  const clearMasterAttachment = (id: string) => setMasterAttachments((prev) => prev.map((a) => a.id === id ? makeAttachment({ id }) : a));

  const removeAssignee = (idx: number) => {
    const newArr = [...selectedAssignees]; newArr.splice(idx, 1); setSelectedAssignees(newArr);
  };
  
  const addProjectMilestone = () => {
    setProjectMilestones(prev => [...prev, { id: `${Date.now()}`, label: '', date: '', end: '', color: getRandomHexColor() }]);
  };
  const updateProjectMilestone = (id: string, field: 'label' | 'date' | 'end', value: string) => {
    setProjectMilestones(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };
  const removeProjectMilestone = (id: string) => {
    setProjectMilestones(prev => prev.filter(x => x.id !== id));
  };
  const normalizeMilestonesForSave = (items: Milestone[]) =>
    items.map((m) => {
      const end = m.end && m.end.length > 0 ? m.end : m.date;
      return { ...m, end, color: m.color || getRandomHexColor() };
    });
  const addProjectVacation = () => {
    setProjectVacations(prev => [...prev, { id: `${Date.now()}`, person: '', team: '', label: '', start: '', end: '', color: '#94a3b8' }]);
  };
  const updateProjectVacation = (id: string, field: 'person' | 'team' | 'label' | 'start' | 'end', value: string) => {
    setProjectVacations(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const vacationSnapshotRef = useRef<Vacation[]>([]);

  const fetchLatestVacations = async (): Promise<Vacation[]> => {
    try {
      const vacRes = await fetch('/api/vacations', { cache: 'no-store' });
      if (vacRes.ok) {
        const vacJson = await vacRes.json();
        if (vacJson?.success && Array.isArray(vacJson.data)) {
          const loadedVac = (vacJson.data as Vacation[]).map((v, idx) => ({ ...v, id: v._id || `vac-${idx}` }));
          setVacations(loadedVac);
          return loadedVac;
        }
      }
    } catch (err) {
      console.error('[VACATION] fetch failed', err);
    }
    return vacations;
  };

  const openVacationModal = async (options?: { tab?: 'create' | 'list' }) => {
    if (!guardEdit()) return;
    const latest = await fetchLatestVacations();
    vacationSnapshotRef.current = latest;
    const seed = latest.length ? latest.map(v => ({ ...v, id: v.id || v._id || `${v.person}-${v.start}` })) : [{ id: `${Date.now()}`, person: '', team: '', label: '', start: '', end: '', color: '#0f172a' }];
    setProjectVacations(seed);
    setVacationModalDefaultTab(options?.tab ?? 'create');
    setIsVacationModalOpen(true);
  };

  const handleVacationSave = async (vacs: Vacation[]) => {
    if (!guardEdit()) return;
    const valid = vacs
      .filter(v => v.person && v.start && v.end && !isNaN(Date.parse(v.start)) && !isNaN(Date.parse(v.end)) && new Date(v.start) <= new Date(v.end))
      .map(v => {
        const matchedTeam = v.team || allMembers.find(m => m.name === v.person)?.team || '';
        return { ...v, team: matchedTeam || '미배정', color: v.color || '#0f172a' };
      });

    try {
      const initialIds = new Set(vacationSnapshotRef.current.map(v => String(v._id || v.id)));
      const currentIds = new Set(valid.filter(v => v._id || v.id).map(v => String(v._id || v.id)));

      // Deletes
      const toDelete = vacationSnapshotRef.current.filter(v => !currentIds.has(String(v._id || v.id)));
      for (const del of toDelete) {
        const deleteId = del._id || del.id;
        if (deleteId) {
          await fetch(`/api/vacations?id=${encodeURIComponent(String(deleteId))}`, { method: 'DELETE' });
        }
      }

      // Updates
      const toUpdate = valid.filter(v => v._id || initialIds.has(String(v.id)));
      for (const u of toUpdate) {
        const targetId = u._id || u.id;
        if (!targetId) continue;
        await fetch('/api/vacations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...u, _id: targetId }),
        });
      }

      // Creates
      const toCreate = valid.filter(v => !v._id && !initialIds.has(String(v.id)));
      if (toCreate.length) {
        await fetch('/api/vacations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toCreate),
        });
      }

      // Refresh
      await fetchLatestVacations();
      showBanner('휴가가 저장되었습니다.', 'success');
    } catch (error) {
      console.error('[VACATION] save failed', error);
      showBanner('휴가 저장에 실패했습니다.', 'error');
    }

    setIsVacationModalOpen(false);
  };

  const handleVacationRemove = async (id: string) => {
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
    if (!guardEdit()) return;
    if (!projectName.trim()) { showBanner('프로젝트명을 입력하세요.', 'error'); return; }
    if (selectedAssignees.length === 0) { showBanner('담당자를 최소 1명 선택하세요.', 'error'); return; }
    if (!projectStart || !projectEnd) { showBanner('시작일과 종료일을 입력하세요.', 'error'); return; }

    const existingGroup = groupedProjects.find((g) => g.name === projectName);
    const existingPairs = new Set(projects.filter(p => p.name === projectName).map(p => `${p.person}__${p.team}`));

    let targetName = projectName;
    let assigneesToAdd = [...selectedAssignees];
    const colorIdx = getColorIdxForName(targetName);
    const cleanedAttachments = toAttachmentPayload(projectAttachments);
    const finalAttachments = cleanedAttachments.length
      ? cleanedAttachments
      : (existingGroup?.attachments && existingGroup.attachments.length
        ? existingGroup.attachments
        : (existingGroup ? toAttachmentPayload(normalizeProjectAttachments(existingGroup)) : []));
    const primaryAttachment = finalAttachments[0];
    const finalDocUrl = primaryAttachment?.url || existingGroup?.docUrl || '';
    const finalDocName = primaryAttachment?.name || existingGroup?.docName || '';
    const finalDocKey = primaryAttachment?.key || existingGroup?.docKey || '';
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

    const cleanedMilestones = normalizeMilestonesForSave(
      projectMilestones
        .filter(m => m.label && m.date)
        .map((m) => ({ ...m }))
    );
    const cleanedVacations = projectVacations.filter(v => v.person && v.start && v.end).map(v => ({ ...v, color: v.color || '#94a3b8' }));

    const newEntries: ProjectPayload[] = assigneesToAdd.map((assignee) => ({
      name: targetName,
      person: assignee.name,
      team: assignee.team,
      start: projectStart,
      end: projectEnd,
      colorIdx,
      docUrl: finalDocUrl || undefined,
      docKey: finalDocKey || undefined,
      docName: finalDocName || undefined,
      attachments: finalAttachments,
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
        setProjects(prev => dedupeProjects((role === 'member' ? [...prev, ...normalized].map(p => ({ ...p, vacations: [] })) : [...prev, ...normalized])));
        setProjectName(''); setSelectedAssignees([]); setProjectAttachments([makeAttachment()]); setProjectTentative(false); setProjectCustomColor(getRandomHexColor()); setProjectNotes(''); setProjectMilestones([{ id: `${Date.now()}`, label: '', date: '', end: '', color: getRandomHexColor() }]); setProjectVacations([{ id: `${Date.now()}`, person: '', team: '', label: '', start: '', end: '', color: '#94a3b8' }]);
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
    if (!guardEdit()) return;
    const targetName = project.name;
    const relatedProjects = dedupeProjects(projects.filter(p => p.name === targetName));
    const normalizedAttachments = normalizeProjectAttachments(project);
    setMasterProjectName(targetName); 
    setMasterColorIdx(project.colorIdx); 
    setMasterCustomColor(project.customColor || '');
    setMasterStart(project.start); 
    setMasterEnd(project.end);
    setMasterAttachments(normalizedAttachments.length ? normalizedAttachments : [makeAttachment()]);
    setMasterTentative(Boolean(project.isTentative));
    setMasterNotes(project.notes || '');
          setMasterMilestones(project.milestones ? mergeMilestones(project.milestones, []) : []);
    setMasterMilestoneLabel('');
    setMasterMilestoneDate('');
    const members: EditingMember[] = relatedProjects.map(p => { 
      const memberAttachments = (p.attachments && p.attachments.length)
        ? p.attachments
        : toAttachmentPayload(normalizeProjectAttachments(p));
      return { 
        id: p.id,
        _id: typeof p._id === 'string' ? p._id : undefined,
        person: p.person,
        team: p.team,
        start: p.start,
        end: p.end,
        docUrl: p.docUrl,
        docName: p.docName,
        docKey: p.docKey,
        attachments: memberAttachments,
        isTentative: p.isTentative,
        customColor: p.customColor,
        notes: p.notes,
        milestones: p.milestones ? mergeMilestones(p.milestones, []) : [],
        vacations: (p.vacations || []).map(v => ({ ...v, person: v.person || p.person, team: v.team || p.team })),
    }; });
    setEditingMembers(members); setIsModalOpen(true);
  };

  const addMemberInModal = (assignee: Assignee) => {
    if (editingMembers.some(m => m.person === assignee.name && m.team === assignee.team && !m.isDeleted)) { setModalAssigneeInput(''); return; }
    const attachmentPayload = toAttachmentPayload(masterAttachments);
    const primaryAttachment = attachmentPayload[0];
    const newMember: EditingMember = {
      id: Date.now(),
      person: assignee.name,
      team: assignee.team,
      start: masterStart,
      end: masterEnd,
      isNew: true,
      docUrl: primaryAttachment?.url,
      docName: primaryAttachment?.name,
      docKey: primaryAttachment?.key,
      attachments: attachmentPayload,
      isTentative: masterTentative,
      customColor: masterCustomColor,
      notes: masterNotes,
      milestones: [...masterMilestones],
      vacations: [],
    };
    setEditingMembers([...editingMembers, newMember]); setModalAssigneeInput(''); setModalShowSuggestions(false); modalInputRef.current?.focus();
  };
  const removeMemberInModal = (index: number) => { const updated = [...editingMembers]; updated[index].isDeleted = true; setEditingMembers(updated); };
  const updateMemberDate = (index: number, field: 'start' | 'end', value: string) => { const updated = [...editingMembers]; updated[index][field] = value; setEditingMembers(updated); };
  const syncDatesToAll = () => { const updated = editingMembers.map(m => ({ ...m, start: masterStart, end: masterEnd })); setEditingMembers(updated); };
  
  const handleSaveMasterProject = async () => {
    if (!guardEdit()) return;
    const normalizedMasterMilestones = normalizeMilestonesForSave(masterMilestones);
    const masterAttachmentPayload = toAttachmentPayload(masterAttachments);
    const primaryAttachment = masterAttachmentPayload[0];
    const resolvedDocUrl = primaryAttachment?.url || '';
    const resolvedDocKey = primaryAttachment?.key || '';
    const resolvedDocName = primaryAttachment?.name || '';
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
            name: masterProjectName, person: m.person, team: m.team, start: m.start, end: m.end, colorIdx: masterColorIdx, docUrl: resolvedDocUrl, docKey: resolvedDocKey, docName: resolvedDocName, attachments: masterAttachmentPayload, isTentative: masterTentative, customColor: masterCustomColor || undefined, notes: masterNotes, milestones: normalizedMasterMilestones, vacations: m.vacations
        })));
    }

    const updatedMembers = editingMembers.filter(m => !m.isNew && !m.isDeleted && m._id);
    for (const m of updatedMembers) {
        await apiUpdateProject({
            _id: m._id, name: masterProjectName, person: m.person, team: m.team, start: m.start, end: m.end, colorIdx: masterColorIdx, docUrl: resolvedDocUrl, docKey: resolvedDocKey, docName: resolvedDocName, attachments: masterAttachmentPayload, isTentative: masterTentative, customColor: masterCustomColor || undefined, notes: masterNotes, milestones: normalizedMasterMilestones, vacations: m.vacations
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
              applyProjects(normalized); 
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
      if (!guardEdit()) return;
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

      setProjects(prev => dedupeProjects((role === 'member' ? prev.map(p => ({ ...p, vacations: [] })) : prev).filter(p => {
        const key = typeof p._id === 'string' ? p._id : (typeof p.id === 'string' ? p.id : String(p.id));
        return !idsToDelete.includes(key);
      })));

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
            applyProjects(normalized);
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

  const openTeamModal = () => { if (!guardEdit()) return; setEditingTeams(JSON.parse(JSON.stringify(teams))); setIsTeamModalOpen(true); };

  const syncProjectsToTeams = async (updatedTeams: Team[], renamedTeams?: Map<string, string>) => {
    const personTeamMap = new Map<string, string>();
    updatedTeams.forEach((t) => t.members.forEach((m) => { if (!personTeamMap.has(m)) personTeamMap.set(m, t.name); }));

    const targets = projects.filter((p) => {
      const nextTeam = personTeamMap.get(p.person) || renamedTeams?.get(p.team);
      return nextTeam && nextTeam !== p.team && typeof p._id === 'string';
    });
    if (!targets.length) return;

    let syncFailed = false;
    for (const proj of targets) {
      const nextTeam = personTeamMap.get(proj.person) || renamedTeams?.get(proj.team);
      if (!nextTeam) continue;
      try {
        await apiUpdateProject({
          ...proj,
          team: nextTeam,
          _id: proj._id,
        });
      } catch (err) {
        syncFailed = true;
        console.error('[TEAM SYNC] project update failed', err);
      }
    }

    setProjects((prev) =>
      dedupeProjects(
        prev.map((p) => {
          const nextTeam = personTeamMap.get(p.person) || renamedTeams?.get(p.team);
          return nextTeam && nextTeam !== p.team ? { ...p, team: nextTeam } : p;
        })
      )
    );

    await refreshProjects();

    if (syncFailed) {
      showBanner('팀은 저장됐지만 일부 프로젝트 팀 동기화에 실패했습니다. 새로고침 후 확인하세요.', 'error');
    }
  };

  const saveTeams = async () => {
    if (!guardEdit()) return;
    try {
      const renameMap = new Map<string, string>();
      teams.forEach((t) => {
        const updated = editingTeams.find((et) => et.id === t.id);
        if (updated && updated.name && updated.name !== t.name) {
          renameMap.set(t.name, updated.name);
        }
      });

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
      await syncProjectsToTeams(stored, renameMap);
      setIsTeamModalOpen(false);
      showBanner('팀 정보가 저장되었습니다.', 'success');
    } catch (error) {
      console.error('[API] save teams failed:', error);
      setTeams(editingTeams);
      setIsTeamModalOpen(false);
      showBanner('팀 저장에 실패했습니다. 네트워크를 확인하세요.', 'error');
    }
  };

  const addTeam = () => { if (!guardEdit()) return; setEditingTeams([...editingTeams, { id: `t${Date.now()}`, name: '새 팀', members: [] }]); };
  const updateTeamName = (idx: number, name: string) => { if (!guardEdit()) return; const n = [...editingTeams]; n[idx].name = name; setEditingTeams(n); };
  const addMemberToTeam = (teamIdx: number) => { if (!guardEdit()) return; const name = prompt("이름:"); if (name) { const n = [...editingTeams]; n[teamIdx].members.push(name); setEditingTeams(n); } };
  const removeMember = (tIdx: number, mIdx: number) => { if (!guardEdit()) return; const n = [...editingTeams]; n[tIdx].members.splice(mIdx, 1); setEditingTeams(n); };
  const removeTeamCompletely = (tIdx: number) => { if (!guardEdit()) return; const n = [...editingTeams]; n.splice(tIdx, 1); setEditingTeams(n); };
  const handleModalInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isEventComposing(e)) return;
    if (e.key === 'Enter' && modalAssigneeInput.trim()) { e.preventDefault(); if (modalSuggestions.length === 1) { addMemberInModal(modalSuggestions[0]); return; } const exact = allMembers.filter(m => m.name === modalAssigneeInput.trim()); if (exact.length === 1) { addMemberInModal(exact[0]); return; } let newName = modalAssigneeInput.trim(); let newTeam = '미배정'; if (newName.includes('-')) { const parts = newName.split('-'); newTeam = parts[0].trim(); newName = parts[1].trim(); } addMemberInModal({ name: newName, team: newTeam, isNew: true }); }
  };
  useEffect(() => { if (isModalOpen) setDeleteConfirmMode(false); }, [isModalOpen]);

  useEffect(() => {
    if (autoTeamSyncRef.current) return;
    if (!canEdit) return;
    if (!projects.length || !teams.length) return;
    autoTeamSyncRef.current = true;
    void syncProjectsToTeams(teams);
  }, [canEdit, projects, teams, syncProjectsToTeams]);

  const handleLogout = async () => { 
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('[AUTH] logout failed', error);
    }
    clearLoginToken();
    setSessionUser(null);
    sessionRef.current = null;
    router.push('/login'); 
  };

  const handlePasswordChange = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      showBanner('모든 비밀번호 입력란을 채워주세요.', 'error');
      return;
    }
    if (newPw !== confirmPw) {
      showBanner('새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }
    if (!newPw.trim()) {
      showBanner('비밀번호는 공백일 수 없습니다.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/accounts/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        showBanner(data?.error || '비밀번호 변경에 실패했습니다.', 'error');
        return;
      }
      showBanner('비밀번호가 변경되었습니다.', 'success');
      setIsPasswordModalOpen(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (error) {
      console.error('[ACCOUNT] change password', error);
      showBanner('비밀번호 변경에 실패했습니다.', 'error');
    }
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
              <h3 className={pageStyles.ambiguousTitle}><AlertCircle size={16} /> 동명이인 선택</h3>
              <p className={pageStyles.ambiguousDesc}>&apos;{ambiguousCandidates[0].name}&apos;님이 여러 팀에 존재합니다.</p>
            </div>
            <div className={pageStyles.ambiguousList}>
              {ambiguousCandidates.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { addAssignee(c); setAmbiguousCandidates([]); }}
                  className={`${pageStyles.ambiguousButton} group`}
                >
                  <div>
                    <div className={pageStyles.ambiguousName}>{c.name}</div>
                    <span className={pageStyles.ambiguousTeam}>{c.team}</span>
                  </div>
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
              <button onClick={() => setIsTeamModalOpen(false)} className={pageStyles.iconButton}><X size={20}/></button>
            </div>
            <div className={pageStyles.teamModalBody}>
              {editingTeams.map((team, tIdx) => (
                <div key={team.id} className={pageStyles.teamCard}>
                  <div className={pageStyles.teamRow}>
                    <span className={pageStyles.teamLabel}>Team</span>
                    <input className={pageStyles.teamInput} value={team.name} onChange={(e) => updateTeamName(tIdx, e.target.value)} />
                    <button onClick={() => addMemberToTeam(tIdx)} className={pageStyles.teamAddMember}>+ 추가</button>
                    <button onClick={() => removeTeamCompletely(tIdx)} className={pageStyles.teamDeleteButton}>삭제</button>
                  </div>
                  <div className={pageStyles.memberList}>
                    {team.members.length === 0 ? <span className={pageStyles.emptyMembers}>구성원 없음</span> :
                      team.members.map((member, mIdx) => (
                        <div key={mIdx} className={pageStyles.memberChip}>
                          {member}
                          <button onClick={() => removeMember(tIdx, mIdx)} className={pageStyles.memberRemove}><X size={12}/></button>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
              <button onClick={addTeam} className={pageStyles.addTeamButton}><Plus size={16}/> 새 팀 추가</button>
            </div>
            <div className={pageStyles.teamModalFooter}>
              <button onClick={() => setIsTeamModalOpen(false)} className={pageStyles.footerCancel}>취소</button>
              <button onClick={saveTeams} className={pageStyles.footerSave}>저장하기</button>
            </div>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className={`${pageStyles.overlay} ${pageStyles.overlayHigh}`}>
          <div className={pageStyles.teamModal}>
            <div className={pageStyles.teamModalHeader}>
              <h3 className={pageStyles.teamModalTitle}>비밀번호 변경</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className={pageStyles.iconButton}>
                <X size={20} />
              </button>
            </div>
            <div className={pageStyles.stackCompact}>
              <label className={pageStyles.inputLabel}>현재 비밀번호</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className={pageStyles.teamInput}
                placeholder="현재 비밀번호"
              />
              <label className={pageStyles.inputLabel}>새 비밀번호</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className={pageStyles.teamInput}
                placeholder="새 비밀번호"
              />
              <label className={pageStyles.inputLabel}>새 비밀번호 확인</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className={pageStyles.teamInput}
                placeholder="새 비밀번호 확인"
              />
            </div>
            <div className={pageStyles.teamModalFooter}>
              <button onClick={() => setIsPasswordModalOpen(false)} className={pageStyles.footerCancel}>취소</button>
              <button onClick={handlePasswordChange} className={pageStyles.footerSave}>변경하기</button>
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
              <button onClick={() => setIsModalOpen(false)} className={pageStyles.editClose}><X size={24} /></button>
            </div>
            
        <div className={pageStyles.editBody}>
                {/* 1. Global Settings */}
                <div className={pageStyles.card}>
                    <h4 className={pageStyles.cardTitle}><Settings size={16} className={pageStyles.cardTitleIcon} /> 통합 설정 (Global)</h4>
                    <div className={pageStyles.settingsRow}>
                        <div className={pageStyles.settingsCol}>
                            <label className={pageStyles.inputLabel}>기간 설정</label>
                            <div className={pageStyles.dateRow}>
                                <input type="date" value={masterStart} onChange={(e) => setMasterStart(e.target.value)} className={pageStyles.dateInput}/>
                                <span className={pageStyles.dashMuted}>-</span>
                                <input type="date" value={masterEnd} onChange={(e) => setMasterEnd(e.target.value)} className={pageStyles.dateInput}/>
                            </div>
                        </div>
                        <button onClick={syncDatesToAll} className={pageStyles.syncButton}><RefreshCw size={14}/> 일정 동기화</button>
                    </div>
                    <div className={pageStyles.docRow}>
                      <div className={pageStyles.fullColStack}>
                        {masterAttachments.map((att, idx) => (
                          <div key={att.id} className={pageStyles.attachmentRow}>
                            <div className={pageStyles.attachmentTextCol}>
                              <label className={pageStyles.inputLabel}>파일 {idx + 1}</label>
                              <input
                                value={att.name}
                                readOnly
                                placeholder="파일을 업로드하면 이름이 표시됩니다"
                                className={`${pageStyles.docInput} ${pageStyles.docInputDisabled}`}
                              />
                            </div>
                            <div className={pageStyles.attachmentActionRow}>
                              <label className={pageStyles.docUpload}>
                                파일 선택
                                <input
                                  type="file"
                                  accept="*/*"
                                  multiple
                                  className={pageStyles.hiddenInput}
                                  onChange={(e) => uploadMasterAttachment(att.id, e.target.files)}
                                />
                              </label>
                              {(att.key || att.url) && <span className={pageStyles.attachmentKey}>{att.key || att.url}</span>}
                              <button
                                type="button"
                                onClick={() => openAttachment(att)}
                          className={pageStyles.inlineButtonPrimary}
                          disabled={!att.key && !att.url}
                        >
                          열기
                        </button>
                        <button
                          type="button"
                          onClick={() => clearMasterAttachment(att.id)}
                          className={pageStyles.inlineButtonGhost}
                        >
                          초기화
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMasterAttachment(att.id)}
                          className={pageStyles.milestoneRemove}
                          disabled={masterAttachments.length === 1}
                              >
                                -
                              </button>
                            </div>
                          </div>
                        ))}
                    
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
                    <span className={pageStyles.inlineDivider}>~</span>
                    <input type="date" value={masterMilestoneEnd || masterMilestoneDate} onChange={(e) => setMasterMilestoneEnd(e.target.value)} className={pageStyles.inlineInput} />
                    <button type="button" onClick={() => {
                      if (!masterMilestoneLabel || !masterMilestoneDate) return;
                      const end = masterMilestoneEnd || masterMilestoneDate;
                      const m: Milestone = { id: `${Date.now()}`, label: masterMilestoneLabel, date: masterMilestoneDate, end, color: getRandomHexColor() };
                      setMasterMilestones(prev => [...prev, m]);
                      setMasterMilestoneLabel(''); setMasterMilestoneDate(''); setMasterMilestoneEnd('');
                    }} className={pageStyles.primarySmall}>추가</button>
                  </div>
                  <div className={pageStyles.tagList}>
                    {masterMilestones.map(m => (
                      <span key={m.id} className={pageStyles.tag}>
                        <span className={pageStyles.inlineDot} style={{ backgroundColor: m.color }}></span>
                        <span className={pageStyles.tagLabel}>{m.label}</span>
                        <span className={pageStyles.tagDate}>{m.date}{m.end && m.end !== m.date ? ` ~ ${m.end}` : ''}</span>
                        <button onClick={() => setMasterMilestones(prev => prev.filter(x => x.id !== m.id))} className={pageStyles.tagRemove}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

        <div className={pageStyles.cardTight}>
                  <div className={pageStyles.vacationHeader}>
                    <h4 className={pageStyles.subTitle}>구성원 휴가</h4>
                    <button onClick={() => { void openVacationModal(); }} className={pageStyles.vacationButton}>휴가 관리</button>
                  </div>
                  {editingMembers.some(m => m.vacations && m.vacations.length) || vacations.length ? (
                    <div className={pageStyles.vacationList}>
                      {editingMembers.flatMap((m, idx) => (m.vacations || []).map((v, i) => (
                        <div key={`${idx}-${i}`} className={pageStyles.vacationItem}>
                          <span className={pageStyles.vacationPerson}>{v.person || m.person}</span>
                          <span className={pageStyles.vacationTeam}>{v.team || m.team}</span>
                          <span className={pageStyles.vacationRange}>{v.start} ~ {v.end}</span>
                          {v.label && <span className={pageStyles.vacationNote}>({v.label})</span>}
                        </div>
                      )))}
                      {vacations
                        .filter(v => editingMembers.some(m => (m.person || '').toLowerCase() === (v.person || '').toLowerCase()))
                        .map((v, i) => (
                          <div key={`global-${i}`} className={pageStyles.vacationItem}>
                            <span className={pageStyles.vacationPerson}>{v.person}</span>
                            <span className={pageStyles.vacationTeam}>{v.team}</span>
                            <span className={pageStyles.vacationRange}>{v.start} ~ {v.end}</span>
                            {v.label && <span className={pageStyles.vacationNote}>({v.label})</span>}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className={pageStyles.vacationEmpty}>등록된 휴가가 없습니다. 글로벌에서 등록하세요.</div>
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
                                                {isDiffDate && (<span className={pageStyles.memberDateAlert}><AlertCircle size={12} /></span>)}
                                            </div>
                                            <button onClick={() => removeMemberInModal(realIndex)} className={pageStyles.memberRemoveBtn}><Trash2 size={16}/></button>
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
                        <Search size={16} className={pageStyles.searchIcon} />
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
               {!deleteConfirmMode ? (<button onClick={() => setDeleteConfirmMode(true)} className={pageStyles.deleteLink}><Trash2 size={14} /> 전체 삭제</button>) : (<div className={pageStyles.deleteConfirm}><span className={pageStyles.deleteConfirmText}>정말 삭제할까요?</span><button onClick={handleDeleteAll} className={pageStyles.deleteYes}>네</button><button onClick={() => setDeleteConfirmMode(false)} className={pageStyles.deleteNo}>아니오</button></div>)}
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
                    <Briefcase size={24} className={pageStyles.titleIcon}/> Resource Gantt
                </h1>
                <p className={pageStyles.subtitle}>팀 리소스 및 프로젝트 일정 관리 (2025)</p>
                {sessionUser && (
                  <p className={pageStyles.roleBadge}>
                    {sessionUser.label || sessionUser.role} · {sessionUser.id}
                  </p>
                )}
            </div>
            <div className={pageStyles.headerButtons}>
                {canEdit && (
                  <>
                    <button
                      onClick={() => { void openVacationModal(); }}
                      className={`${pageStyles.teamButton} ${pageStyles.vacationAccent}`}
                      title="휴가 일정을 추가합니다."
                    >
                      휴가 입력
                    </button>
                    <button
                      onClick={openTeamModal}
                      className={`${pageStyles.teamButton} ${pageStyles.teamAccent}`}
                    >
                      <Settings size={16} /> 팀 설정
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className={`${pageStyles.teamButton} ${pageStyles.passwordAccent}`}
                >
                  비밀번호 변경
                </button>
                {role === 'admin' && (
                  <Link href="/admin/accounts" className={`${pageStyles.teamButton} ${pageStyles.accountAccent}`}>
                    계정 관리
                  </Link>
                )}
                <button onClick={handleLogout} className={pageStyles.logoutButton}><LogOut size={16} /></button>
            </div>
        </div>

        {banner && (
          <div className={`${pageStyles.banner} ${banner.tone === 'error' ? pageStyles.bannerError : banner.tone === 'info' ? pageStyles.bannerInfo : pageStyles.bannerSuccess}`}>
            <Check size={16} className={pageStyles.bannerIcon} />
            <span className={pageStyles.bannerText}>{banner.text}</span>
          </div>
        )}
        
        {/* Input Row */}
        {canEdit ? (
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
            attachments={projectAttachments}
            addAttachment={addProjectAttachment}
            removeAttachment={removeProjectAttachment}
            uploadAttachment={uploadProjectAttachment}
            onOpenAttachment={openAttachment}
            projectMilestones={projectMilestones}
            addProjectMilestone={addProjectMilestone}
            updateProjectMilestone={updateProjectMilestone}
            removeProjectMilestone={removeProjectMilestone}
          />
        ) : (
          <div className={pageStyles.readOnlyCard}>
            <p className={pageStyles.readOnlyTitle}>조회 전용 모드</p>
            <p className={pageStyles.readOnlyBody}>
              조회 전용 계정입니다. 수정이나 신규 등록이 필요하면 팀장에게 요청하세요.
            </p>
          </div>
        )}

        <VacationModal
          isOpen={isVacationModalOpen}
          onClose={() => setIsVacationModalOpen(false)}
          vacations={projectVacations}
          allVacations={combinedVacations}
          onChange={updateProjectVacation}
          onAdd={addProjectVacation}
          onRemove={handleVacationRemove}
          onSave={handleVacationSave}
          allAssignees={allMembers}
          defaultTab={vacationModalDefaultTab}
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

        <div className={pageStyles.tabBar}>
          <button
            className={`${pageStyles.tabButton} ${activeTab === 'gantt' ? pageStyles.tabActive : pageStyles.tabInactive}`}
            onClick={() => setActiveTab('gantt')}
          >
            간트 뷰
          </button>
          <button
            className={`${pageStyles.tabButton} ${activeTab === 'calendar' ? pageStyles.tabActive : pageStyles.tabInactive}`}
            onClick={() => setActiveTab('calendar')}
          >
            캘린더 뷰
          </button>
        </div>

        {activeTab === 'calendar' ? (
          <div className={pageStyles.calendarShell}>
            <CalendarView
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              teams={teams}
              selectedMembers={calendarSelectedMembers}
              onToggleTeam={toggleCalendarTeam}
              onToggleMember={toggleCalendarMember}
              onSelectAll={selectAllCalendarMembers}
              onClearAll={clearCalendarMembers}
              projects={projects}
              vacations={combinedVacations}
            />
          </div>
        ) : (
          <>
            {/* Chart Controls */}
            <ChartControls
              viewMode={viewMode}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
              onToday={handleJumpToToday}
              onViewChange={handleViewChange}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              canZoomIn={canZoomIn}
              canZoomOut={canZoomOut}
            />
          </>
        )}
      </div>

      {activeTab === 'gantt' && (
        <div className={pageStyles.ganttShell}>
          <GanttTable
            timeline={timeline}
            teams={teams}
            projects={projects}
            vacations={combinedVacations}
            viewMode={viewMode}
            chartContainerRef={chartContainerRef}
            todayColumnRef={todayColumnRef}
            rowRefs={rowRefs}
            hoveredProjectName={hoveredProjectName}
            setHoveredProjectName={setHoveredProjectName}
            handleProjectClick={handleProjectClick}
            chartTotalDays={chartTotalDays}
            weekCellWidth={weekCellWidth}
            dayCellWidth={dayCellWidth}
            onVacationClick={(vac) => {
              if (!canEdit) return;
              void openVacationModal({ tab: 'list' });
            }}
          />
        </div>
      )}
    </div>
  );
}
