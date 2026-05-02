'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Plus, Check, MapPin, TrendingUp } from 'lucide-react';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import { getProgressPercentage } from '@/lib/utils';

interface ProjectSelectorBarProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
}

export default function ProjectSelectorBar({ 
  projects, 
  activeProjectId, 
  onSelectProject, 
  onCreateProject 
}: ProjectSelectorBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const activeProject = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (projectId: string) => {
    onSelectProject(projectId);
    setIsOpen(false);
  };

  return (
    <div className="glass-card mb-6 p-4 rounded-[20px] border border-white/10 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Building2 className="text-blue-500" size={24} />
        {activeProject ? (
          <div>
            <h2 className="text-lg font-black text-white">{activeProject.name}</h2>
            {activeProject.location && (
              <p className="text-xs text-slate-500">{activeProject.location}</p>
            )}
          </div>
        ) : (
          <p className="text-slate-500">Nenhuma obra selecionada</p>
        )}
      </div>

      <div className="flex items-center gap-3" ref={dropdownRef}>
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2 text-white text-sm font-bold transition-all"
          >
            <span>▼ Trocar Obra</span>
          </button>

          {isOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 glass-card rounded-2xl border border-white/10 overflow-hidden z-50 max-h-80 overflow-y-auto">
              {projects.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  Nenhuma obra cadastrada
                </div>
              ) : (
                projects.map(project => {
                  const progress = getProgressPercentage(project.floors?.flatMap(f => f.services || []) || []);
                  const isActive = project.id === activeProjectId;
                  
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleSelect(project.id)}
                      className={cn(
                        "w-full p-4 text-left border-b border-white/5 last:border-0 transition-all",
                        isActive ? "bg-blue-600/20" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {isActive && <Check size={14} className="text-blue-500" />}
                            <span className="font-bold text-white">{project.name}</span>
                          </div>
                          {project.location && (
                            <p className="text-xs text-slate-500 mt-1">{project.location}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-blue-500">{progress}%</span>
                          <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-blue-500" 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <button 
          onClick={onCreateProject}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 text-white text-sm font-bold transition-all"
        >
          <Plus size={16} />
          <span>Nova</span>
        </button>
      </div>
    </div>
  );
}