'use client';

import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode,
} from 'react';
import { Floor, Status, User, BuildingConfig, ConstructionPhase, FloorExecution, SubStep } from '@/types';
import {
  saveProjectConfig, loadProjectConfig,
  saveProjectPhases, loadProjectPhases,
  saveProjectData,
} from '@/lib/projectStorage';
import { getProgressPercentage, newId } from '@/lib/utils';
import {
  loadCompanies, loadUserProfilesFromSupabase, loadProjects,
  saveCompany, saveProject, saveProjects, saveCompanies,
  loadTeamByCompany, saveTeamByCompany,
  getAllUsers, updateUserActive, deleteUser, deleteCompany,
  deleteProjectsByCompany, resetToCleanState, signOut,
  Company, Project,
} from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface Toast { message: string; type: 'success' | 'error' }

interface AppContextValue {
  // Auth
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  currentMember: any;
  setCurrentMember: React.Dispatch<React.SetStateAction<any>>;
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Companies / Projects
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  allProjects: Project[];
  setAllProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  allUsers: any[];
  setAllUsers: React.Dispatch<React.SetStateAction<any[]>>;
  team: any[];
  setTeam: React.Dispatch<React.SetStateAction<any[]>>;
  currentViewCompanyId: string;
  setCurrentViewCompanyId: React.Dispatch<React.SetStateAction<string>>;
  currentCompany: Company | null;
  companyProjects: Project[];
  project: Project | null;
  activeProjectId: string | null;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  currentProjectIndex: number;
  setCurrentProjectIndex: React.Dispatch<React.SetStateAction<number>>;
  selectProject: (projectId: string) => Promise<void>;
  // Project data
  phases: ConstructionPhase[];
  setPhases: React.Dispatch<React.SetStateAction<ConstructionPhase[]>>;
  buildingConfig: BuildingConfig | null;
  setBuildingConfig: React.Dispatch<React.SetStateAction<BuildingConfig | null>>;
  // Computed
  projectDisciplines: string[];
  disciplineProgress: { name: string; progress: number }[];
  totalProgress: number;
  // UI state
  toast: Toast | null;
  setToast: React.Dispatch<React.SetStateAction<Toast | null>>;
  viewMode: '2d' | '3d';
  setViewMode: React.Dispatch<React.SetStateAction<'2d' | '3d'>>;
  isInitialized: boolean;
  showEmptyPhaseState: boolean;
  setShowEmptyPhaseState: React.Dispatch<React.SetStateAction<boolean>>;
  // Editing state
  editingProjectIndex: number | null;
  setEditingProjectIndex: React.Dispatch<React.SetStateAction<number | null>>;
  editingFloor: Floor | null;
  setEditingFloor: React.Dispatch<React.SetStateAction<Floor | null>>;
  selectedFloors: string[];
  setSelectedFloors: React.Dispatch<React.SetStateAction<string[]>>;
  selectedFloor: Floor | null;
  setSelectedFloor: React.Dispatch<React.SetStateAction<Floor | null>>;
  editingExecution: { phaseId: string; subStepId: string; execution: FloorExecution } | null;
  setEditingExecution: React.Dispatch<React.SetStateAction<{ phaseId: string; subStepId: string; execution: FloorExecution } | null>>;
  isConfigModalOpen: boolean;
  setIsConfigModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCreatingNewProject: boolean;
  setIsCreatingNewProject: React.Dispatch<React.SetStateAction<boolean>>;
  changePlanCompany: Company | null;
  setChangePlanCompany: React.Dispatch<React.SetStateAction<Company | null>>;
  // Settings state
  isEditingProfile: boolean;
  setIsEditingProfile: React.Dispatch<React.SetStateAction<boolean>>;
  isChangingPassword: boolean;
  setIsChangingPassword: React.Dispatch<React.SetStateAction<boolean>>;
  newPassword: string;
  setNewPassword: React.Dispatch<React.SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  savingPassword: boolean;
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  profileInputRef: React.RefObject<HTMLInputElement | null>;
  // Discipline state
  showAddDiscipline: boolean;
  setShowAddDiscipline: React.Dispatch<React.SetStateAction<boolean>>;
  newDisciplineName: string;
  setNewDisciplineName: React.Dispatch<React.SetStateAction<string>>;
  // Handlers
  handleLogin: (user: User, isNewUser?: boolean) => Promise<void>;
  handleAddDiscipline: () => void;
  handleRemoveDiscipline: (disc: string) => void;
  handleAddServiceToFloor: (floorId: string, serviceName: string) => void;
  handleRemoveServiceFromFloor: (floorId: string, serviceId: string, serviceName: string) => void;
  handleSaveBuildingConfig: (config: BuildingConfig) => void;
  handleSaveFloor: (floor: Floor) => void;
  handleDeleteFloor: (floorId: string) => void;
  handleDeleteProject: (projectId: string) => void;
  handleUpdateSubStep: (phaseId: string, subStepId: string, newProgress: number) => void;
  handleBulkApply: (status: Status, progress: number) => void;
  handleUpdateExecution: (phaseId: string, subStepId: string, execution: FloorExecution) => void;
  handleProfilePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveAccount: (data: { email: string; password: string }) => void;
  handleChangePassword: () => Promise<void>;
  handleImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddMember: (data: any) => void;
  openNewProjectModal: () => void;
  togglePauseCompany: (id: string) => void;
  isAddingMember: boolean;
  setIsAddingMember: React.Dispatch<React.SetStateAction<boolean>>;
  loadInitialData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [activeTab, setActiveTabState] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [toast, setToast] = useState<Toast | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const currentMemberRef = useRef<any>(null);
  currentMemberRef.current = currentMember;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [changePlanCompany, setChangePlanCompany] = useState<Company | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [buildingConfig, setBuildingConfig] = useState<BuildingConfig | null>(null);
  const [phases, setPhases] = useState<ConstructionPhase[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);
  const [editingExecution, setEditingExecution] = useState<{ phaseId: string; subStepId: string; execution: FloorExecution } | null>(null);
  const [currentViewCompanyId, setCurrentViewCompanyId] = useState<string>('');
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [showEmptyPhaseState, setShowEmptyPhaseState] = useState(false);
  const [showAddDiscipline, setShowAddDiscipline] = useState(false);
  const [newDisciplineName, setNewDisciplineName] = useState('');
  const [team, setTeam] = useState<any[]>([]);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    setMobileMenuOpen(false);
  }, []);

  // Auth state changes
  useEffect(() => {
    const handleAuth = async (session: any) => {
      if (!session?.user) return;

      const { data: member } = await supabase
        .from('team_members')
        .select('id, name, email, permissions, is_active, project_ids, company_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (member) {
        if (member.is_active === false) {
          await supabase.auth.signOut();
          return;
        }
        setCurrentUser(null);
        setCurrentMember({
          id: member.id,
          name: member.name,
          email: member.email,
          permissions: member.permissions || {},
          projectIds: Array.isArray(member.project_ids) ? member.project_ids : null,
          companyId: member.company_id || '',
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        if (profile.is_active === false) {
          await supabase.auth.signOut();
          return;
        }
        setCurrentMember(null);
        setCurrentUser({
          id: profile.id,
          email: session.user.email || '',
          name: profile.name || session.user.email || '',
          role: (profile.role as any) || 'ADMIN',
          companyId: profile.company_id || '',
          isActive: true,
        });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        setCurrentUser(null);
        setCurrentMember(null);
      } else {
        handleAuth(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadInitialData = useCallback(async () => {
    if (!currentUser) {
      if (!currentMemberRef.current) {
        setAllProjects([]);
        setCompanies([]);
      }
      return;
    }

    const storedCompanies = await loadCompanies();
    const storedProjects = await loadProjects(currentUser.companyId);
    const users = await getAllUsers();

    const typedProjects: Project[] = storedProjects.map((p: any) => ({
      ...p,
      id: p.id || newId(),
      companyId: p.companyId || p.company_id || '',
      name: p.name || 'Novo Projeto',
      location: p.location || '',
      totalFloors: p.totalFloors ?? p.total_floors ?? 1,
      basements: p.basements ?? 0,
      hasLeisure: p.hasLeisure ?? p.has_leisure ?? false,
      hasAtrium: p.hasAtrium ?? p.has_atrium ?? false,
      technicalAreas: p.technicalAreas ?? p.technical_areas ?? 0,
      floors: p.floors || [],
      phases: p.phases || [],
    }));

    setCompanies(storedCompanies);
    setAllProjects(typedProjects);
    setAllUsers(users);
    setCurrentViewCompanyId(currentUser.companyId);
    setIsInitialized(true);

    if (typedProjects.length > 0) {
      const currentId = activeProjectId || typedProjects[0].id;
      const projectIdx = typedProjects.findIndex(p => p.id === currentId);
      const firstProject = projectIdx >= 0 ? typedProjects[projectIdx] : typedProjects[0];

      setActiveProjectId(firstProject.id);
      setCurrentProjectIndex(projectIdx >= 0 ? projectIdx : 0);
      setPhases(firstProject.phases || []);

      const savedConfig = await loadProjectConfig(firstProject.id);
      setBuildingConfig(savedConfig);
      setShowEmptyPhaseState(!firstProject.phases || firstProject.phases.length === 0);
    }
  }, [currentUser, activeProjectId]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  // Realtime: global company/project changes
  useEffect(() => {
    if (!currentUser?.companyId) return;
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadInitialData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_phases' }, () => loadInitialData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'floors' }, () => loadInitialData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => loadInitialData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.companyId, loadInitialData]);

  // Realtime: per-project sync
  useEffect(() => {
    if (!activeProjectId || !allProjects.find(p => p.id === activeProjectId)) return;

    const loadData = async () => {
      const savedPhases = await loadProjectPhases(activeProjectId);
      setPhases(savedPhases || []);
      const savedConfig = await loadProjectConfig(activeProjectId);
      setBuildingConfig(savedConfig);
      setShowEmptyPhaseState(!savedPhases || savedPhases.length === 0);
    };
    loadData();

    const channel = supabase
      .channel(`project-sync-${activeProjectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_phases', filter: `project_id=eq.${activeProjectId}` },
        async () => {
          const freshPhases = await loadProjectPhases(activeProjectId);
          setPhases(freshPhases || []);
          if (freshPhases && freshPhases.length > 0) setShowEmptyPhaseState(false);
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'building_configs', filter: `project_id=eq.${activeProjectId}` },
        async () => {
          const freshConfig = await loadProjectConfig(activeProjectId);
          setBuildingConfig(freshConfig);
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${activeProjectId}` },
        async (payload: any) => {
          setAllProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, ...payload.new } : p));
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeProjectId]);

  useEffect(() => {
    if (isInitialized && companies.length > 0 && !currentViewCompanyId) {
      setCurrentViewCompanyId(companies[0].id || '');
    }
  }, [isInitialized, companies]);

  useEffect(() => {
    if (currentViewCompanyId && isInitialized) {
      loadTeamByCompany(currentViewCompanyId).then(setTeam);
    }
  }, [currentViewCompanyId, isInitialized]);

  // Load member projects
  useEffect(() => {
    if (!currentMember?.companyId) return;

    const loadMemberProjects = async () => {
      const freshProjects = await loadProjects(currentMember.companyId);
      const typedProjects: Project[] = (freshProjects as any[]).map((p: any) => ({
        id: p.id || newId(),
        companyId: p.company_id || p.companyId || '',
        name: p.name || 'Novo Projeto',
        location: p.location || '',
        totalFloors: p.totalFloors ?? p.total_floors ?? 1,
        basements: p.basements ?? 0,
        hasLeisure: p.hasLeisure ?? p.has_leisure ?? false,
        hasAtrium: p.hasAtrium ?? p.has_atrium ?? false,
        technicalAreas: p.technicalAreas ?? p.technical_areas ?? 0,
        floors: p.floors || [],
        phases: p.phases || [],
      }));
      setAllProjects(typedProjects);
      setCurrentViewCompanyId(currentMember.companyId);
      setIsInitialized(true);

      const allowed = (Array.isArray(currentMember.projectIds) && currentMember.projectIds.length > 0)
        ? typedProjects.filter(p => (currentMember.projectIds as string[]).includes(p.id))
        : typedProjects;

      if (allowed.length > 0) {
        const firstProject = allowed[0];
        setActiveProjectId(firstProject.id);
        const projectIdx = typedProjects.findIndex(p => p.id === firstProject.id);
        setCurrentProjectIndex(projectIdx >= 0 ? projectIdx : 0);
        const savedPhases = await loadProjectPhases(firstProject.id);
        setPhases(savedPhases || []);
        const savedConfig = await loadProjectConfig(firstProject.id);
        setBuildingConfig(savedConfig);
      }
    };

    loadMemberProjects();
  }, [currentMember?.companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Derived values
  const currentCompany = useMemo(
    () => companies.find(c => c.id === currentViewCompanyId) || (companies.length > 0 ? companies[0] : null),
    [companies, currentViewCompanyId],
  );

  const allCompanyProjects = useMemo(
    () => currentViewCompanyId ? allProjects.filter(p => p.companyId === currentViewCompanyId) : [],
    [allProjects, currentViewCompanyId],
  );

  const companyProjects = useMemo(() => {
    const memberAllowedProjectIds = currentMember?.projectIds;
    return (Array.isArray(memberAllowedProjectIds) && memberAllowedProjectIds.length > 0)
      ? allCompanyProjects.filter(p => memberAllowedProjectIds.includes(p.id))
      : allCompanyProjects;
  }, [allCompanyProjects, currentMember]);

  const project = useMemo(
    () => companyProjects[currentProjectIndex] || (companyProjects.length > 0 ? companyProjects[0] : null),
    [companyProjects, currentProjectIndex],
  );

  const projectDisciplines = useMemo(() => {
    if (!project || !project.floors || project.floors.length === 0) return [];
    const discs = new Set<string>();
    project.floors.forEach(f => f.services.forEach(s => discs.add(s.name)));
    return Array.from(discs);
  }, [project]);

  const disciplineProgress = useMemo(() => {
    if (!project || !project.floors?.length) return [];
    return projectDisciplines.map(name => {
      let total = 0, count = 0;
      (project.floors || []).forEach(f => {
        const s = f.services.find(svc => svc.name === name);
        if (s) { total += s.status === 'COMPLETED' ? 100 : s.status === 'IN_PROGRESS' ? 50 : 0; count++; }
      });
      return { name, progress: Math.round(total / (count || 1)) };
    });
  }, [project, projectDisciplines]);

  const totalProgress = useMemo(() => {
    if (!project || !project.name || !project.floors || project.floors.length === 0) return 0;
    if (project.phases && project.phases.length > 0) {
      const weightedSum = project.phases.reduce((acc, phase) => acc + (phase.progress * phase.weight), 0);
      const totalWeight = project.phases.reduce((acc, phase) => acc + phase.weight, 0);
      return Math.round(weightedSum / (totalWeight || 100));
    }
    return Math.round((project.floors || []).reduce((acc, f) => acc + getProgressPercentage(f.services || []), 0) / (project.floors?.length || 1));
  }, [project]);

  // Handlers
  const selectProject = useCallback(async (projectId: string) => {
    if (activeProjectId && activeProjectId !== projectId && !currentMember) {
      if (phases.length > 0) await saveProjectPhases(activeProjectId, phases);
      if (buildingConfig) await saveProjectConfig(activeProjectId, buildingConfig);
    }
    setActiveProjectId(projectId);
    const projectIdx = companyProjects.findIndex(p => p.id === projectId);
    if (projectIdx >= 0) setCurrentProjectIndex(projectIdx);
    const savedPhases = await loadProjectPhases(projectId);
    setPhases(savedPhases || []);
    const savedConfig = await loadProjectConfig(projectId);
    setBuildingConfig(savedConfig);
    setEditingProjectIndex(null);
  }, [activeProjectId, phases, buildingConfig, companyProjects, currentMember]);

  const handleLogin = useCallback(async (user: User, isNewUser = false) => {
    setCurrentUser(user);
    if (isNewUser) {
      const [freshCompanies, freshProjects] = await Promise.all([loadCompanies(), loadProjects(user.companyId)]);
      setCompanies(freshCompanies);
      setAllProjects(freshProjects as Project[]);
      setCurrentViewCompanyId(user.companyId);
    } else {
      setCurrentViewCompanyId(user.companyId);
      const freshProjects = await loadProjects(user.companyId);
      const typedProjects: Project[] = freshProjects.map((p: any) => ({
        id: p.id || newId(),
        companyId: p.company_id || p.companyId || '',
        name: p.name || 'Novo Projeto',
        location: p.location || '',
        totalFloors: p.totalFloors ?? p.total_floors ?? 1,
        basements: p.basements ?? 0,
        hasLeisure: p.hasLeisure ?? p.has_leisure ?? false,
        hasAtrium: p.hasAtrium ?? p.has_atrium ?? false,
        technicalAreas: p.technicalAreas ?? p.technical_areas ?? 0,
        floors: [],
        phases: [],
      }));
      setAllProjects(typedProjects);
      if (typedProjects.length > 0) {
        const firstProject = typedProjects[0];
        setActiveProjectId(firstProject.id || '');
        setCurrentProjectIndex(0);
        const savedPhases = await loadProjectPhases(firstProject.id || '');
        setPhases(savedPhases || []);
        const savedConfig = await loadProjectConfig(firstProject.id || '');
        setBuildingConfig(savedConfig);
        setShowEmptyPhaseState(!savedPhases || savedPhases.length === 0);
      }
    }
    if (user.role === 'SUPERADMIN') setActiveTabState('admin_dashboard');
    else setActiveTabState('dashboard');
  }, []);

  const handleAddDiscipline = useCallback(() => {
    if (!newDisciplineName.trim() || !project) return;
    const discipline = newDisciplineName.trim();
    const updatedProjects = allProjects.map(ap => ap.id === project.id ? {
      ...ap,
      floors: (ap.floors || []).map(f => ({
        ...f,
        services: [...(f.services || []), { id: `svc_${f.id}_${Date.now()}`, name: discipline, status: 'NOT_STARTED' as Status }],
      })),
    } : ap);
    setAllProjects(updatedProjects);
    saveProjects(updatedProjects);
    setNewDisciplineName('');
    setShowAddDiscipline(false);
    setToast({ message: 'Disciplina adicionada!', type: 'success' });
  }, [newDisciplineName, project, allProjects]);

  const handleRemoveDiscipline = useCallback((discName: string) => {
    if (!project || !confirm(`Remover "${discName}" de todos os andares?`)) return;
    const updatedProjects = allProjects.map(ap => ap.id === project.id ? {
      ...ap,
      floors: (ap.floors || []).map(f => ({
        ...f,
        services: (f.services || []).filter((s: any) => s.name !== discName),
      })),
    } : ap);
    setAllProjects(updatedProjects);
    saveProjects(updatedProjects);
    setToast({ message: 'Disciplina removida!', type: 'success' });
  }, [project, allProjects]);

  const handleAddServiceToFloor = useCallback((floorId: string, serviceName: string) => {
    if (!project) return;
    const updatedProjects = allProjects.map(ap => ap.id === project.id ? {
      ...ap,
      floors: (ap.floors || []).map(f => f.id === floorId ? {
        ...f,
        services: [...(f.services || []), { id: `svc_${f.id}_${Date.now()}`, name: serviceName, status: 'NOT_STARTED' as Status }],
      } : f),
    } : ap);
    setAllProjects(updatedProjects);
    saveProjects(updatedProjects);
  }, [project, allProjects]);

  const handleRemoveServiceFromFloor = useCallback((floorId: string, serviceId: string, serviceName: string) => {
    if (!project || !confirm(`Remover "${serviceName}" deste andar?`)) return;
    const updatedProjects = allProjects.map(ap => ap.id === project.id ? {
      ...ap,
      floors: (ap.floors || []).map(f => f.id === floorId ? {
        ...f,
        services: (f.services || []).filter((s: any) => s.id !== serviceId),
      } : f),
    } : ap);
    setAllProjects(updatedProjects);
    saveProjects(updatedProjects);
  }, [project, allProjects]);

  const openNewProjectModal = useCallback(() => {
    setActiveProjectId(null);
    setBuildingConfig(null);
    setPhases([]);
    setEditingProjectIndex(null);
    setShowEmptyPhaseState(false);
    setIsCreatingNewProject(true);
    setIsConfigModalOpen(true);
  }, []);

  const handleSaveBuildingConfig = useCallback((config: BuildingConfig) => {
    setBuildingConfig(config);
    if (activeProjectId && !isCreatingNewProject) {
      saveProjectConfig(activeProjectId, config);
      setIsCreatingNewProject(false);
      setToast({ message: 'Prédio configurado!', type: 'success' });
    } else {
      const newProj: Project = {
        id: newId(),
        companyId: currentViewCompanyId,
        name: config.name,
        location: config.address,
        totalFloors: config.totalFloors,
        basements: config.basements,
        mezzanines: config.mezzanines,
        hasLeisure: config.hasLeisure,
        hasAtrium: config.hasAtrium,
        technicalAreas: config.technicalAreas,
        floors: config.floors,
        phases: [],
      };
      const updatedProjects = [...allProjects, newProj];
      setAllProjects(updatedProjects);
      saveProjects(updatedProjects);
      setCurrentProjectIndex(updatedProjects.length - 1);
      setActiveProjectId(newProj.id ?? null);
      saveProjectConfig(newProj.id ?? '', config);
      setIsCreatingNewProject(false);
      setToast({ message: 'Obra criada a partir do prédio!', type: 'success' });
    }
  }, [activeProjectId, isCreatingNewProject, allProjects, currentViewCompanyId]);

  const handleSaveFloor = useCallback((floor: Floor) => {
    if (!buildingConfig) return;
    const updatedFloors = buildingConfig.floors.map(f => f.id === floor.id ? floor : f);
    const updatedConfig = { ...buildingConfig, floors: updatedFloors, updatedAt: new Date().toISOString() };
    setBuildingConfig(updatedConfig);
    if (activeProjectId) saveProjectConfig(activeProjectId, updatedConfig);
    setEditingFloor(null);
    setToast({ message: 'Pavimento atualizado!', type: 'success' });
  }, [buildingConfig, activeProjectId]);

  const handleDeleteFloor = useCallback((floorId: string) => {
    if (!buildingConfig) return;
    const updatedFloors = buildingConfig.floors.filter(f => f.id !== floorId);
    const updatedConfig = { ...buildingConfig, floors: updatedFloors, updatedAt: new Date().toISOString() };
    setBuildingConfig(updatedConfig);
    if (activeProjectId) saveProjectConfig(activeProjectId, updatedConfig);
    setEditingFloor(null);
    setToast({ message: 'Pavimento removido!', type: 'success' });
  }, [buildingConfig, activeProjectId]);

  const handleDeleteProject = useCallback((projectId: string) => {
    if (confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) {
      const updatedProjects = allProjects.filter(p => p.id !== projectId);
      setAllProjects(updatedProjects);
      saveProjects(updatedProjects);
      setCurrentProjectIndex(0);
      setEditingProjectIndex(null);
      setBuildingConfig(null);
      setPhases([]);
      setToast({ message: 'Projeto excluído!', type: 'success' });
    }
  }, [allProjects]);

  const handleUpdateSubStep = useCallback((phaseId: string, subStepId: string, newProgress: number) => {
    if (!project) return;
    const updatedPhases = phases.map(phase => {
      if (phase.id !== phaseId) return phase;
      const updatedSubSteps = phase.subSteps.map((step: SubStep) =>
        step.id === subStepId ? { ...step, status: (newProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS') as Status, progress: newProgress } : step,
      );
      const avgProgress = Math.round(updatedSubSteps.reduce((acc: number, s: SubStep) => acc + s.progress, 0) / updatedSubSteps.length);
      const newStatus = avgProgress === 100 ? 'COMPLETED' : avgProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
      return { ...phase, subSteps: updatedSubSteps, progress: avgProgress, status: newStatus as Status };
    });
    setPhases(updatedPhases);
    if (activeProjectId) saveProjectPhases(activeProjectId, updatedPhases);
  }, [project, phases, activeProjectId]);

  const handleBulkApply = useCallback((status: Status, progress: number) => {
    if (!editingExecution) return;
    setSelectedFloors([]);
    setToast({ message: `${selectedFloors.length} pavimentos atualizados!`, type: 'success' });
  }, [editingExecution, selectedFloors]);

  const handleUpdateExecution = useCallback((phaseId: string, subStepId: string, execution: FloorExecution) => {
    if (activeProjectId) saveProjectPhases(activeProjectId, phases);
    setEditingExecution(null);
    setToast({ message: 'Execução atualizada!', type: 'success' });
  }, [activeProjectId, phases]);

  const handleProfilePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCurrentUser(prev => prev ? { ...prev, avatar: ev.target?.result as string } : null);
      };
      reader.readAsDataURL(file);
    }
  }, [currentUser]);

  const handleSaveAccount = useCallback((data: { email: string; password: string }) => {
    if (currentUser) {
      setCurrentUser(prev => prev ? { ...prev, email: data.email } : null);
      setToast({ message: 'Dados salvos!', type: 'success' });
      setIsEditingProfile(false);
    }
  }, [currentUser]);

  const handleChangePassword = useCallback(async () => {
    if (newPassword.length < 6) {
      setToast({ message: 'A senha deve ter no mínimo 6 caracteres.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ message: 'As senhas não coincidem.', type: 'error' });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setToast({ message: `Erro ao alterar senha: ${error.message}`, type: 'error' });
      return;
    }
    setToast({ message: 'Senha alterada com sucesso!', type: 'success' });
    setIsChangingPassword(false);
    setNewPassword('');
    setConfirmPassword('');
  }, [newPassword, confirmPassword]);

  const handleImportCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!project) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length <= 1) return;
      const dataLines = lines.slice(1);
      const updatedFloors = [...(project.floors || [])];
      dataLines.forEach(line => {
        const parts = line.split(',');
        if (parts.length < 3) return;
        const floorNum = parseInt(parts[0].trim());
        const serviceName = parts[1].trim();
        const status = (parts[2] || '').trim().toUpperCase().replace(' ', '_');
        const floorIndex = updatedFloors.findIndex((f: any) => f.number === floorNum);
        if (floorIndex >= 0) {
          const svcIndex = updatedFloors[floorIndex].services.findIndex((s: any) => s.name === serviceName);
          if (svcIndex >= 0) updatedFloors[floorIndex].services[svcIndex].status = status as Status;
        }
      });
      const updated = allProjects.map(p => p.id === project.id ? { ...p, floors: updatedFloors } : p);
      setAllProjects(updated);
      saveProjects(updated);
      setToast({ message: 'CSV importado com sucesso!', type: 'success' });
    };
    reader.readAsText(file);
  }, [project, allProjects]);

  const handleAddMember = useCallback((data: any) => {
    const newTeam = [...team, { id: Date.now(), ...data, status: 'Offline' }];
    setTeam(newTeam);
    saveTeamByCompany(currentViewCompanyId, newTeam);
    setIsAddingMember(false);
    setToast({ message: 'Membro convidado!', type: 'success' });
  }, [team, currentViewCompanyId]);

  const togglePauseCompany = useCallback((id: string) => {
    const updated = companies.map(c => c.id === id ? { ...c, isPaused: !c.isPaused } : c);
    setCompanies(updated);
    saveCompanies(updated);
  }, [companies]);

  const value: AppContextValue = {
    currentUser, setCurrentUser,
    currentMember, setCurrentMember,
    activeTab, setActiveTab,
    mobileMenuOpen, setMobileMenuOpen,
    companies, setCompanies,
    allProjects, setAllProjects,
    allUsers, setAllUsers,
    team, setTeam,
    currentViewCompanyId, setCurrentViewCompanyId,
    currentCompany,
    companyProjects,
    project,
    activeProjectId, setActiveProjectId,
    currentProjectIndex, setCurrentProjectIndex,
    selectProject,
    phases, setPhases,
    buildingConfig, setBuildingConfig,
    projectDisciplines,
    disciplineProgress,
    totalProgress,
    toast, setToast,
    viewMode, setViewMode,
    isInitialized,
    showEmptyPhaseState, setShowEmptyPhaseState,
    editingProjectIndex, setEditingProjectIndex,
    editingFloor, setEditingFloor,
    selectedFloors, setSelectedFloors,
    selectedFloor, setSelectedFloor,
    editingExecution, setEditingExecution,
    isConfigModalOpen, setIsConfigModalOpen,
    isCreatingNewProject, setIsCreatingNewProject,
    changePlanCompany, setChangePlanCompany,
    isEditingProfile, setIsEditingProfile,
    isChangingPassword, setIsChangingPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    savingPassword,
    fileInputRef,
    profileInputRef,
    showAddDiscipline, setShowAddDiscipline,
    newDisciplineName, setNewDisciplineName,
    handleLogin,
    handleAddDiscipline,
    handleRemoveDiscipline,
    handleAddServiceToFloor,
    handleRemoveServiceFromFloor,
    handleSaveBuildingConfig,
    handleSaveFloor,
    handleDeleteFloor,
    handleDeleteProject,
    handleUpdateSubStep,
    handleBulkApply,
    handleUpdateExecution,
    handleProfilePhotoChange,
    handleSaveAccount,
    handleChangePassword,
    handleImportCSV,
    handleAddMember,
    openNewProjectModal,
    togglePauseCompany,
    isAddingMember, setIsAddingMember,
    loadInitialData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
