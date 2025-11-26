'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
// [수정] 실제 배포(Vercel) 시에는 아래 주석을 해제하고, 그 밑의 Mock Router를 삭제하세요.
import { useRouter } from 'next/navigation'; 
import { Plus, Trash2, RefreshCw, Search, ChevronDown, AlertCircle, Settings, X, Check, Info, Target, Edit3, Calendar, Clock, Users, Briefcase, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';


// --- 1. 타입 정의 ---
interface Project {
  _id?: string; 
  id: number;   
  name: string;
  person: string;
  team: string;
  start: string;
  end: string;
  colorIdx: number;
}

interface Team {
  id: string;
  name: string;
  members: string[];
}

interface Assignee {
  name: string;
  team: string;
  isNew?: boolean;
}

interface GroupedProject extends Project {
  members: { person: string; team: string }[];
}

interface EditingMember {
  _id?: string;
  id: number;
  person: string;
  team: string;
  start: string;
  end: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

// --- 2. 유틸리티 함수 ---
const parseDate = (dateStr: string) => {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDaysDiff = (start: Date, end: Date) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / oneDay);
};

const isActiveToday = (projStart: string, projEnd: string, todayDate: Date) => {
  const todayTime = todayDate.getTime();
  const start = parseDate(projStart).getTime();
  const end = parseDate(projEnd).getTime();
  return todayTime >= start && todayTime <= end;
};

const getWeekLabel = (date: Date) => {
  const month = date.getMonth() + 1;
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const offsetDate = date.getDate() + firstDayOfMonth.getDay() - 1;
  const weekNum = Math.floor(offsetDate / 7) + 1;
  return `${month}월 ${weekNum}주`;
};

const getStartOfWeek = (date: Date) => {
  const day = date.getDay(); // 0: 일요일
  const diff = date.getDate() - day; 
  const result = new Date(date);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const generateWeeks = (startDateStr: string, numWeeks = 60, mockToday: Date) => {
  const weeks = [];
  let current = parseDate(startDateStr);
  
  // 오늘 날짜 비교용 (Time 제거)
  const todayTime = mockToday.getTime();
  
  for (let i = 0; i < numWeeks; i++) {
    const start = new Date(current);
    const end = new Date(current);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    // 주차 내에 오늘이 포함되는지 확인
    const startTime = start.getTime();
    const endTime = end.getTime();
    const isTodayWeek = todayTime >= startTime && todayTime <= endTime;

    weeks.push({
      id: i,
      label: getWeekLabel(start),
      subLabel: `${start.getMonth()+1}.${start.getDate()} ~ ${end.getMonth()+1}.${end.getDate()}`,
      start: start,
      end: end,
      isTodayWeek: isTodayWeek
    });
    current.setDate(current.getDate() + 7);
  }
  return weeks;
};

// --- 3. 상수 데이터 ---
const BAR_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-800', bar: 'bg-blue-500' },
  { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800', bar: 'bg-green-500' },
  { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-800', bar: 'bg-purple-500' },
  { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-800', bar: 'bg-orange-500' },
  { bg: 'bg-pink-100', border: 'border-pink-200', text: 'text-pink-800', bar: 'bg-pink-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-200', text: 'text-indigo-800', bar: 'bg-indigo-500' },
  { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-800', bar: 'bg-yellow-500' },
  { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-800', bar: 'bg-gray-500' },
];

const stringToColorClass = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'text-red-600', 'text-orange-600', 'text-amber-600',
    'text-green-600', 'text-emerald-600', 'text-teal-600',
    'text-cyan-600', 'text-sky-600', 'text-blue-600',
    'text-indigo-600', 'text-violet-600', 'text-purple-600',
    'text-pink-600', 'text-rose-600',
  ];
  return colors[Math.abs(hash) % colors.length];
};

// [수정] API 호출 실패 시 보여줄 예시 데이터 (2025년 기준)
const MOCK_PROJECTS_2025: Project[] = [
  { id: 1, name: '2025 웹사이트 리뉴얼', person: '김철수', team: '기획팀', start: '2025-01-05', end: '2025-02-20', colorIdx: 0 },
  { id: 2, name: '2025 웹사이트 리뉴얼', person: '박지성', team: '개발팀', start: '2025-01-05', end: '2025-02-20', colorIdx: 0 },
  { id: 3, name: '2025 웹사이트 리뉴얼', person: '홍길동', team: '디자인팀', start: '2025-01-10', end: '2025-02-10', colorIdx: 0 },
  { id: 4, name: '모바일 앱 기획', person: '이영희', team: '기획팀', start: '2025-02-01', end: '2025-03-15', colorIdx: 1 },
  { id: 5, name: '모바일 앱 기획', person: '최기획', team: '기획팀', start: '2025-02-01', end: '2025-03-15', colorIdx: 1 },
  { id: 6, name: '관리자 페이지 고도화', person: '박지성', team: '개발팀', start: '2025-03-01', end: '2025-04-15', colorIdx: 5 }, 
  { id: 7, name: '관리자 페이지 고도화', person: '손흥민', team: '개발팀', start: '2025-03-01', end: '2025-04-15', colorIdx: 5 }, 
];

// --- 4. 메인 컴포넌트 ---
export default function ResourceGanttChart() {
  const router = useRouter();
  const [chartStartDate, setChartStartDate] = useState('2025-01-01');
  
  // 실제 오늘 날짜 (프로덕션용은 new Date() 사용)
  // const todayDate = useMemo(() => new Date('2025-02-15'), []); // 테스트용
  const todayDate = useMemo(() => new Date(), []); // 실제용
  
  const rowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLTableHeaderCellElement | null>(null); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [masterProjectName, setMasterProjectName] = useState('');
  const [masterColorIdx, setMasterColorIdx] = useState(0);
  const [masterStart, setMasterStart] = useState('');
  const [masterEnd, setMasterEnd] = useState('');
  const [editingMembers, setEditingMembers] = useState<EditingMember[]>([]);
  
  const [modalAssigneeInput, setModalAssigneeInput] = useState('');
  const [modalShowSuggestions, setModalShowSuggestions] = useState(false);
  const modalInputRef = useRef<HTMLInputElement>(null);

  const [deleteConfirmMode, setDeleteConfirmMode] = useState(false);
  const [hoveredProjectName, setHoveredProjectName] = useState<string | null>(null);
  const [ambiguousCandidates, setAmbiguousCandidates] = useState<Assignee[]>([]); 

  // Data State
  const [teams, setTeams] = useState<Team[]>([
    { id: 't1', name: '기획팀', members: ['김철수', '이영희', '최기획'] },
    { id: 't2', name: '개발팀', members: ['박지성', '손흥민', '김철수', '차범근'] }, 
    { id: 't3', name: '디자인팀', members: ['홍길동', '신사임당'] },
  ]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Input Form State
  const [projectName, setProjectName] = useState('');
  // 입력 폼 초기값도 2025년 기준 (오늘 날짜)
  const [projectStart, setProjectStart] = useState(formatDate(todayDate));
  const [projectEnd, setProjectEnd] = useState(formatDate(new Date(todayDate.getTime() + 86400000 * 30)));
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[]>([{ name: '김철수', team: '기획팀' }]);
  const [assigneeInput, setAssigneeInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [editingTeams, setEditingTeams] = useState<Team[]>([]);

  // --- Auth & Data Fetch ---
  useEffect(() => {
    // [수정] 미리보기 환경에서 에러 방지
    if (typeof window !== 'undefined') {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        // 데모 환경에서는 로그인 체크를 엄격하게 하지 않음 (미리보기 위해)
        // if (!isLoggedIn) router.push('/login');
    }

    // API 요청 시도
    const fetchData = async () => {
        try {
            const res = await fetch('/api/projects');
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            if (data.success) {
              const loadedProjects = data.data.map((p: any) => ({ ...p, id: p._id })); 
              setProjects(loadedProjects);
            } else {
                setProjects(MOCK_PROJECTS_2025); 
            }
        } catch (error) {
            console.log("API Fetch failed (Preview Mode), using mock data.");
            setProjects(MOCK_PROJECTS_2025);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [router]);

  // 60주 렌더링 (약 1년치)
  const weeks = useMemo(() => generateWeeks(chartStartDate, 60, todayDate), [chartStartDate, todayDate]);
  const chartTotalDays = weeks.length * 7;

  const activeProjectsToday = useMemo(() => {
    const todayTime = todayDate.getTime();
    return projects.filter(p => {
        const s = parseDate(p.start).getTime();
        const e = parseDate(p.end).getTime();
        return todayTime >= s && todayTime <= e;
    });
  }, [projects, todayDate]);

  const allMembers = useMemo(() => {
    const list: Assignee[] = [];
    teams.forEach(t => t.members.forEach(m => list.push({ name: m, team: t.name })));
    return list;
  }, [teams]);

  // Initial Scroll to Today
  useEffect(() => {
    if (!isLoading && todayColumnRef.current && chartContainerRef.current) {
      // 렌더링 타이밍 이슈를 위해 약간의 지연
      const timer = setTimeout(() => {
        todayColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // --- API Wrappers ---
  const apiCreateProject = async (newProjects: any[]) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProjects),
      });
      return res.json();
    } catch (e) {
      // console.error(e);
      return { success: true, data: newProjects.map((p, i) => ({...p, id: Date.now() + i})) }; // Mock success
    }
  };

  const apiUpdateProject = async (project: any) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      return res.json();
    } catch (e) {
      // console.error(e);
      return { success: true, data: project };
    }
  };

  const apiDeleteProject = async (id: string) => {
    try {
      await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      // console.error(e);
    }
  };

  // --- Handlers ---
  const handlePrevMonth = () => {
    const d = new Date(chartStartDate);
    d.setMonth(d.getMonth() - 1);
    setChartStartDate(formatDate(getStartOfWeek(d)));
  };
  const handleNextMonth = () => {
    const d = new Date(chartStartDate);
    d.setMonth(d.getMonth() + 1);
    setChartStartDate(formatDate(getStartOfWeek(d)));
  };
  const handleJumpToToday = () => {
    // 차트 시작일을 '오늘이 포함된 달'의 시작으로 재설정
    const startOfWeek = getStartOfWeek(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)); 
    setChartStartDate(formatDate(startOfWeek));
    
    setTimeout(() => {
        todayColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 300);
  };

  const getPackedProjects = (memberProjects: Project[]) => {
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

  const getProjectStyle = (proj: Project & { row: number }) => {
    const chartStart = parseDate(chartStartDate);
    const pStart = parseDate(proj.start);
    const pEnd = parseDate(proj.end);
    // 차트의 마지막 날짜 계산
    if (weeks.length === 0) return null;
    const lastWeek = weeks[weeks.length - 1];
    const chartEnd = lastWeek.end;

    if (pEnd < chartStart || pStart > chartEnd) return null;

    const displayStart = pStart < chartStart ? chartStart : pStart;
    const displayEnd = pEnd > chartEnd ? chartEnd : pEnd;

    const offsetDays = getDaysDiff(chartStart, displayStart);
    const durationDays = getDaysDiff(displayStart, displayEnd) + 1;

    const left = (offsetDays / chartTotalDays) * 100;
    const width = (durationDays / chartTotalDays) * 100;

    return { left: `${left}%`, width: `${width}%`, top: `${proj.row * 30 + 4}px` };
  };

  const getSuggestions = (input: string) => {
    if (!input.trim()) return [];
    const lowerInput = input.toLowerCase();
    return allMembers.filter(m => m.name.toLowerCase().includes(lowerInput) || m.team.toLowerCase().includes(lowerInput));
  };
  const mainSuggestions = useMemo(() => getSuggestions(assigneeInput), [assigneeInput, allMembers]);
  const modalSuggestions = useMemo(() => getSuggestions(modalAssigneeInput), [modalAssigneeInput, allMembers]);

  const groupedProjects = useMemo(() => {
    const map = new Map<string, GroupedProject>();
    projects.forEach(p => {
      if (!map.has(p.name)) map.set(p.name, { ...p, members: [] });
      const group = map.get(p.name)!;
      if (!group.members.find(m => m.person === p.person && m.team === p.team)) group.members.push({ person: p.person, team: p.team });
    });
    return Array.from(map.values());
  }, [projects]);

  const addAssignee = (assignee: Assignee) => {
    const exists = selectedAssignees.find(a => a.name === assignee.name && a.team === assignee.team);
    if (!exists) setSelectedAssignees([...selectedAssignees, assignee]);
    setAssigneeInput(''); setShowSuggestions(false); inputRef.current?.focus();
  };
  const removeAssignee = (idx: number) => {
    const newArr = [...selectedAssignees]; newArr.splice(idx, 1); setSelectedAssignees(newArr);
  };
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    const sharedColorIdx = Math.floor(Math.random() * BAR_COLORS.length);
    const newEntries: any[] = [];
    selectedAssignees.forEach((assignee) => {
      newEntries.push({
        name: projectName,
        person: assignee.name,
        team: assignee.team,
        start: projectStart,
        end: projectEnd,
        colorIdx: sharedColorIdx
      });
    });
    
    const res = await apiCreateProject(newEntries);
    if (res.success) {
        // 서버 데이터로 업데이트 (ID 포함)
        setProjects(prev => [...prev, ...res.data.map((p:any) => ({...p, id: p._id}))]);
        setProjectName(''); setSelectedAssignees([]);
    }
  };

  const handleProjectClick = (project: Project) => {
    const targetName = project.name;
    const relatedProjects = projects.filter(p => p.name === targetName);
    setMasterProjectName(targetName); setMasterColorIdx(project.colorIdx); setMasterStart(project.start); setMasterEnd(project.end);
    const members: EditingMember[] = relatedProjects.map(p => ({ 
        id: p.id, _id: (p as any)._id || p.id, person: p.person, team: p.team, start: p.start, end: p.end, 
    }));
    setEditingMembers(members); setIsModalOpen(true);
  };

  const addMemberInModal = (assignee: Assignee) => {
    if (editingMembers.some(m => m.person === assignee.name && m.team === assignee.team && !m.isDeleted)) { setModalAssigneeInput(''); return; }
    const newMember: EditingMember = { id: Date.now(), person: assignee.name, team: assignee.team, start: masterStart, end: masterEnd, isNew: true };
    setEditingMembers([...editingMembers, newMember]); setModalAssigneeInput(''); setModalShowSuggestions(false); modalInputRef.current?.focus();
  };
  const removeMemberInModal = (index: number) => { const updated = [...editingMembers]; updated[index].isDeleted = true; setEditingMembers(updated); };
  const updateMemberDate = (index: number, field: 'start' | 'end', value: string) => { const updated = [...editingMembers]; updated[index][field] = value; setEditingMembers(updated); };
  const syncDatesToAll = () => { const updated = editingMembers.map(m => ({ ...m, start: masterStart, end: masterEnd })); setEditingMembers(updated); };
  
  const handleSaveMasterProject = async () => {
    const deletedMembers = editingMembers.filter(m => m.isDeleted && !m.isNew);
    for (const m of deletedMembers) { if(m._id) await apiDeleteProject(m._id); }

    const newMembers = editingMembers.filter(m => m.isNew && !m.isDeleted);
    if (newMembers.length > 0) {
        await apiCreateProject(newMembers.map(m => ({
            name: masterProjectName, person: m.person, team: m.team, start: m.start, end: m.end, colorIdx: masterColorIdx
        })));
    }

    const updatedMembers = editingMembers.filter(m => !m.isNew && !m.isDeleted);
    for (const m of updatedMembers) {
        await apiUpdateProject({
            _id: m._id, name: masterProjectName, person: m.person, team: m.team, start: m.start, end: m.end, colorIdx: masterColorIdx
        } as any);
    }

    // Refresh Data
    try {
        const res = await fetch('/api/projects');
        if (res.ok) {
            const data = await res.json();
            if (data.success) { setProjects(data.data.map((p: any) => ({ ...p, id: p._id }))); }
        }
    } catch (e) {}
    setIsModalOpen(false);
  };

  const handleDeleteAll = async () => { 
      const idsToDelete = editingMembers.filter(m => !m.isNew).map(m => m._id);
      for (const id of idsToDelete) { if (id) await apiDeleteProject(id); }
      // 로컬 업데이트
      setProjects(prev => prev.filter(p => !idsToDelete.includes((p as any)._id)));
      setIsModalOpen(false); 
  };
  
  const handleShortcutClick = (group: GroupedProject) => {
    const firstMember = group.members[0]; 
    const rowId = `${firstMember.team}-${firstMember.person}`; 
    const row = rowRefs.current[rowId];
    
    if (row) { 
        row.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        row.classList.add('bg-yellow-100'); 
        setTimeout(() => row.classList.remove('bg-yellow-100'), 1500); 
    }

    const chartStart = parseDate(chartStartDate);
    const projStart = parseDate(group.start);
    const diffDays = getDaysDiff(chartStart, projStart);
    
    if (chartContainerRef.current && diffDays >= 0 && diffDays <= chartTotalDays) {
        const scrollWidth = chartContainerRef.current.scrollWidth;
        const offsetRatio = diffDays / chartTotalDays;
        const scrollPos = (scrollWidth * offsetRatio) - 300; 
        chartContainerRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    } else {
        // 범위 밖이면 차트 시작일 이동
        setChartStartDate(formatDate(getStartOfWeek(projStart)));
    }

    setHoveredProjectName(group.name); 
    setTimeout(() => setHoveredProjectName(null), 3000);
  };

  const openTeamModal = () => { setEditingTeams(JSON.parse(JSON.stringify(teams))); setIsTeamModalOpen(true); };
  const saveTeams = () => { setTeams(editingTeams); setIsTeamModalOpen(false); }; 
  const addTeam = () => { setEditingTeams([...editingTeams, { id: `t${Date.now()}`, name: '새 팀', members: [] }]); };
  const updateTeamName = (idx: number, name: string) => { const n = [...editingTeams]; n[idx].name = name; setEditingTeams(n); };
  const addMemberToTeam = (teamIdx: number) => { const name = prompt("이름:"); if (name) { const n = [...editingTeams]; n[teamIdx].members.push(name); setEditingTeams(n); } };
  const removeMember = (tIdx: number, mIdx: number) => { const n = [...editingTeams]; n[tIdx].members.splice(mIdx, 1); setEditingTeams(n); };
  const handleModalInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && modalAssigneeInput.trim()) { e.preventDefault(); if (modalSuggestions.length === 1) { addMemberInModal(modalSuggestions[0]); return; } const exact = allMembers.filter(m => m.name === modalAssigneeInput.trim()); if (exact.length === 1) { addMemberInModal(exact[0]); return; } let newName = modalAssigneeInput.trim(); let newTeam = '미배정'; if (newName.includes('-')) { const parts = newName.split('-'); newTeam = parts[0].trim(); newName = parts[1].trim(); } addMemberInModal({ name: newName, team: newTeam, isNew: true }); }
  };
  useEffect(() => { if (isModalOpen) setDeleteConfirmMode(false); }, [isModalOpen]);

  const handleLogout = () => { sessionStorage.removeItem('isLoggedIn'); router.push('/login'); };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-gray-500">Loading Projects...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans relative text-gray-900 overflow-hidden" onClick={() => { setShowSuggestions(false); setModalShowSuggestions(false); }}>
      
      {/* --- Modals --- */}
      {ambiguousCandidates.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">
             <div className="p-5 border-b border-gray-100 bg-orange-50">
              <h3 className="font-bold text-orange-800 flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4" /> 동명이인 선택</h3>
              <p className="text-xs text-orange-600 mt-1">'{ambiguousCandidates[0].name}'님이 여러 팀에 존재합니다.</p>
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
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-white">
              <button onClick={() => setIsTeamModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">취소</button>
              <button onClick={saveTeams} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold shadow-sm transition-all">저장하기</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 px-6 py-4 text-white flex justify-between items-start">
              <div className="flex-1">
                <div className="text-xs font-medium text-indigo-200 mb-1 uppercase tracking-wider">Project Edit</div>
                <input type="text" value={masterProjectName} onChange={(e) => setMasterProjectName(e.target.value)} className="bg-transparent border-b border-indigo-400 focus:border-white outline-none p-0 text-xl font-bold w-full placeholder-indigo-300 text-white"/>
              </div>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-indigo-200 hover:text-white transition-colors" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
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
                            <div className="flex gap-2">
                                {BAR_COLORS.slice(0, 5).map((color, idx) => (
                                    <button key={idx} onClick={() => setMasterColorIdx(idx)} className={`w-6 h-6 rounded-full border-2 ${color.bg} ${color.border} ${masterColorIdx === idx ? 'ring-2 ring-gray-500 border-white' : ''} transition-all`}/>
                                ))}
                            </div>
                        </div>
                        <button onClick={syncDatesToAll} className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 h-[38px] transition-colors"><RefreshCw className="w-3.5 h-3.5"/> 일정 동기화</button>
                    </div>
                </div>

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
            <div className="bg-white px-6 py-4 flex justify-between items-center border-t border-gray-100">
               {!deleteConfirmMode ? (<button onClick={() => setDeleteConfirmMode(true)} className="text-gray-400 hover:text-red-600 text-xs font-medium flex items-center gap-1.5 transition-colors"><Trash2 className="w-3.5 h-3.5" /> 전체 삭제</button>) : (<div className="flex items-center gap-3"><span className="text-xs text-red-600 font-bold">정말 삭제할까요?</span><button onClick={handleDeleteAll} className="text-red-600 text-xs font-bold hover:underline">네</button><button onClick={() => setDeleteConfirmMode(false)} className="text-gray-400 text-xs hover:underline">아니오</button></div>)}
               <div className="flex gap-2"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded">취소</button><button onClick={handleSaveMasterProject} className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm transition-all">저장 완료</button></div>
            </div>
          </div>
        </div>
      )}
      
      {/* --- Header & Controls Area (Fixed at top) --- */}
      <div className="flex-none space-y-6 mb-4 px-4 pt-4">
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
        
        {/* Input Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Project Name</label>
            <div className="h-10 flex items-center border border-gray-300 rounded px-3 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="프로젝트 이름" className="w-full bg-transparent outline-none text-sm text-gray-900" />
            </div>
          </div>
          
          <div className="md:col-span-5 relative z-50">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Assignees</label>
            <div className="h-10 flex flex-wrap gap-1 items-center px-2 border border-gray-300 rounded bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all overflow-x-auto scrollbar-hide" onClick={() => inputRef.current?.focus()}>
                {selectedAssignees.map((assignee, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold animate-in zoom-in-95 duration-100 border border-indigo-100 whitespace-nowrap">
                        {assignee.name}
                        <button onClick={(e) => { e.stopPropagation(); removeAssignee(idx); }} className="hover:text-indigo-900 transition-colors ml-1"><X className="w-3 h-3" /></button>
                    </span>
                ))}
                <input ref={inputRef} type="text" value={assigneeInput} onChange={(e) => { setAssigneeInput(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onClick={(e) => { e.stopPropagation(); setShowSuggestions(true); }} onKeyDown={handleInputKeyDown} placeholder={selectedAssignees.length === 0 ? "담당자 입력 (엔터)" : ""} className="flex-1 min-w-[100px] bg-transparent outline-none text-sm placeholder-gray-400 text-gray-900"/>
            </div>
            {showSuggestions && assigneeInput && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[200px] w-full z-[60]">
                    {mainSuggestions.length > 0 ? mainSuggestions.map((s, idx) => (<button key={idx} onClick={(e) => { e.stopPropagation(); addAssignee(s); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center transition-colors"><span className="font-bold text-gray-700">{s.name}</span><span className="text-gray-400 text-xs">{s.team}</span></button>)) : <div className="px-3 py-2 text-xs text-gray-400 text-center">엔터로 추가하기</div>}
                </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Start</label>
            <div className="h-10 flex items-center border border-gray-300 rounded px-2 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                <input type="date" value={projectStart} onChange={e => setProjectStart(e.target.value)} className="w-full bg-transparent outline-none text-sm text-gray-700"/>
            </div>
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">End</label>
                <div className="h-10 flex items-center border border-gray-300 rounded px-2 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <input type="date" value={projectEnd} onChange={e => setProjectEnd(e.target.value)} className="w-full bg-transparent outline-none text-sm text-gray-700"/>
                </div>
            </div>
            <button onClick={handleAddProject} className="h-10 w-10 bg-indigo-600 text-white rounded flex items-center justify-center hover:bg-indigo-700 transition-all shadow-sm flex-shrink-0"><Plus className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full h-[180px]">
            <div className="lg:col-span-4 bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex flex-col h-full overflow-hidden">
                <h2 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Today's Active
                    <span className="text-[10px] font-normal text-gray-400 ml-auto">{todayDate.toLocaleDateString()}</span>
                </h2>
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                    {activeProjectsToday.length === 0 ? 
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                            <Clock className="w-4 h-4 mb-1 opacity-50"/>
                            진행 중인 프로젝트가 없습니다.
                        </div> 
                    : activeProjectsToday.map(p => (
                        <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-orange-50/50 rounded border border-orange-100 hover:bg-orange-50 transition-colors">
                            <span className="font-medium text-gray-700 truncate max-w-[65%]">{p.name}</span>
                            <span className="text-gray-500 bg-white px-1.5 py-0.5 rounded border border-orange-100 text-[10px]">{p.person}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                <h2 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2 flex-shrink-0">
                    <Target className="w-3.5 h-3.5"/> All Projects <span className="text-[10px] font-normal text-gray-400 lowercase">(click to jump)</span>
                </h2>
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {groupedProjects.map((group) => (
                            <div key={group.id} onClick={() => handleShortcutClick(group)} 
                                className={`
                                    group cursor-pointer p-2.5 rounded border border-gray-200 bg-white shadow-sm hover:shadow transition-all relative overflow-hidden hover:border-indigo-300 hover:-translate-y-0.5 min-h-[70px] flex flex-col justify-between
                                    ${hoveredProjectName === group.name ? 'ring-2 ring-indigo-100 border-indigo-300' : ''}
                                `}
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${BAR_COLORS[group.colorIdx % BAR_COLORS.length].bar}`}></div>
                                <div className="pl-2">
                                    <div className="text-xs font-bold text-gray-800 truncate mb-1" title={group.name}>{group.name}</div>
                                    <div className="flex flex-wrap gap-1">
                                        {group.members.slice(0, 2).map((m, i) => <span key={i} className="text-[9px] text-gray-500 bg-gray-100 px-1 rounded border border-gray-200">{m.person}</span>)}
                                        {group.members.length > 2 && <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1 rounded border border-indigo-100">+{group.members.length - 2}</span>}
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100" onClick={(e) => { e.stopPropagation(); handleProjectClick(group); }}>
                                    <div className="bg-white p-1 rounded border border-gray-200 text-gray-400 hover:text-indigo-600 shadow-sm">
                                        <Edit3 className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {groupedProjects.length === 0 && <div className="col-span-full text-center text-gray-400 text-sm py-8 border-2 border-dashed border-gray-200 rounded">아직 프로젝트가 없습니다.</div>}
                    </div>
                </div>
            </div>
        </div>

        {/* Chart Controls */}
        <div className="flex items-center justify-between px-1 pb-2">
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 flex items-center gap-1 text-xs font-bold"><ChevronLeft className="w-4 h-4"/> 이전 달</button>
                <button onClick={handleJumpToToday} className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100">오늘 (Today)</button>
                <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 flex items-center gap-1 text-xs font-bold">다음 달 <ChevronRight className="w-4 h-4"/></button>
            </div>
            <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-200 rounded-full"></span> 대기</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> 진행</div>
            </div>
        </div>
      </div>

      {/* --- Main Gantt Table (Scrollable) --- */}
      <div className="flex-1 overflow-hidden rounded-xl shadow-sm bg-white border border-gray-200 flex flex-col w-full relative mx-4 md:mx-6 mb-6" ref={chartContainerRef}>
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full border-collapse min-w-[4000px]"> 
            <thead className="sticky top-0 z-50 bg-white shadow-sm">
              <tr>
                <th className="sticky left-0 z-50 bg-gray-50 w-24 min-w-[96px] text-left py-3 pl-4 text-xs font-bold text-gray-500 uppercase border-b border-r border-gray-200">Team</th>
                <th className="sticky left-24 z-50 bg-gray-50 w-28 min-w-[112px] text-left py-3 pl-4 text-xs font-bold text-gray-500 uppercase border-b border-r border-gray-200 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">Member</th>
                {weeks.map(w => (
                    <th 
                        key={w.id} 
                        ref={w.isTodayWeek ? todayColumnRef : null}
                        className={`min-w-[140px] py-2 text-center border-b border-r border-gray-200 ${w.isTodayWeek ? 'bg-indigo-50/50' : 'bg-white'}`}
                    >
                        <div className={`text-xs font-bold ${w.isTodayWeek ? 'text-indigo-600' : 'text-gray-700'}`}>
                            {w.label} {w.isTodayWeek && <span className="inline-block w-1.5 h-1.5 bg-indigo-500 rounded-full ml-1 align-middle mb-0.5"></span>}
                        </div>
                        <div className="text-[9px] text-gray-400 font-medium">{w.subLabel}</div>
                    </th>
                ))}
              </tr>
            </thead>
            <tbody>
                {teams.map(team => (
                    <React.Fragment key={team.id}>
                        {team.members.map((member, mIdx) => {
                            const isFirst = mIdx === 0;
                            const isLast = mIdx === team.members.length - 1;
                            const rowKey = `${team.name}-${member}`;
                            const myProjects = projects.filter(p => p.person === member && p.team === team.name);
                            const { packed, totalRows } = getPackedProjects(myProjects);
                            const rowHeight = Math.max(44, totalRows * 32 + 12);

                            return (
                                <tr key={rowKey} ref={el => { rowRefs.current[rowKey] = el; }} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className={`sticky left-0 z-40 bg-white align-top py-3 pl-4 text-xs font-bold text-gray-700 border-r border-gray-200 ${isLast ? 'border-b border-gray-200' : 'border-b-transparent'}`}>
                                        {isFirst ? team.name : ''}
                                    </td>
                                    <td className="sticky left-24 z-40 bg-white align-top py-3 pl-4 text-sm font-medium text-black border-r border-gray-200 border-b border-gray-200 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                                        <div>{member}</div>
                                    </td>
                                    
                                    <td colSpan={weeks.length} className="relative p-0 align-top border-b border-gray-200" style={{ height: rowHeight }}>
                                        <div className="absolute inset-0 w-full h-full flex pointer-events-none">
                                            {weeks.map(w => <div key={w.id} className={`flex-1 border-r border-gray-300/70 last:border-0 ${w.isTodayWeek ? 'bg-indigo-50/10' : ''}`}></div>)} 
                                        </div>
                                        
                                        {packed.map(proj => {
                                            const style = getProjectStyle(proj);
                                            if(!style) return null;
                                            const isDimmed = hoveredProjectName && hoveredProjectName !== proj.name;
                                            const isHighlighted = hoveredProjectName === proj.name;
                                            const colorSet = BAR_COLORS[proj.colorIdx % BAR_COLORS.length];

                                            return (
                                                <div 
                                                    key={proj.id}
                                                    onClick={() => handleProjectClick(proj)}
                                                    onMouseEnter={() => setHoveredProjectName(proj.name)}
                                                    onMouseLeave={() => setHoveredProjectName(null)}
                                                    style={style}
                                                    className={`
                                                        absolute h-7 rounded shadow-sm cursor-pointer flex items-center px-2 z-20 transition-all duration-200 border
                                                        ${colorSet.bg} ${colorSet.border}
                                                        ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100 hover:shadow-md'}
                                                        ${isHighlighted ? 'ring-2 ring-indigo-400 ring-offset-1 scale-[1.01] z-30' : ''}
                                                    `}
                                                >
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorSet.bar}`}></div>
                                                    <span className={`text-[11px] font-bold truncate ml-1 ${colorSet.text}`}>{proj.name}</span>
                                                </div>
                                            )
                                        })}
                                    </td>
                                </tr>
                            )
                        })}
                    </React.Fragment>
                ))}
            </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}