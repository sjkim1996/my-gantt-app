import React, { useRef } from 'react';
import { X } from 'lucide-react';
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
  addAttachment: () => string;
  removeAttachment: (id: string) => void;
  uploadAttachment: (id: string, files: FileList | null) => void;
  onOpenAttachment: (att: Attachment) => void;
  projectMilestones: Milestone[];
  addProjectMilestone: () => void;
  updateProjectMilestone: (id: string, field: 'label' | 'date', value: string) => void;
  removeProjectMilestone: (id: string) => void;
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
  onOpenAttachment,
  projectMilestones,
  addProjectMilestone,
  updateProjectMilestone,
  removeProjectMilestone,
}) => {
  const dropInputRef = useRef<HTMLInputElement | null>(null);

  const getEmptyAttachmentId = () => {
    const empty = attachments.find((a) => !a.name && !a.key && !a.url);
    if (empty) return empty.id;
    return addAttachment();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const targetId = getEmptyAttachmentId();
      uploadAttachment(targetId, files);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const targetId = getEmptyAttachmentId();
      uploadAttachment(targetId, files);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>프로젝트 추가</h2>
      </div>
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
        <div className={styles.col2}>
          <label className={styles.label}>종료일</label>
          <div className={styles.inputShellTight}>
            <input type="date" value={projectEnd} onChange={(e) => setProjectEnd(e.target.value)} className={styles.dateInput} />
          </div>
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
        <div className={`${styles.gridFull} flex flex-col gap-3`}>
          <label className={styles.label}>프로젝트 문서 (첨부 파일)</label>
          <div
            className={styles.uploadDrop}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => dropInputRef.current?.click()}
          >
            <p className={styles.attachmentHint}>첨부할 파일을 여기로 끌어다 놓거나, 파일 선택 버튼을 눌러 주세요.</p>
            <button
              type="button"
              className={styles.uploadButton}
              onClick={(e) => {
                e.stopPropagation();
                dropInputRef.current?.click();
              }}
            >
              파일 선택
            </button>
            <input
              ref={dropInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
          <div className={styles.attachmentList}>
            {attachments.map((att, idx) => (
              <div key={att.id} className={styles.attachmentItem}>
                <div className={styles.attachmentMeta}>
                  <span className={styles.attachmentName}>{att.name || `첨부 ${idx + 1}`}</span>
                  {(att.key || att.url) && <span className={styles.attachmentSub}>{att.key || att.url}</span>}
                </div>
                <div className={styles.attachmentActions}>
                  <label className={styles.attachmentReplace}>
                    교체
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => uploadAttachment(att.id, e.target.files)}
                    />
                  </label>
                  <button type="button" className={styles.attachmentOpen} onClick={() => onOpenAttachment(att)} disabled={!att.key && !att.url}>
                    열기
                  </button>
                  <button type="button" className={styles.attachmentDelete} onClick={() => removeAttachment(att.id)} disabled={attachments.length === 1}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
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

        <div className={styles.actionsRow}>
          <button
            type="button"
            onClick={handleAddProject}
            className={styles.submitButton}
          >
            프로젝트 추가
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectForm;
