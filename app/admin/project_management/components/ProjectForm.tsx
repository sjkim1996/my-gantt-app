import React from 'react';
import { Plus, X } from 'lucide-react';
import { Assignee, Milestone } from '../types';

type Props = {
  projectName: string;
  setProjectName: (v: string) => void;
  selectedAssignees: Assignee[];
  removeAssignee: (idx: number) => void;
  assigneeInput: string;
  setAssigneeInput: (v: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  mainSuggestions: Assignee[];
  addAssignee: (assignee: Assignee) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  projectStart: string;
  setProjectStart: (v: string) => void;
  projectEnd: string;
  setProjectEnd: (v: string) => void;
  handleAddProject: () => void;
  projectNotes: string;
  setProjectNotes: (v: string) => void;
  projectMilestones: Milestone[];
  addProjectMilestone: () => void;
  updateProjectMilestone: (id: string, field: 'label' | 'date', value: string) => void;
  removeProjectMilestone: (id: string) => void;
  onOpenVacationModal: () => void;
};

const ProjectForm: React.FC<Props> = ({
  projectName,
  setProjectName,
  selectedAssignees,
  removeAssignee,
  assigneeInput,
  setAssigneeInput,
  showSuggestions,
  setShowSuggestions,
  mainSuggestions,
  addAssignee,
  handleInputKeyDown,
  inputRef,
  projectStart,
  setProjectStart,
  projectEnd,
  setProjectEnd,
  handleAddProject,
  projectNotes,
  setProjectNotes,
  projectMilestones,
  addProjectMilestone,
  updateProjectMilestone,
  removeProjectMilestone,
  onOpenVacationModal,
}) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 w-full">
      <h2 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">프로젝트 추가</h2>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-3">
          <label className="block text-xs font-bold text-gray-400 mb-1">프로젝트명</label>
          <div className="h-10 flex items-center border border-gray-300 rounded px-3 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="프로젝트 이름"
              className="w-full bg-transparent outline-none text-sm text-gray-900"
            />
          </div>
        </div>
        <div className="md:col-span-5 relative z-50">
          <label className="block text-xs font-bold text-gray-400 mb-1">담당자</label>
          <div
            className="h-10 flex flex-wrap gap-1 items-center px-2 border border-gray-300 rounded bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all overflow-x-auto scrollbar-hide"
            onClick={() => inputRef.current?.focus()}
          >
            {selectedAssignees.map((assignee, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold animate-in zoom-in-95 duration-100 border border-indigo-100 whitespace-nowrap"
              >
                {assignee.name}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAssignee(idx);
                  }}
                  className="hover:text-indigo-900 transition-colors ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={assigneeInput}
              onChange={(e) => {
                setAssigneeInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onClick={(e) => {
                e.stopPropagation();
                setShowSuggestions(true);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={selectedAssignees.length === 0 ? '담당자 입력 (엔터)' : ''}
              className="flex-1 min-w-[100px] bg-transparent outline-none text-sm placeholder-gray-400 text-gray-900"
            />
          </div>
          {showSuggestions && assigneeInput && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[200px] w-full z-[60]">
              {mainSuggestions.length > 0 ? (
                mainSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      addAssignee(s);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center transition-colors"
                  >
                    <span className="font-bold text-gray-700">{s.name}</span>
                    <span className="text-gray-400 text-xs">{s.team}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-gray-400 text-center">엔터로 추가하기</div>
              )}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-400 mb-1">시작일</label>
          <div className="h-10 flex items-center border border-gray-300 rounded px-2 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
            <input type="date" value={projectStart} onChange={(e) => setProjectStart(e.target.value)} className="w-full bg-transparent outline-none text-sm text-gray-700" />
          </div>
        </div>
        <div className="md:col-span-2 flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-400 mb-1">종료일</label>
            <div className="h-10 flex items-center border border-gray-300 rounded px-2 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
              <input type="date" value={projectEnd} onChange={(e) => setProjectEnd(e.target.value)} className="w-full bg-transparent outline-none text-sm text-gray-700" />
            </div>
          </div>
          <button
            onClick={handleAddProject}
            className="h-10 w-10 bg-indigo-600 text-white rounded flex items-center justify-center hover:bg-indigo-700 transition-all shadow-sm flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="md:col-span-12 mt-2">
          <label className="block text-xs font-bold text-gray-400 mb-1">간단 메모</label>
          <input
            type="text"
            value={projectNotes}
            onChange={(e) => setProjectNotes(e.target.value)}
            placeholder="메모를 남겨보세요 (선택사항)"
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="md:col-span-12 space-y-2">
          <label className="block text-xs font-bold text-gray-400">특이 스케줄 (시사일/PPM 등)</label>
          <div className="flex flex-col gap-2">
            {projectMilestones.map((m, idx) => (
              <div key={m.id} className="flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  value={m.label}
                  onChange={(e) => updateProjectMilestone(m.id, 'label', e.target.value)}
                  placeholder={`특이 스케줄 ${idx + 1} 입력`}
                  className="flex-1 min-w-[140px] border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <input
                  type="date"
                  value={m.date}
                  onChange={(e) => updateProjectMilestone(m.id, 'date', e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <button type="button" onClick={addProjectMilestone} className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700">
                  +
                </button>
                <button type="button" onClick={() => removeProjectMilestone(m.id)} className="px-3 py-2 bg-gray-100 text-gray-500 text-xs font-bold rounded hover:bg-gray-200">
                  ′
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-12">
          <button
            type="button"
            onClick={onOpenVacationModal}
            className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded hover:bg-gray-200 border border-gray-300"
          >
            구성원 휴가 입력
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectForm;
