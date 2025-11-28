import React from 'react';
import { Clock, Edit3, Target } from 'lucide-react';
import { GroupedProject, Project } from '../types';
import { BAR_COLORS } from '../utils/colors';

type Props = {
  todayDate: Date;
  activeProjectsToday: GroupedProject[];
  groupedProjects: GroupedProject[];
  hoveredProjectName: string | null;
  onShortcutClick: (group: GroupedProject) => void;
  onProjectClick: (project: Project) => void;
  setHoveredProjectName: (name: string | null) => void;
};

const Dashboard: React.FC<Props> = ({
  todayDate,
  activeProjectsToday,
  groupedProjects,
  hoveredProjectName,
  onShortcutClick,
  onProjectClick,
  setHoveredProjectName,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full h-[180px]">
      <div className="lg:col-span-4 bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex flex-col h-full overflow-hidden">
        <h2 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Today&apos;s Active
          <span className="text-[10px] font-normal text-gray-400 ml-auto">{todayDate.toLocaleDateString()}</span>
        </h2>
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {activeProjectsToday.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
              <Clock className="w-4 h-4 mb-1 opacity-50" />
              진행 중인 프로젝트가 없습니다.
            </div>
          ) : (
            activeProjectsToday.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center text-xs p-2 bg-orange-50/50 rounded border border-orange-100 hover:bg-orange-50 transition-colors"
              >
                <span className="font-medium text-gray-700 truncate max-w-[65%]">{p.name}</span>
                <span className="text-gray-500 bg-white px-1.5 py-0.5 rounded border border-orange-100 text-[10px]">{p.person}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
        <h2 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2 flex-shrink-0">
          <Target className="w-3.5 h-3.5" /> All Projects <span className="text-[10px] font-normal text-gray-400 lowercase">(click to jump)</span>
        </h2>
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {groupedProjects.map((group) => (
              <div
                key={group.id}
                onClick={() => onShortcutClick(group)}
                onMouseEnter={() => setHoveredProjectName(group.name)}
                onMouseLeave={() => setHoveredProjectName(null)}
                className={`
                    group cursor-pointer p-2.5 rounded border border-gray-200 bg-white shadow-sm hover:shadow transition-all relative overflow-hidden hover:border-indigo-300 hover:-translate-y-0.5 min-h-[70px] flex flex-col justify-between
                    ${hoveredProjectName === group.name ? 'ring-2 ring-indigo-100 border-indigo-300' : ''}
                `}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${BAR_COLORS[group.colorIdx % BAR_COLORS.length].bar}`}></div>
                <div className="pl-2">
                  <div className="text-xs font-bold text-gray-800 truncate mb-1" title={group.name}>
                    {group.name}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.members.slice(0, 2).map((m, i) => (
                      <span key={i} className="text-[9px] text-gray-500 bg-gray-100 px-1 rounded border border-gray-200">
                        {m.person}
                      </span>
                    ))}
                    {group.members.length > 2 && (
                      <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1 rounded border border-indigo-100">+{group.members.length - 2}</span>
                    )}
                  </div>
                </div>
                <div
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProjectClick(group);
                  }}
                >
                  <div className="bg-white p-1 rounded border border-gray-200 text-gray-400 hover:text-indigo-600 shadow-sm">
                    <Edit3 className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
            {groupedProjects.length === 0 && (
              <div className="col-span-full text-center text-gray-400 text-sm py-8 border-2 border-dashed border-gray-200 rounded">
                아직 프로젝트가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
