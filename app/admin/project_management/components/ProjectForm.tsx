import React from 'react';
import { Plus, X } from 'lucide-react';
import { Assignee, Milestone } from '../types';
import { handlePdfUpload } from '@/lib/pdfUpload';
import styles from '../styles/ProjectForm.module.css';

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
  projectDocUrl: string;
  setProjectDocUrl: (v: string) => void;
  projectDocName: string;
  setProjectDocName: (v: string) => void;
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
  projectDocUrl,
  setProjectDocUrl,
  projectDocName,
  setProjectDocName,
  projectMilestones,
  addProjectMilestone,
  updateProjectMilestone,
  removeProjectMilestone,
  onOpenVacationModal,
}) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>프로젝트 추가</h2>
      <div className={styles.grid}>
        <div className={styles.col3}>
          <label className={styles.label}>프로젝트명</label>
          <div className={styles.inputShell}>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="프로젝트 이름"
              className={styles.textInput}
            />
          </div>
        </div>
        <div className={`${styles.col5} relative z-50`}>
          <label className={styles.label}>담당자</label>
          <div
            className={styles.assigneeShell}
            onClick={() => inputRef.current?.focus()}
          >
            {selectedAssignees.map((assignee, idx) => (
              <span
                key={idx}
                className={styles.chip}
              >
                {assignee.name}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAssignee(idx);
                  }}
                  className={styles.chipRemove}
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
              className={styles.assigneeInput}
            />
          </div>
          {showSuggestions && assigneeInput && (
            <div className={styles.suggestions}>
              {mainSuggestions.length > 0 ? (
                mainSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      addAssignee(s);
                    }}
                    className={styles.suggestionButton}
                  >
                    <span className={styles.suggestionName}>{s.name}</span>
                    <span className={styles.suggestionTeam}>{s.team}</span>
                  </button>
                ))
              ) : (
                <div className={styles.suggestionEmpty}>엔터로 추가하기</div>
              )}
            </div>
          )}
        </div>
        <div className={styles.col2}>
          <label className={styles.label}>시작일</label>
          <div className={styles.inputShellTight}>
            <input type="date" value={projectStart} onChange={(e) => setProjectStart(e.target.value)} className={styles.dateInput} />
          </div>
        </div>
        <div className={`${styles.col2} flex items-end gap-2`}>
          <div className="flex-1">
            <label className={styles.label}>종료일</label>
            <div className={styles.inputShellTight}>
              <input type="date" value={projectEnd} onChange={(e) => setProjectEnd(e.target.value)} className={styles.dateInput} />
            </div>
          </div>
          <button
            onClick={handleAddProject}
            className={styles.addButton}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className={styles.footerRow}>
          <label className={styles.label}>간단 메모</label>
          <input
            type="text"
            value={projectNotes}
            onChange={(e) => setProjectNotes(e.target.value)}
            placeholder="메모를 남겨보세요 (선택사항)"
            className={styles.notesInput}
          />
        </div>
      <div className={`${styles.gridFull} flex flex-col gap-2`}>
        <label className={styles.label}>프로젝트 문서 (PDF 첨부)</label>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
          <div className="md:col-span-5">
            <div className={styles.inputShell}>
              <input
                type="text"
                value={projectDocName}
                onChange={(e) => setProjectDocName(e.target.value)}
                placeholder="파일명 또는 제목"
                className={styles.textInput}
              />
            </div>
          </div>
          <div className="md:col-span-5">
            <div className={styles.inputShell}>
              <input
                type="text"
                value={projectDocUrl}
                onChange={(e) => setProjectDocUrl(e.target.value)}
                placeholder="문서 URL (선택)"
                className={styles.textInput}
              />
            </div>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <label className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-xs font-bold cursor-pointer hover:bg-indigo-100 w-full text-center">
              PDF 업로드
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handlePdfUpload(file, setProjectDocUrl, setProjectDocName);
                }}
              />
            </label>
          </div>
          {(projectDocName || projectDocUrl) && (
            <div className="md:col-span-12 text-xs text-gray-600 flex items-center gap-2">
              <span className="font-semibold">첨부:</span>
              <span className="truncate">{projectDocName || '파일명 없음'}</span>
              {projectDocUrl && <span className="text-indigo-600 truncate">{projectDocUrl}</span>}
            </div>
          )}
        </div>
      </div>
        <div className={styles.gridFull + ' space-y-2'}>
          <label className={styles.label}>특이 스케줄 (시사일/PPM 등)</label>
          <div className="flex flex-col gap-2">
            {projectMilestones.map((m, idx) => (
              <div key={m.id} className="flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  value={m.label}
                  onChange={(e) => updateProjectMilestone(m.id, 'label', e.target.value)}
                  placeholder={`특이 스케줄 ${idx + 1} 입력`}
                  className={styles.milestoneLabel}
                />
                <input
                  type="date"
                  value={m.date}
                  onChange={(e) => updateProjectMilestone(m.id, 'date', e.target.value)}
                  className={styles.milestoneDate}
                />
                <button type="button" onClick={addProjectMilestone} className={`${styles.milestoneAdd} text-sm`}>
                  +
                </button>
                <button
                  type="button"
                  disabled={projectMilestones.length === 1}
                  onClick={() => removeProjectMilestone(m.id)}
                  className={`${styles.milestoneRemove} text-sm ${projectMilestones.length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  -
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.gridFull}>
          <button
            type="button"
            onClick={onOpenVacationModal}
            className={styles.vacationButton}
          >
            구성원 휴가 입력
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectForm;
