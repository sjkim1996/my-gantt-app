import React from 'react';
import { Plus, X } from 'lucide-react';
import { Assignee, Attachment, Milestone } from '../types';
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
  attachments: (Attachment & { id: string })[];
  addAttachment: () => void;
  removeAttachment: (id: string) => void;
  uploadAttachment: (id: string, files: FileList | null) => void;
  clearAttachment: (id: string) => void;
  onOpenAttachment: (att: Attachment) => void;
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
  attachments,
  addAttachment,
  removeAttachment,
  uploadAttachment,
  clearAttachment,
  onOpenAttachment,
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
          <label className={styles.label}>프로젝트 문서 (첨부 파일)</label>
          <div className="space-y-2">
            {attachments.map((att) => (
              <div key={att.id} className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={att.name}
                    readOnly
                    placeholder="파일을 업로드하면 이름이 표시됩니다"
                    className={`${styles.textInput} bg-gray-50 cursor-not-allowed`}
                  />
                </div>
                <label className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-xs font-bold cursor-pointer hover:bg-indigo-100">
                  파일 선택/교체
                  <input
                    type="file"
                    accept="*/*"
                    multiple
                    className="hidden"
                    onChange={(e) => uploadAttachment(att.id, e.target.files)}
                  />
                </label>
                {(att.key || att.url) && (
                  <span className="text-xs text-gray-600 truncate max-w-[180px]">{att.key || att.url}</span>
                )}
                <button
                  type="button"
                  onClick={() => onOpenAttachment(att)}
                  className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded hover:bg-indigo-100 text-xs font-bold disabled:opacity-50"
                  disabled={!att.key && !att.url}
                >
                  열기
                </button>
                <button
                  type="button"
                  onClick={() => clearAttachment(att.id)}
                  className="px-2 py-1 bg-white text-gray-500 border border-gray-200 rounded hover:bg-gray-50 text-xs font-bold"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className={`${styles.milestoneRemove} text-sm ${attachments.length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={attachments.length === 1}
                >
                  -
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAttachment}
              className="px-3 py-2 bg-white border border-dashed border-gray-300 rounded text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800"
            >
              + 파일 추가
            </button>
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
            className={`${styles.vacationButton} hidden`}
          >
            구성원 휴가 입력
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectForm;
