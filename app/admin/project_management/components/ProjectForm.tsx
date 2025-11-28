import React from 'react';
import { Plus, X } from 'lucide-react';
import { Assignee, Milestone } from '../types';
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
                <button type="button" onClick={addProjectMilestone} className={styles.milestoneAdd}>
                  +
                </button>
                <button type="button" onClick={() => removeProjectMilestone(m.id)} className={styles.milestoneRemove}>
                  ′
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
