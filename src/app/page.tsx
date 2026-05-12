'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Building2, 
  CheckCircle, 
  BarChart3, 
  FileText, 
  Plus,
  LayoutDashboard,
  Settings,
  Building,
  Users,
  Shield,
  CreditCard,
  PauseCircle,
  PlayCircle,
  Eye,
  LogOut,
  AlertTriangle,
  Search,
  Box,
  Layers,
  Package,
  Bell,
  ChevronDown,
  Trash2,
  Upload,
  Zap,
  Droplets,
  Clock,
  AlertCircle,
  Calendar as CalendarIcon,
  Truck,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Camera,
  Key,
  X,
  Pencil,
  Menu
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import StatCard from '@/components/StatCard';
import BuildingMap from '@/components/BuildingMap';
import Building3D from '@/components/Building3D';
import DashboardCharts from '@/components/DashboardCharts';
import FloorDetail from '@/components/FloorDetail';
import Auth from '@/components/Auth';
import NavItem from '@/components/ui/nav-item';
import SettingOption from '@/components/ui/setting-option';
import ReportCard from '@/components/ui/report-card';
import ConstructionTimeline from '@/components/ConstructionTimeline';
import PhaseSummary from '@/components/PhaseSummary';
import ProjectEditCard from '@/components/ProjectEditCard';
import AdminSettings from '@/components/AdminSettings';
import ConstructionCalendar from '@/components/ConstructionCalendar';
import BuildingConfigModal from '@/components/BuildingConfigModal';
import FloorEditModal from '@/components/FloorEditModal';
import BulkEditBar from '@/components/BulkEditBar';
import ProjectSelectorBar from '@/components/ProjectSelectorBar';
import EmptyPhaseState from '@/components/EmptyPhaseState';
import PlansCatalog from '@/components/PlansCatalog';
import ChangePlanModal from '@/components/ChangePlanModal';
import { ModuleGuard, TeamPage, LoginPage, PendenciasSection, MedicaoObraSection } from '@/components/team';
import { Floor, Status, User, BuildingConfig, ConstructionPhase, FloorExecution, SubStep } from '@/types';
import { saveProjectData, loadProjectData, deleteProjectData, saveProjectPhases, loadProjectPhases, removeProjectPhases, saveProjectConfig, loadProjectConfig, removeProjectConfig, saveProjectExecutions, loadProjectExecutions } from '@/lib/projectStorage';
import { getProgressPercentage, cn, newId } from '@/lib/utils';
import { loadCompanies, loadUserProfilesFromSupabase, loadProjects, saveCompany, saveProject, saveProjects, saveCompanies, loadTeamByCompany, saveTeamByCompany, initializeDefaultData, getAllUsers, updateUserActive, deleteUser, deleteCompany, deleteProjectsByCompany, resetToCleanState, signOut, Company, Project } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { exportAndamento, exportCronograma, exportResumoGeral, loadExportMeta } from '@/lib/exportExcel';

export default function GlobalApplication() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [showMemberLogin, setShowMemberLogin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const currentMemberRef = useRef<any>(null);
  currentMemberRef.current = currentMember;

  // States - carregados do Supabase
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

  // Handle authentication state changes
  useEffect(() => {
    const handleAuth = async (session: any) => {
      if (!session?.user) return;

      // Primeiro verifica se é um team_member — esses têm UI restrita por permissões.
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
          isActive: true
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

  const [currentViewCompanyId, setCurrentViewCompanyId] = useState<string>('');
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [showEmptyPhaseState, setShowEmptyPhaseState] = useState(false);
  const [showAddDiscipline, setShowAddDiscipline] = useState(false);
  const [newDisciplineName, setNewDisciplineName] = useState('');

  const handleAddDiscipline = () => {
    if (!newDisciplineName.trim() || !project) return;
    const discipline = newDisciplineName.trim();
    const updatedProjects = allProjects.map(ap => ap.id === project.id ? {
      ...ap,
      floors: (ap.floors || []).map(f => ({
        ...f,
        services: [...(f.services || []), { id: `svc_${f.id}_${Date.now()}`, name: discipline, status: 'NOT_STARTED' as Status }]
      }))
    } : ap);
    setAllProjects(updatedProjects);
    saveProjects(updatedProjects);
    setNewDisciplineName('');
    setShowAddDiscipline(false);
    setToast({ message: "Disciplina adicionada!", type: 'success' });
  };

  const handleRemoveDiscipline = (discName: string) => {
    if (!project || !confirm(`Remover "${discName}" de todos os andares?`)) return;
    const updatedProjects = allProjects.map(ap => ap.id === project.id ? {
      ...ap,
      floors: (ap.floors || []).map(f => ({
        ...f,
        services: (f.services || []).filter((s: any) => s.name !== discName)
      }))
    } : ap);
    setAllProjects(updatedProjects);
    saveProjects(updatedProjects);
    setToast({ message: "Disciplina removida!", type: 'success' });
  };

  const handleAddServiceToFloor = (floorId: string, serviceName: string) => {
    if (!project) return;
    const updatedProjects = allProjects.map(ap => ap.id === project.id ? {
      ...ap,
      floors: (ap.floors || []).map(f => f.id === floorId ? {
        ...f,
        services: [...(f.services || []), { id: `svc_${f.id}_${Date.now()}`, name: serviceName, status: 'NOT_STARTED' as Status }]
      } : f)
    } : ap);
    setAllProjects(updatedProjects);
    saveProjects(updatedProjects);
  };

  const handleRemoveServiceFromFloor = (floorId: string, serviceId: string, serviceName: string) => {
    if (!project || !confirm(`Remover "${serviceName}" deste andar?`)) return;
    const updatedProjects = allProjects.map(ap => ap.id === project.id ? {
      ...ap,
      floors: (ap.floors || []).map(f => f.id === floorId ? {
        ...f,
        services: (f.services || []).filter((s: any) => s.id !== serviceId)
      } : f)
    } : ap);
    setAllProjects(updatedProjects);
    saveProjects(updatedProjects);
  };

  const loadInitialData = useCallback(async () => {
    if (!currentUser) {
      // Não limpar se membro ativo — ele tem loader próprio
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
      phases: p.phases || []
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
      
      // Usa os dados que já foram carregados no loadProjects
      setPhases(firstProject.phases || []);
      
      // Só carrega a configuração separadamente se necessário
      const savedConfig = await loadProjectConfig(firstProject.id);
      setBuildingConfig(savedConfig);
      setShowEmptyPhaseState(!firstProject.phases || firstProject.phases.length === 0);
    }
  }, [currentUser, activeProjectId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Realtime Subscriptions
  useEffect(() => {
    if (!currentUser?.companyId) return;

    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => { loadInitialData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_phases' },
        () => { loadInitialData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'floors' },
        () => { loadInitialData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        () => { loadInitialData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.companyId, loadInitialData]);

  const selectProject = async (projectId: string) => {
    if (activeProjectId && activeProjectId !== projectId && !currentMember) {
      if (phases.length > 0) {
        await saveProjectPhases(activeProjectId, phases);
      }
      if (buildingConfig) {
        await saveProjectConfig(activeProjectId, buildingConfig);
      }
    }

    setActiveProjectId(projectId);

    const projectIdx = companyProjects.findIndex(p => p.id === projectId);
    if (projectIdx >= 0) {
      setCurrentProjectIndex(projectIdx);
    }

    const savedPhases = await loadProjectPhases(projectId);
    setPhases(savedPhases || []);

    const savedConfig = await loadProjectConfig(projectId);
    setBuildingConfig(savedConfig);

    setEditingProjectIndex(null);
  };

  useEffect(() => {
    if (!activeProjectId || !project) return;

    const loadData = async () => {
      const savedPhases = await loadProjectPhases(activeProjectId);
      setPhases(savedPhases || []);

      const savedConfig = await loadProjectConfig(activeProjectId);
      setBuildingConfig(savedConfig);

      if (savedPhases && savedPhases.length > 0) {
        setShowEmptyPhaseState(false);
      } else {
        setShowEmptyPhaseState(true);
      }
    };

    loadData();

    // Inscrição em tempo real para sincronizar múltiplos navegadores
    const channel = supabase
      .channel(`project-sync-${activeProjectId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'project_phases', 
        filter: `project_id=eq.${activeProjectId}` 
      }, async () => {
        const freshPhases = await loadProjectPhases(activeProjectId);
        setPhases(freshPhases || []);
        if (freshPhases && freshPhases.length > 0) setShowEmptyPhaseState(false);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'building_configs', 
        filter: `project_id=eq.${activeProjectId}` 
      }, async () => {
        const freshConfig = await loadProjectConfig(activeProjectId);
        setBuildingConfig(freshConfig);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'projects', 
        filter: `id=eq.${activeProjectId}` 
      }, async (payload: any) => {
        // Atualiza o projeto na lista local se houver mudanças
        setAllProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, ...payload.new } : p));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeProjectId]);

  useEffect(() => {
    if (isInitialized && companies.length > 0 && !currentViewCompanyId) {
      setCurrentViewCompanyId(companies[0].id || '');
    }
  }, [isInitialized, companies]);

  const [team, setTeam] = useState<any[]>([]);

  useEffect(() => {
    if (currentViewCompanyId && isInitialized) {
      loadTeamByCompany(currentViewCompanyId).then(setTeam);
    }
  }, [currentViewCompanyId, isInitialized]);

  // Carrega projetos da empresa quando um membro faz login
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

      // Seleciona automaticamente a primeira obra permitida
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

  const handleAddMember = (data: any) => {
    const newTeam = [...team, { id: Date.now(), ...data, status: 'Offline' }];
    setTeam(newTeam);
    saveTeamByCompany(currentViewCompanyId, newTeam);
    setIsAddingMember(false);
    setToast({ message: "Membro convidado!", type: 'success' });
  };

  const currentCompany = companies.find(c => c.id === currentViewCompanyId) || (companies.length > 0 ? companies[0] : null);
  const allCompanyProjects = currentViewCompanyId ? allProjects.filter(p => p.companyId === currentViewCompanyId) : [];
  // Se for um team_member com lista restrita de obras, filtra apenas as autorizadas.
  // Owner/admin (currentUser) ou membro com projectIds null/vazio veem todas.
  const memberAllowedProjectIds = currentMember?.projectIds;
  const companyProjects = (Array.isArray(memberAllowedProjectIds) && memberAllowedProjectIds.length > 0)
    ? allCompanyProjects.filter(p => memberAllowedProjectIds.includes(p.id))
    : allCompanyProjects;
  const project = companyProjects[currentProjectIndex] || (companyProjects.length > 0 ? companyProjects[0] : null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLogin = async (user: User, isNewUser = false) => {
    setCurrentUser(user);
    if (isNewUser) {
      // A empresa é criada pelo trigger handle_new_user no Supabase (migration 002).
      // Aqui só recarregamos para pegar o estado real do banco.
      const [freshCompanies, freshProjects] = await Promise.all([
        loadCompanies(),
        loadProjects(user.companyId),
      ]);
      setCompanies(freshCompanies);
      setAllProjects(freshProjects as Project[]);
      setCurrentViewCompanyId(user.companyId);
    } else {
      setCurrentViewCompanyId(user.companyId);

      // Re-fetch data after login so another device sees the correct saved state.
      // loadInitialData runs before auth is established, so RLS returns empty on new devices.
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
        phases: []
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
    if (user.role === 'SUPERADMIN') setActiveTab('admin_dashboard');
    else { setActiveTab('dashboard'); }
  };

  const togglePauseCompany = (id: string) => {
    const updated = companies.map(c => c.id === id ? { ...c, isPaused: !c.isPaused } : c);
    setCompanies(updated);
    saveCompanies(updated);
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) {
      const updatedProjects = allProjects.filter(p => p.id !== projectId);
      setAllProjects(updatedProjects);
      saveProjects(updatedProjects);
      const remainingProjects = updatedProjects.filter(p => p.companyId === currentViewCompanyId);
      if (remainingProjects.length > 0) {
        setCurrentProjectIndex(0);
      } else {
        setCurrentProjectIndex(0);
      }
      setEditingProjectIndex(null);
      setBuildingConfig(null);
      setPhases([]);
      setToast({ message: "Projeto excluído!", type: 'success' });
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          if (svcIndex >= 0) {
            updatedFloors[floorIndex].services[svcIndex].status = status as Status;
          }
        }
      });
      
      const updated = allProjects.map(p => p.id === project.id ? { ...p, floors: updatedFloors } : p);
      setAllProjects(updated);
      saveProjects(updated);
      setToast({ message: "CSV importado com sucesso!", type: 'success' });
    };
    reader.readAsText(file);
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCurrentUser(prev => prev ? { ...prev, avatar: ev.target?.result as string } : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAccount = (data: { email: string; password: string }) => {
    if (currentUser) {
      setCurrentUser(prev => prev ? { ...prev, email: data.email } : null);
      setToast({ message: "Dados salvos!", type: 'success' });
      setIsEditingProfile(false);
    }
  };

  const handleChangePassword = async () => {
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
  };

  const handleUpdateSubStep = (phaseId: string, subStepId: string, newProgress: number) => {
    if (!project) return;
    
    const updatedPhases = phases.map(phase => {
      if (phase.id !== phaseId) return phase;
      
      const updatedSubSteps = phase.subSteps.map((step: SubStep) =>
        step.id === subStepId ? { ...step, status: (newProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS') as Status, progress: newProgress } : step
      );
      
      const avgProgress = Math.round(updatedSubSteps.reduce((acc: number, s: SubStep) => acc + s.progress, 0) / updatedSubSteps.length);
      const newStatus = avgProgress === 100 ? 'COMPLETED' : avgProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
      
      return { ...phase, subSteps: updatedSubSteps, progress: avgProgress, status: newStatus as Status };
    });

    setPhases(updatedPhases);
    if (activeProjectId) {
      saveProjectPhases(activeProjectId, updatedPhases);
    }
  };

  const openNewProjectModal = () => {
    setActiveProjectId(null);
    setBuildingConfig(null);
    setPhases([]);
    setEditingProjectIndex(null);
    setShowEmptyPhaseState(false);
    setIsCreatingNewProject(true);
    setIsConfigModalOpen(true);
  };

  const handleSaveBuildingConfig = (config: BuildingConfig) => {
    setBuildingConfig(config);
    if (activeProjectId && !isCreatingNewProject) {
      saveProjectConfig(activeProjectId, config);
      setIsCreatingNewProject(false);
      setToast({ message: "Prédio configurado!", type: 'success' });
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
      setToast({ message: "Obra criada a partir do prédio!", type: 'success' });
    }
  };

  const handleSaveFloor = (floor: Floor) => {
    if (!buildingConfig) return;
    const updatedFloors = buildingConfig.floors.map(f => f.id === floor.id ? floor : f);
    const updatedConfig = { ...buildingConfig, floors: updatedFloors, updatedAt: new Date().toISOString() };
    setBuildingConfig(updatedConfig);
    if (activeProjectId) {
      saveProjectConfig(activeProjectId, updatedConfig);
    }
    setEditingFloor(null);
    setToast({ message: "Pavimento atualizado!", type: 'success' });
  };

  const handleDeleteFloor = (floorId: string) => {
    if (!buildingConfig) return;
    const updatedFloors = buildingConfig.floors.filter(f => f.id !== floorId);
    const updatedConfig = { ...buildingConfig, floors: updatedFloors, updatedAt: new Date().toISOString() };
    setBuildingConfig(updatedConfig);
    if (activeProjectId) {
      saveProjectConfig(activeProjectId, updatedConfig);
    }
    setEditingFloor(null);
    setToast({ message: "Pavimento removido!", type: 'success' });
  };

  const handleUpdateExecution = (phaseId: string, subStepId: string, execution: FloorExecution) => {
    setPhases(prev => prev);
    if (activeProjectId) {
      saveProjectPhases(activeProjectId, phases);
    }
    setEditingExecution(null);
    setToast({ message: "Execução atualizada!", type: 'success' });
  };

  const handleBulkApply = (status: Status, progress: number) => {
    if (!editingExecution) return;
    setSelectedFloors([]);
    setToast({ message: `${selectedFloors.length} pavimentos atualizados!`, type: 'success' });
  };

  const projectDisciplines = useMemo(() => {
    if (!project || !project.floors || project.floors.length === 0) return [];
    const discs = new Set<string>();
    project.floors.forEach(f => f.services.forEach(s => discs.add(s.name)));
    return Array.from(discs);
  }, [project]);

  const disciplineProgress = project && project.floors?.length ? projectDisciplines.map(name => {
    let total = 0, count = 0;
    (project.floors || []).forEach(f => {
      const s = f.services.find(svc => svc.name === name);
      if (s) { total += s.status === 'COMPLETED' ? 100 : s.status === 'IN_PROGRESS' ? 50 : 0; count++; }
    });
    return { name, progress: Math.round(total / (count || 1)) };
  }) : [];

  const totalProgress = useMemo(() => {
    if (!project || !project.name || !project.floors || project.floors.length === 0) return 0;
    if (project.phases && project.phases.length > 0) {
      const weightedSum = project.phases.reduce((acc, phase) => acc + (phase.progress * phase.weight), 0);
      const totalWeight = project.phases.reduce((acc, phase) => acc + phase.weight, 0);
      return Math.round(weightedSum / (totalWeight || 100));
    }
    return Math.round((project.floors || []).reduce((acc, f) => acc + getProgressPercentage(f.services || []), 0) / (project.floors?.length || 1));
  }, [project]);

if (currentMember) {
    // Membro logado - usar a mesma UI mas com permissões
    const defaultPerms: Record<string, string> = {
      DASHBOARD: 'VER',
      CRONOGRAMA: 'VER',
      PAVIMENTOS: 'VER',
      MEDICAO: 'VER',
      DOCUMENTOS: 'VER',
      PENDENCIAS: 'VER',
      MEDICAO_OBRA: 'VER'
    };
    const perms = currentMember.permissions || defaultPerms;
    const activeModule = currentMember.activeModule || 'welcome';
    
    const hasAccess = (module: string) => {
      const p = perms[module] || defaultPerms[module];
      return p === 'VER' || p === 'EDITAR';
    };
    
    const canEdit = (module: string) => {
      const p = perms[module] || defaultPerms[module];
      return p === 'EDITAR';
    };

    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        {mobileMenuOpen && (
          <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" />
        )}
        <aside className={`fixed lg:sticky inset-y-0 left-0 lg:top-0 lg:h-screen w-[280px] flex flex-col p-8 space-y-10 border-r border-white/5 bg-[var(--background)] z-50 lg:z-10 transform transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-2 font-black text-xl italic tracking-tighter text-white">
            <span className="flex items-center gap-3"><Building2 size={24}/> ObraFlow</span>
            <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white"><X size={20}/></button>
          </div>
          {/* Seletor de obra — visível quando membro tem acesso a mais de uma */}
          {companyProjects.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-2">Obra</p>
              <select
                value={activeProjectId || ''}
                onChange={e => { selectProject(e.target.value); setMobileMenuOpen(false); }}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold cursor-pointer outline-none hover:bg-white/10 transition-colors"
              >
                {companyProjects.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0d0d10] text-white">{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Obra única — apenas exibe o nome */}
          {companyProjects.length === 1 && (
            <div className="px-2 py-2 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Obra</p>
              <p className="text-sm font-bold text-white truncate">{companyProjects[0]?.name}</p>
            </div>
          )}
          <nav className="flex-1 space-y-2" onClick={() => setMobileMenuOpen(false)}>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">Menu</p>
            {hasAccess('DASHBOARD') && (
              <button onClick={() => setCurrentMember((prev: any) => ({ ...prev, activeModule: 'dashboard' }))} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeModule === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                <LayoutDashboard size={18} /> Dashboard
              </button>
            )}
            {hasAccess('CRONOGRAMA') && (
              <button onClick={() => setCurrentMember((prev: any) => ({ ...prev, activeModule: 'timeline' }))} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeModule === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                <Clock size={18} /> Cronograma
              </button>
            )}
            {hasAccess('PAVIMENTOS') && (
              <button onClick={() => setCurrentMember((prev: any) => ({ ...prev, activeModule: 'engineering' }))} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeModule === 'engineering' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                <Box size={18} /> Pavimentos
              </button>
            )}
            {hasAccess('MEDICAO') && (
              <button onClick={() => setCurrentMember((prev: any) => ({ ...prev, activeModule: 'measurement' }))} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeModule === 'measurement' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                <BarChart3 size={18} /> Medição
              </button>
            )}
            {hasAccess('DOCUMENTOS') && (
              <button onClick={() => setCurrentMember((prev: any) => ({ ...prev, activeModule: 'reports' }))} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeModule === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                <FileText size={18} /> Documentos
              </button>
            )}
            {hasAccess('PENDENCIAS') && (
              <button onClick={() => setCurrentMember((prev: any) => ({ ...prev, activeModule: 'pendencias' }))} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeModule === 'pendencias' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                <AlertTriangle size={18} /> Pendências
              </button>
            )}
            {hasAccess('MEDICAO_OBRA') && (
              <button onClick={() => setCurrentMember((prev: any) => ({ ...prev, activeModule: 'medicoes' }))} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeModule === 'medicoes' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                <DollarSign size={18} /> Medições
              </button>
            )}
          </nav>
          <button onClick={() => { setCurrentMember(null); supabase.auth.signOut(); }} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest border-t border-white/5 pt-8 mt-auto"><LogOut size={16} /> Sair</button>
        </aside>
        <main className="flex-1 overflow-y-auto pb-20 w-full">
          <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-[var(--background)]/80 backdrop-blur-md border-b border-white/5">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-white"><Menu size={24} /></button>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 font-black text-base italic text-white"><Building2 size={18}/> ObraFlow</div>
              {project && <p className="text-[10px] text-slate-500 font-bold truncate max-w-[160px]">{project.name}</p>}
            </div>
            <div className="w-10" />
          </header>
          <div className="p-4 md:p-10">
          {activeModule === 'dashboard' && hasAccess('DASHBOARD') && (
            <ModuleGuard module="DASHBOARD" memberPermissions={perms} access={canEdit('DASHBOARD') ? 'EDITAR' : 'VER'}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard title="Conclusão Total" value={`${totalProgress}%`} icon={BarChart3} growth="+4.5%" />
                  <StatCard title="Andares Ativos" value={project?.floors?.length || 0} icon={Building} color="text-blue-500 bg-blue-500/10" />
                  <StatCard title="Fases Andamento" value={phases?.length || 0} icon={Clock} color="text-amber-500 bg-amber-500/10" />
                  <StatCard title="Membros" value={1} icon={Users} color="text-purple-500 bg-purple-500/10" />
                </div>
                <PhaseSummary phases={phases} />
              </div>
            </ModuleGuard>
          )}
          {activeModule === 'timeline' && hasAccess('CRONOGRAMA') && canEdit('CRONOGRAMA') ? (
            <ConstructionTimeline 
              phases={phases}
              onAddPhase={(phase) => {
                setPhases(prev => {
                  const updated = [...prev, phase];
                  if (activeProjectId) {
                    saveProjectPhases(activeProjectId, updated);
                  }
                  return updated;
                });
              }}
              onRemovePhase={(phaseId) => {
                setPhases(prev => {
                  const updated = prev.filter(p => p.id !== phaseId);
                  if (activeProjectId) {
                    saveProjectPhases(activeProjectId, updated);
                  }
                  return updated;
                });
              }}
              onUpdatePhase={(phaseId, data) => {
                setPhases(prev => {
                  const updated = prev.map(p => p.id === phaseId ? { ...p, ...data } : p);
                  if (activeProjectId) {
                    saveProjectPhases(activeProjectId, updated);
                  }
                  return updated;
                });
              }}
            />
          ) : activeModule === 'timeline' && hasAccess('CRONOGRAMA') && (
            <ConstructionTimeline 
              phases={phases}
              onAddPhase={() => {}}
              onRemovePhase={() => {}}
              onUpdatePhase={() => {}}
            />
          )}
          {activeModule === 'engineering' && hasAccess('PAVIMENTOS') && canEdit('PAVIMENTOS') ? (
            <div className="glass-card p-10 rounded-[40px] animate-fade-in overflow-hidden">
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white">Matriz Técnica de Execução</h2>
                  <p className="text-sm text-slate-500">Controle de etapas e evolução por pavimento.</p>
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left whitespace-nowrap border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] border-b border-white/5">
                      <th className="pb-6 pl-4 w-48">Pavimento</th>
                      <th className="pb-6 w-32">Progresso</th>
                      {projectDisciplines.map(disc => (
                        <th key={disc} className="pb-6 px-4 min-w-[150px]">{disc}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(project?.floors || []).map(floor => {
                      const floorProgress = getProgressPercentage(floor.services || []);
                      return (
                        <tr key={floor.id} className="group transition-all">
                          <td className="py-4 pl-4 font-black text-sm text-slate-400 group-hover:text-white transition-colors">
                            {floor.label}
                          </td>
                          <td className="py-4 w-32">
                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-1000 ${floorProgress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${floorProgress}%` }} />
                            </div>
                          </td>
                          {projectDisciplines.map(disc => {
                            const svc = floor.services.find(s => s.name === disc);
                            const status = svc?.status || 'NOT_STARTED';
                            return (
                              <td key={disc} className="py-4 px-2">
                                <select
                                  value={status}
                                  onChange={(e) => {
                                    const newStatus = e.target.value as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
                                    const updatedFloors = (project?.floors || []).map(f => {
                                      if (f.id !== floor.id) return f;
                                      return {
                                        ...f,
                                        services: f.services.map(s => s.name === disc ? { ...s, status: newStatus } : s)
                                      };
                                    });
                                    setAllProjects(allProjects.map(ap => ap.id === project.id ? { ...ap, floors: updatedFloors } : ap));
                                    saveProject({ ...project, floors: updatedFloors });
                                  }}
                                  className={`px-3 py-2 rounded-xl text-xs font-bold text-center cursor-pointer ${
                                    status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' :
                                    status === 'IN_PROGRESS' ? 'bg-blue-600/10 text-blue-500' :
                                    'bg-white/5 text-slate-600'
                                  }`}
                                >
                                  <option value="NOT_STARTED">Pendente</option>
                                  <option value="IN_PROGRESS">Em Obra</option>
                                  <option value="COMPLETED">OK</option>
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeModule === 'engineering' && hasAccess('PAVIMENTOS') && (
            <div className="glass-card p-10 rounded-[40px] animate-fade-in overflow-hidden">
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white">Matriz Técnica de Execução</h2>
                  <p className="text-sm text-slate-500">Controle de etapas e evolução por pavimento.</p>
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left whitespace-nowrap border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] border-b border-white/5">
                      <th className="pb-6 pl-4 w-48">Pavimento</th>
                      <th className="pb-6 w-32">Progresso</th>
                      {projectDisciplines.map(disc => (
                        <th key={disc} className="pb-6 px-4 min-w-[150px]">{disc}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(project?.floors || []).map(floor => {
                      const floorProgress = getProgressPercentage(floor.services || []);
                      return (
                        <tr key={floor.id} className="group transition-all">
                          <td className="py-4 pl-4 font-black text-sm text-slate-400 group-hover:text-white transition-colors">
                            {floor.label}
                          </td>
                          <td className="py-4 w-32">
                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-1000 ${floorProgress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${floorProgress}%` }} />
                            </div>
                          </td>
                          {projectDisciplines.map(disc => {
                            const svc = floor.services.find(s => s.name === disc);
                            const status = svc?.status || 'NOT_STARTED';
                            return (
                              <td key={disc} className="py-4 px-2">
                                <div className={`px-3 py-2 rounded-xl text-xs font-bold text-center ${
                                  status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' :
                                  status === 'IN_PROGRESS' ? 'bg-blue-600/10 text-blue-500' :
                                  'bg-white/5 text-slate-600'
                                }`}>
                                  {status === 'COMPLETED' ? 'OK' : status === 'IN_PROGRESS' ? 'Em Obra' : 'Pendente'}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeModule === 'measurement' && hasAccess('MEDICAO') && (
            <ModuleGuard module="MEDICAO" memberPermissions={perms} access={canEdit('MEDICAO') ? 'EDITAR' : 'VER'}>
              <div className="glass-card p-8 rounded-[40px]">
                <h2 className="text-lg font-black text-white mb-4">Medição</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {disciplineProgress.map(d => (
                    <div key={d.name} className="p-4 bg-white/5 rounded-xl">
                      <p className="text-sm text-slate-500">{d.name}</p>
                      <p className="text-xl font-black text-white mt-1">{d.progress}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </ModuleGuard>
          )}
          {activeModule === 'reports' && hasAccess('DOCUMENTOS') && (
            <ModuleGuard module="DOCUMENTOS" memberPermissions={perms} access={canEdit('DOCUMENTOS') ? 'EDITAR' : 'VER'}>
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="glass-card p-6 rounded-2xl cursor-pointer hover:bg-white/5 transition-all">
                    <h3 className="font-black text-white mb-2">Andamento por Andar</h3>
                    <p className="text-sm text-slate-500">Status de cada disciplina</p>
                  </div>
                  <div className="glass-card p-6 rounded-2xl cursor-pointer hover:bg-white/5 transition-all">
                    <h3 className="font-black text-white mb-2">Cronograma de Fases</h3>
                    <p className="text-sm text-slate-500">Progresso detalhado</p>
                  </div>
                  <div className="glass-card p-6 rounded-2xl cursor-pointer hover:bg-white/5 transition-all">
                    <h3 className="font-black text-white mb-2">Resumo Geral</h3>
                    <p className="text-sm text-slate-500">Planilha completa</p>
                  </div>
                </div>
              </div>
            </ModuleGuard>
          )}
          {activeModule === 'pendencias' && hasAccess('PENDENCIAS') && (
            <ModuleGuard module="PENDENCIAS" memberPermissions={perms} access={canEdit('PENDENCIAS') ? 'EDITAR' : 'VER'}>
              <PendenciasSection 
                projectId={activeProjectId || ''}
                currentUserName={currentMember.name}
                canEdit={canEdit('PENDENCIAS')}
              />
            </ModuleGuard>
          )}
          {activeModule === 'medicoes' && hasAccess('MEDICAO_OBRA') && (
            <ModuleGuard module="MEDICAO_OBRA" memberPermissions={perms} access={canEdit('MEDICAO_OBRA') ? 'EDITAR' : 'VER'}>
              <MedicaoObraSection 
                projectId={activeProjectId || ''}
                currentUserName={currentMember.name}
              />
            </ModuleGuard>
          )}
          {(!activeModule || activeModule === 'welcome') && (
            <div className="glass-card p-8 rounded-[40px]">
              <h2 className="text-lg font-black text-white mb-4">Bem-vindo, {currentMember.name}</h2>
              <p className="text-sm text-slate-500 mb-6">Selecione uma seção no menu.</p>
            </div>
          )}
          </div>
        </main>
      </div>
    );
  }

  if (!currentUser && !currentMember) return <Auth onLogin={handleLogin} />;
  if (!currentUser) return null;
  
  if (currentUser.isActive === false) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6 text-center">
        <div className="glass-card max-w-sm p-10 rounded-[32px] border-rose-500/10">
          <AlertTriangle className="text-rose-500 mx-auto mb-6" size={56} />
          <h1 className="text-2xl font-black text-white mb-2">Acesso Bloqueado</h1>
          <p className="text-slate-400 mb-8">Seu acesso foi bloqueado. Contate o administrador.</p>
          <button onClick={() => { setCurrentUser(null); signOut(); }} className="btn-primary w-full">Sair</button>
        </div>
      </div>
    );
  }
  
  if (currentCompany && currentCompany.isPaused && currentUser.role !== 'SUPERADMIN') {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6 text-center">
        <div className="glass-card max-w-sm p-10 rounded-[32px] border-rose-500/10">
          <AlertTriangle className="text-rose-500 mx-auto mb-6" size={56} />
          <h1 className="text-2xl font-black text-white mb-2">Acesso Suspenso</h1>
          <p className="text-slate-400 mb-8">Contate o suporte.</p>
          <button onClick={() => { setCurrentUser(null); signOut(); }} className="btn-primary w-full">Sair</button>
        </div>
      </div>
    );
  }

  const planEndDate = currentCompany?.planEndDate ? new Date(currentCompany.planEndDate) : null;
  const today = new Date();
  const daysRemaining = planEndDate && currentCompany ? Math.max(0, Math.ceil((planEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))) : null;
  const showExpirationWarning = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && currentUser.role !== 'SUPERADMIN' && currentCompany !== null;

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
      {toast && <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-2 rounded-full bg-blue-600 text-white animate-fade-in text-xs font-black shadow-xl shadow-blue-500/30">{toast.message}</div>}

      {/* Alerta de Expiração para Clientes */}
      {showExpirationWarning && activeTab !== 'engineering' && (
        <div className="fixed bottom-10 right-10 z-[90] glass-card p-8 rounded-[32px] border-amber-500/20 max-w-xs animate-fade-in shadow-[0_20px_50px_rgba(245,158,11,0.15)] bg-[#0d0d10]">
           <div className="flex items-center gap-3 mb-4 text-amber-500">
              <AlertTriangle size={24} />
              <p className="text-sm font-black uppercase tracking-widest">Atenção</p>
           </div>
           <p className="text-white text-sm font-bold mb-6">Sua assinatura expira em <span className="text-amber-500">{daysRemaining} dias</span>. Renove agora para não perder o acesso aos seus projetos.</p>
           <button className="w-full btn-primary bg-amber-600 shadow-amber-600/20">Renovar Agora</button>
        </div>
      )}

      {isAddingMember && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-md p-10 rounded-[40px] border-white/5 relative overflow-hidden">
             <h2 className="text-2xl font-black text-white mb-8">Convidar Membro</h2>
             <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleAddMember({ name: fd.get('name'), role: fd.get('role'), email: fd.get('email') }); }} className="space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 ml-1 uppercase">Nome</label><input required name="name" className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all" placeholder="Nome do Profissional" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 ml-1 uppercase">Cargo / Função</label><input required name="role" className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all" placeholder="Ex: Engenheiro Civil, Hidráulico..." /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 ml-1 uppercase">E-mail</label><input required name="email" type="email" className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all" placeholder="e-mail@empresa.com" /></div>
                <div className="flex gap-4 pt-6"><button type="button" onClick={() => setIsAddingMember(false)} className="flex-1 py-4 text-slate-500 font-black text-xs uppercase tracking-widest">Cancelar</button><button type="submit" className="flex-2 btn-primary">Convidar</button></div>
             </form>
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" />
      )}
      <aside className={`fixed lg:sticky inset-y-0 left-0 lg:top-0 lg:h-screen w-[280px] flex flex-col p-8 space-y-10 border-r border-white/5 bg-[var(--background)] z-50 lg:z-10 transform transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2 font-black text-xl italic tracking-tighter text-white">
          <span className="flex items-center gap-3"><Building2 size={24}/> ObraFlow</span>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white"><X size={20}/></button>
        </div>
        <nav className="flex-1 space-y-8 no-scrollbar overflow-y-auto" onClick={() => setMobileMenuOpen(false)}>
          {currentUser.role === 'SUPERADMIN' ? (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">Administração SaaS</p>
              <NavItem icon={Shield} label="Painel Master" active={activeTab === 'admin_dashboard'} onClick={() => setActiveTab('admin_dashboard')} />
              <NavItem icon={CreditCard} label="Faturamento" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
              <NavItem icon={Package} label="Planos" active={activeTab === 'plans_catalog'} onClick={() => setActiveTab('plans_catalog')} />
              <NavItem icon={Settings} label="Configurações" active={activeTab === 'admin_settings'} onClick={() => setActiveTab('admin_settings')} />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">Principal</p>
                <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavItem icon={Clock} label="Cronograma" active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} />
                <NavItem icon={CalendarIcon} label="Calendário" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
                <NavItem icon={Box} label="Gestão Técnica" active={activeTab === 'engineering'} onClick={() => setActiveTab('engineering')} />
                <NavItem icon={Building} label="Projetos" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
                <NavItem icon={Users} label="Equipe" active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">Mais</p>
                <NavItem icon={FileText} label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
              <NavItem icon={AlertTriangle} label="Pendências" active={activeTab === 'pendencias'} onClick={() => setActiveTab('pendencias')} />
              <NavItem icon={DollarSign} label="Medições" active={activeTab === 'medicoes'} onClick={() => setActiveTab('medicoes')} />
                <NavItem icon={Settings} label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
              </div>
            </>
          )}
        </nav>
        <button onClick={() => { setCurrentUser(null); signOut(); }} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest border-t border-white/5 pt-8 mt-auto"><LogOut size={16}/> Sair</button>
      </aside>


      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 w-full">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 md:px-10 py-4 md:py-6 bg-[var(--background)]/80 backdrop-blur-md">
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-white shrink-0"><Menu size={24} /></button>
          <div className="flex-1 max-w-[500px] relative hidden md:block"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} /><input className="search-bar w-full" placeholder="Buscar no sistema..." /></div>
          <div className="flex-1 md:hidden flex items-center justify-center gap-2 font-black text-base italic text-white"><Building2 size={18}/> ObraFlow</div>
          <div className="flex items-center gap-3 md:gap-6 shrink-0"><Bell className="text-slate-500" size={20}/><div className="flex items-center gap-3 md:pl-6 md:border-l border-white/5 text-right"><div className="hidden sm:block"><p className="text-sm font-bold text-white">{currentUser.name}</p><p className="text-[9px] text-slate-500 font-black uppercase">{currentUser.role}</p></div><div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-black">{currentUser.name[0]}</div></div></div>
        </header>

        <div className="px-4 md:px-10 mt-6 space-y-10">
          {currentUser.role === 'SUPERADMIN' && activeTab === 'admin_dashboard' && (
             <AdminPanel 
                companies={companies} 
                users={allUsers}
                togglePause={togglePauseCompany} 
                impersonate={(id: string) => { setCurrentViewCompanyId(id); setActiveTab('dashboard'); }} 
                onRenew={(id: string) => {
                   setCompanies(prev => prev.map(c => {
                      if (c.id === id) {
                         const currentEnd = new Date(c.planEndDate || Date.now());
                         const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + 30 * 24 * 60 * 60 * 1000);
                         return { ...c, planEndDate: newEnd.toISOString(), billingStatus: 'ACTIVE', isPaused: false };
                      }
                      return c;
                   }));
setToast({ message: "Plano renovado por +30 dias!", type: 'success' });
                 }}
                 onChangePlan={(companyId: string) => {
                    const company = companies.find(c => c.id === companyId);
                    if (company) setChangePlanCompany(company);
                 }}
onToggleUser={async (userId: string, isActive: boolean) => {
                    await updateUserActive(userId, isActive);
                    const refreshedUsers = await getAllUsers();
                    setAllUsers(refreshedUsers.map((u: any) => ({
                      ...u,
                      isActive: u.isActive ?? u.is_active ?? true
                    })));
                    setToast({ message: isActive ? "Usuário ativado!" : "Usuário desativado!", type: 'success' });
                 }}
                onDeleteUser={async (userId: string) => {
                   if (confirm('Tem certeza que deseja excluir este usuário?')) {
                      try {
                        const usersBefore = await getAllUsers();
                        const userToDelete = usersBefore.find((u: any) => u.id === userId);
                        const companyIdToCheck = userToDelete?.companyId;

                        const deleted = await deleteUser(userId);
                        if (!deleted) {
                          setToast({ message: "Erro ao excluir usuário", type: 'error' });
                          return;
                        }

                        const updatedUsers = await getAllUsers();

                        if (companyIdToCheck) {
                          const remainingUsersInCompany = updatedUsers.filter((u: any) => u.companyId === companyIdToCheck);
                          if (remainingUsersInCompany.length === 0) {
                            deleteCompany(companyIdToCheck);
                            deleteProjectsByCompany(companyIdToCheck);
                          }
                        }
                        
                        setToast({ message: "Usuário excluído! Atualizando...", type: 'success' });
                        
                        setTimeout(() => {
                          window.location.reload();
                        }, 1000);
                      } catch (error) {
                        console.error('Delete error:', error);
                        setToast({ message: "Erro ao processar exclusão", type: 'error' });
                      }
                   }
                }}
onRefresh={async () => {
                    const [freshCompanies, freshUsers] = await Promise.all([
                      loadCompanies(),
                      getAllUsers(),
                    ]);
                    setCompanies(freshCompanies);
                    setAllUsers(freshUsers);
                    setToast({ message: "Dados atualizados do Supabase!", type: 'success' });
                 }}
                onReset={() => {
                   if (confirm('ATENÇÃO: Isso vai excluir TODOS os dados (usuários, empresas, projetos). Continuar?')) {
                      resetToCleanState();
                      window.location.reload();
                   }
                }}
              />
          )}

{currentUser.role === 'SUPERADMIN' && activeTab === 'billing' && (
              <BillingPanel companies={companies} />
           )}

           {currentUser.role === 'SUPERADMIN' && activeTab === 'plans_catalog' && (
              <PlansCatalog
                onToast={(message, type) => setToast({ message, type })}
              />
           )}

           {currentUser.role === 'SUPERADMIN' && activeTab === 'admin_settings' && (
              <AdminSettings 
                currentUser={currentUser} 
                onUpdateUser={(user) => {
                  setCurrentUser(user);
                  setToast({ message: 'Perfil atualizado!', type: 'success' });
                }} 
              />
           )}

           {currentUser.role !== 'SUPERADMIN' && (
            <div className="animate-fade-in space-y-10">
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Gestão de Fluxo</h1>
<p className="text-slate-500 text-sm flex items-center gap-2">
                        <Building2 size={14} className="text-blue-500" />
                        {currentCompany?.name || 'Nenhuma empresa'} • {project?.name || 'Nenhum projeto'}
                     </p>
                  </div>
<div className="flex gap-4">
                      <button onClick={() => setIsConfigModalOpen(true)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all group">
                         <Building size={16} className="group-hover:-translate-y-1 transition-transform" /> 
                         Configurar Prédio
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all group">
                         <Upload size={16} className="group-hover:-translate-y-1 transition-transform" /> 
                         Importar
                      </button>
                      <button onClick={openNewProjectModal} className="btn-primary flex items-center gap-2 shadow-blue-600/40">
                         <Plus size={18}/> Nova Obra
                      </button>
</div>
                </div>

                  {activeTab === 'dashboard' && (
                    <div className="space-y-10">
                      <ProjectSelectorBar 
                        projects={companyProjects}
                        activeProjectId={activeProjectId}
                        onSelectProject={selectProject}
                        onCreateProject={openNewProjectModal}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Conclusão Total" value={`${totalProgress}%`} icon={BarChart3} growth="+4.5%" />
                        <StatCard title="Andares Ativos" value={project?.floors?.length || 0} icon={Building} color="text-blue-500 bg-blue-500/10" />
                        <StatCard title="Gargalos Criados" value="0" icon={AlertTriangle} color="text-rose-500 bg-rose-500/10" />
                        <StatCard title="Membros" value={team.length} icon={Users} color="text-amber-500 bg-amber-500/10" />
                      </div>
                      
                      {phases.length === 0 ? (
                        <EmptyPhaseState 
                          onUseTemplate={(templatePhases) => {
                            setPhases(templatePhases);
                            if (activeProjectId) {
                              saveProjectPhases(activeProjectId, templatePhases);
                            }
                            setShowEmptyPhaseState(false);
                          }}
                          onAddManually={() => setShowEmptyPhaseState(false)}
                        />
                      ) : (
                        <PhaseSummary phases={phases} />
                      )}
                      
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                        <div className="xl:col-span-2">
                          <ModuleGuard module="DASHBOARD" access="VER">
                            <DashboardCharts disciplineData={disciplineProgress} floorData={project?.floors || []} companyId={currentViewCompanyId} />
                          </ModuleGuard>
                        </div>
                        <div className="xl:col-span-1 space-y-6">
                          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                            <button onClick={() => setViewMode('2d')} className={cn("flex-1 py-3 rounded-xl text-xs font-black transition-all", viewMode === '2d' ? "bg-blue-600 text-white" : "text-slate-500")}>Mapa 2D</button>
                            <button onClick={() => setViewMode('3d')} className={cn("flex-1 py-3 rounded-xl text-xs font-black transition-all", viewMode === '3d' ? "bg-blue-600 text-white" : "text-slate-500")}>3D</button>
                          </div>
                          <div className="glass-card rounded-[40px] p-6 h-[500px] flex items-center justify-center">
                            {viewMode === '2d' ? <BuildingMap floors={project?.floors || []} selectedFloor={selectedFloor?.number} onFloorClick={setSelectedFloor} /> : <Building3D floors={project?.floors || []} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'timeline' && (
                    <ModuleGuard module="CRONOGRAMA" access="VER">
                      <ConstructionTimeline 
                        phases={phases}
                        onAddPhase={(phase) => {
                          const updated = [...phases, phase];
                          setPhases(updated);
                          if (activeProjectId) {
                            saveProjectPhases(activeProjectId, updated);
                          }
                        }}
                        onRemovePhase={(phaseId) => {
                          const updated = phases.filter(p => p.id !== phaseId);
                          setPhases(updated);
                          if (activeProjectId) {
                            saveProjectPhases(activeProjectId, updated);
                          }
                        }}
                        onUpdatePhase={(phaseId, data) => {
                          const updated = phases.map(p => p.id === phaseId ? { ...p, ...data } : p);
                          setPhases(updated);
                          if (activeProjectId) {
                            saveProjectPhases(activeProjectId, updated);
                          }
                        }}
                      />
                    </ModuleGuard>
                  )}

{activeTab === 'calendar' && <ConstructionCalendar companyId={currentViewCompanyId} projectId={activeProjectId} />}

                {activeTab === 'engineering' && (
                  <ModuleGuard module="PAVIMENTOS" access="VER">
                    <div className="glass-card p-10 rounded-[40px] animate-fade-in overflow-hidden">
                    <div className="flex justify-between items-center mb-10">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-black text-white">Matriz Técnica de Execução</h2>
                        <p className="text-sm text-slate-500">Controle de etapas e evolução por pavimento.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {showAddDiscipline ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={newDisciplineName}
                              onChange={(e) => setNewDisciplineName(e.target.value)}
                              placeholder="Nome da disciplina"
                              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                              autoFocus
                            />
                            <button onClick={handleAddDiscipline} className="p-2 bg-emerald-600 rounded-xl text-white hover:bg-emerald-500">
                              <Plus size={18} />
                            </button>
                            <button onClick={() => { setShowAddDiscipline(false); setNewDisciplineName(''); }} className="p-2 text-slate-500 hover:text-white">
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowAddDiscipline(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold"
                          >
                            <Plus size={16} />
                            Adicionar Disciplina
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left whitespace-nowrap border-separate border-spacing-y-2">
                        <thead>
                          <tr className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] border-b border-white/5">
                            <th className="pb-6 pl-4 w-48">Pavimento</th>
                            <th className="pb-6 w-32">Progresso</th>
                            {projectDisciplines.map(disc => {
                              return (
                                <th key={disc} className="pb-6 px-4 min-w-[150px]">
                                  <div className="flex items-center justify-between gap-2">
                                    <span>{disc}</span>
                                    <button 
                                      onClick={() => handleRemoveDiscipline(disc)}
                                      className="text-slate-600 hover:text-rose-500"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {(project?.floors || []).map(floor => {
                            const floorProgress = getProgressPercentage(floor.services || []);
                            return (
                              <tr key={floor.id} className="group transition-all">
                                <td className="py-4 pl-4 font-black text-sm text-slate-400 group-hover:text-white transition-colors">
                                  {floor.label}
                                </td>
                                <td className="py-4 w-32">
                                  <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full transition-all duration-1000",
                                        floorProgress === 100 ? "bg-emerald-500" : "bg-blue-600"
                                      )} 
                                      style={{ width: `${floorProgress}%` }} 
                                    />
                                  </div>
                                </td>
                                {projectDisciplines.map(disc => {
                                  const svc = floor.services.find(s => s.name === disc);
                                  const status = svc?.status || 'NOT_STARTED';
                                  return (
                                    <td key={disc} className="py-4 px-2">
                                      <button 
                                        onClick={() => {
                                          const nextStatus: Status = status === 'NOT_STARTED' ? 'IN_PROGRESS' : status === 'IN_PROGRESS' ? 'COMPLETED' : 'NOT_STARTED';
                                          if (project) {
                                            const updatedProjects = allProjects.map(ap => ap.id === project.id ? { 
                                              ...ap, 
                                              floors: (ap.floors || []).map(f => {
                                                if (f.id !== floor.id) return f;
                                                const services = (f.services || []).map(s => s.name === disc ? { ...s, status: nextStatus } : s);
                                                return { ...f, services };
                                              }) 
                                            } : ap);
                                            setAllProjects(updatedProjects);
                                            saveProjects(updatedProjects);
                                          }
                                        }}
                                        className={cn(
                                          "w-full py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2",
                                          status === 'COMPLETED' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                          status === 'IN_PROGRESS' ? "bg-blue-600/10 border-blue-600/20 text-blue-500" :
                                          "bg-white/[0.02] border-white/5 text-slate-600 hover:border-white/20 hover:text-slate-400"
                                        )}
                                      >
                                        <div className={cn("w-1.5 h-1.5 rounded-full",
                                          status === 'COMPLETED' ? "bg-emerald-500" :
                                          status === 'IN_PROGRESS' ? "bg-blue-500" : "bg-slate-700"
                                        )} />
                                        {status === 'COMPLETED' ? 'Finalizado' : status === 'IN_PROGRESS' ? 'Em Obra' : 'Pendente'}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </ModuleGuard>
                )}

                {activeTab === 'projects' && editingProjectIndex !== null && editingProjectIndex < companyProjects.length && companyProjects[editingProjectIndex] ? (
                     <ProjectEditCard 
                       project={companyProjects[editingProjectIndex]}
                       companyId={currentViewCompanyId}
                       onUpdate={(p) => {
                         const updated = allProjects.map(ap => ap.id === p.id ? p : ap);
                         setAllProjects(updated);
                         saveProjects(updated);
                       }}
                       onDelete={() => handleDeleteProject(companyProjects[editingProjectIndex].id)}
                       onClose={() => setEditingProjectIndex(null)}
                     />
                   ) : activeTab === 'projects' && companyProjects.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {companyProjects.length === 0 ? (
                          <div className="col-span-full glass-card p-12 rounded-[40px] text-center">
                            <h3 className="text-xl font-black text-white mb-4">Nenhum projeto encontrado</h3>
                            <p className="text-slate-500 mb-6">Crie seu primeiro projeto para começar</p>
                            <button onClick={openNewProjectModal} className="btn-primary">Criar Projeto</button>
                          </div>
                        ) : (
                          companyProjects.map((p, i) => (
                           <div key={p.id} className={cn("glass-card rounded-[40px] cursor-pointer group hover:scale-[1.02] transition-all relative overflow-hidden", currentProjectIndex === i ? "border-blue-600 border-2" : "border-white/5")}>
                              <button
                                onClick={async (e) => { e.stopPropagation(); if (p && p.id) { setCurrentProjectIndex(i); setActiveProjectId(p.id); const savedPhases = await loadProjectPhases(p.id); setPhases(savedPhases || []); const savedConfig = await loadProjectConfig(p.id); setBuildingConfig(savedConfig); if (savedPhases && savedPhases.length > 0) { setShowEmptyPhaseState(false); } else { setShowEmptyPhaseState(true); } if (editingProjectIndex !== null) setEditingProjectIndex(null); else setEditingProjectIndex(i); } }}
                                className="absolute top-4 right-4 z-10 p-2 bg-blue-600/80 backdrop-blur-sm text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Pencil size={16} />
                              </button>
                              {p.coverPhoto && (
                                <div className="relative h-40 w-full overflow-hidden">
                                  <img
                                    src={p.coverPhoto}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                </div>
                              )}
                              <div className="p-10">
                                <h3 className="text-2xl font-black text-white mb-2">{p.name}</h3>
                                <p className="text-slate-500 text-xs mb-4">{p.location || 'Sem localização'}</p>
                                <p className="text-slate-500 text-xs mb-8">{p.floors?.length || 0} pavimentos</p>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-600" style={{ width: `${p.floors?.[0] ? getProgressPercentage(p.floors?.[0]?.services || []) : 0}%` }} />
                                </div>
                              </div>
                           </div>
                          ))
                        )}
                     </div>
               ) : null}

{activeTab === 'teams' && (
                   <TeamPage ownerId={currentUser?.id || 'default'} companyId={currentUser?.companyId || ''} plan="GOLD" />
                )}

{activeTab === 'reports' && (
                  <div className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ReportCard title="Andamento por Andar" desc="Status de cada disciplina por pavimento" onClick={async () => {
                           const meta = await loadExportMeta(currentUser?.companyId || '');
                           const rows = (project?.floors || []).sort((a,b) => a.number - b.number).flatMap(f =>
                             f.services.map(s => {
                               const pct = s.status === 'COMPLETED' ? 100 : s.status === 'IN_PROGRESS' ? 50 : 0;
                               return { pavimento: f.label, tipo: f.type, disciplina: s.name, status: (s.status || '').replace('_',' '), progresso: `${pct}%` };
                             })
                           );
                           await exportAndamento(rows, `andamento_tecnico_${(project?.name || 'obra').replace(/\s/g,'_')}.xlsx`, meta);
                           setToast({ message: "Relatório gerado!", type: 'success' });
                        }}/>
                        <ReportCard title="Cronograma de Fases" desc="Progresso detalhado de todas as fases" onClick={async () => {
                           if (!phases || phases.length === 0) {
                             setToast({ message: "Nenhuma fase cadastrada!", type: 'error' });
                             return;
                           }
                           const meta = await loadExportMeta(currentUser?.companyId || '');
                           const rows = phases.flatMap(p => {
                             const subStepsConcluidas = p.subSteps.filter((s: any) => s.status === 'COMPLETED').length;
                             const phaseRow = { nome: p.name, peso: p.weight, progresso: `${p.progress}%`, status: (p.status || '').replace('_',' '), inicio: p.startDate || '-', previsaoFim: p.endDate || '-', responsavel: p.responsible || '-', subEtapas: `${subStepsConcluidas}/${p.subSteps.length}`, isSubStep: false };
                             const subRows = p.subSteps.map((s: any) => ({ nome: `  ${s.name}`, peso: '', progresso: `${s.progress}%`, status: (s.status || '').replace('_',' '), inicio: '', previsaoFim: '', responsavel: s.responsible || '-', subEtapas: '', isSubStep: true }));
                             return [phaseRow, ...subRows];
                           });
                           await exportCronograma(rows, `cronograma_${(project?.name || 'obra').replace(/\s/g,'_')}.xlsx`, meta);
                           setToast({ message: "Relatório gerado!", type: 'success' });
                        }}/>
                        <ReportCard title="Resumo Geral da Obra" desc="Planilha completa com todos os dados" onClick={async () => {
                           const meta = await loadExportMeta(currentUser?.companyId || '');
                           const totalAndares = (project?.floors || []).length;
                           const andaresConcluidos = (project?.floors || []).filter(f => f.services.every(s => s.status === 'COMPLETED')).length || 0;
                           const andaresEmObra = (project?.floors || []).filter(f => f.services.some(s => s.status === 'IN_PROGRESS')).length || 0;
                           const disciplinasConcluidas = (project?.floors || []).reduce((acc, f) => acc + f.services.filter((s: any) => s.status === 'COMPLETED').length, 0) || 0;
                           const totalDisciplinas = (project?.floors || []).reduce((acc, f) => acc + f.services.length, 0) || 0;
                           const fasesConcluidas = phases.filter(p => p.status === 'COMPLETED').length;
                           const fasesEmAndamento = phases.filter(p => p.status === 'IN_PROGRESS').length;
                           const subStepsConcluidas = phases.reduce((acc, p) => acc + p.subSteps.filter((s: any) => s.status === 'COMPLETED').length, 0);
                           const progressoGeral = phases.length > 0 ? Math.round(phases.reduce((acc, p) => acc + p.progress, 0) / phases.length) : 0;
                           const getStatus = (f: any, name: string) => {
                             const s = f.services.find((svc: any) => svc.name === name);
                             return s?.status === 'COMPLETED' ? 'OK' : s?.status === 'IN_PROGRESS' ? 'AND' : 'PEN';
                           };
                           await exportResumoGeral({
                             projectName: project?.name || 'Obra',
                             data: new Date().toLocaleDateString('pt-BR'),
                             summary: [
                               { label: 'Andares Totais', value: String(totalAndares) },
                               { label: 'Andares Concluídos', value: String(andaresConcluidos) },
                               { label: 'Andares em Obra', value: String(andaresEmObra) },
                               { label: 'Disciplinas Concluídas', value: `${disciplinasConcluidas}/${totalDisciplinas}` },
                               { label: 'Fases Concluídas', value: `${fasesConcluidas}/${phases.length}` },
                               { label: 'Fases em Andamento', value: String(fasesEmAndamento) },
                               { label: 'Sub-etapas Concluídas', value: String(subStepsConcluidas) },
                               { label: 'Progresso Geral', value: `${progressoGeral}%` },
                             ],
                             fases: phases.map(p => ({
                               nome: p.name,
                               peso: `${p.weight}%`,
                               progresso: `${p.progress}%`,
                               status: p.status || '',
                               subEtapas: `${p.subSteps.filter((s: any) => s.status === 'COMPLETED').length}/${p.subSteps.length}`,
                               responsavel: p.responsible || '-',
                             })),
                             andares: (project?.floors || []).sort((a,b) => a.number - b.number).map(f => ({
                               label: f.label, tipo: f.type,
                               eletrica: getStatus(f, 'Elétrica'),
                               hidraulica: getStatus(f, 'Hidráulica'),
                               alvenaria: getStatus(f, 'Alvenaria'),
                               revestimento: getStatus(f, 'Revestimento'),
                             })),
                           }, `relatorio_completo_${(project?.name || 'obra').replace(/\s/g,'_')}.xlsx`, meta);
                           setToast({ message: "Relatório gerado!", type: 'success' });
                        }}/>
                     </div>
                  </div>
                )}

{activeTab === 'pendencias' && (
                  <PendenciasSection 
                    projectId={activeProjectId || ''}
                    currentUserName={currentUser?.name || 'Engenheiro'}
                    canEdit={true}
                  />
                )}

{activeTab === 'medicoes' && (
                  <MedicaoObraSection
                    projectId={activeProjectId || ''}
                    currentUserName={currentUser?.name || 'Engenheiro'}
                    companyId={currentUser?.companyId || ''}
                  />
                )}

{activeTab === 'settings' && (
                  <div className="glass-card p-10 rounded-[40px] max-w-2xl">
                     <h2 className="text-2xl font-black text-white mb-8">Ajustes da Conta</h2>
                     
                      <div className="flex items-center gap-6 mb-10">
                        <div className="relative">
                          {currentUser?.avatar ? (
                            <img src={currentUser.avatar} alt="Foto de perfil" className="w-24 h-24 rounded-full object-cover border-4 border-blue-500" />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center border-4 border-slate-600">
                              <span className="text-3xl font-black text-white">{currentUser?.name?.charAt(0) || '?'}</span>
                            </div>
                          )}
                          <button 
                            onClick={() => profileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full hover:bg-blue-500 transition-all"
                          >
                            <Camera className="w-4 h-4 text-white" />
                          </button>
                          <input 
                            ref={profileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleProfilePhotoChange}
                          />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white">{currentUser?.name}</h3>
                          <p className="text-slate-500 text-sm">{(() => {
                        const role = currentUser?.role as string;
                        if (role === 'SUPERADMIN') return 'Administrador';
                        if (role === 'ADMIN') return 'Gestor';
                        if (role === 'ENGINEER') return 'Engenheiro';
                        return 'Visualizador';
                      })()}</p>
                        </div>
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="bg-slate-800/50 p-4 rounded-2xl">
                          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">E-mail</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="email" 
                              defaultValue={currentUser?.email}
                              className="bg-transparent text-white font-medium flex-1 outline-none"
                              readOnly={!isEditingProfile}
                              id="settings-email"
                            />
                            <button 
                              onClick={() => setIsEditingProfile(!isEditingProfile)}
                              className="text-blue-400 text-sm hover:text-blue-300"
                            >
                              {isEditingProfile ? 'Cancelar' : 'Editar'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="bg-slate-800/50 p-4 rounded-2xl">
                          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">Senha</label>
                          {!isChangingPassword ? (
                            <div key="pwd-display" className="flex items-center gap-3">
                              <span className="text-white font-medium tracking-widest flex-1">••••••••</span>
                              <button
                                onClick={() => setIsChangingPassword(true)}
                                className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1"
                              >
                                <Key className="w-3 h-3" />
                                Alterar
                              </button>
                            </div>
                          ) : (
                            <div key="pwd-form" className="space-y-3">
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nova senha (mín. 6 caracteres)"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500"
                                autoFocus
                              />
                              <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirmar nova senha"
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setIsChangingPassword(false);
                                    setNewPassword('');
                                    setConfirmPassword('');
                                  }}
                                  disabled={savingPassword}
                                  className="flex-1 py-2 text-slate-400 hover:text-white text-sm font-bold"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={handleChangePassword}
                                  disabled={savingPassword}
                                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-white text-sm font-bold"
                                >
                                  {savingPassword ? 'Salvando...' : 'Salvar nova senha'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditingProfile && (
                        <button 
                          onClick={() => {
                            const email = (document.getElementById('settings-email') as HTMLInputElement)?.value;
                            handleSaveAccount({ email, password: '' });
                          }}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-white transition-all"
                        >
                          Salvar Alterações
                        </button>
                      )}

                      <div className="mt-10 pt-8 border-t border-white/10">
                        <h4 className="font-bold text-white mb-4">Preferências</h4>
                        <div className="space-y-6">
                           <SettingOption title="Notificações via WhatsApp" desc="Receber alertas sobre atrasos de fornecedores." checked />
                           <SettingOption title="Monitoramento 3D Privado" desc="Restringir visualização do prédio a engenheiros." checked={false} />
                        </div>
                      </div>
                   </div>
                )}
            </div>
          )}
        </div>

        <BuildingConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => {
            setIsConfigModalOpen(false);
            setIsCreatingNewProject(false);
          }}
          onSave={handleSaveBuildingConfig}
          existingConfig={isCreatingNewProject ? null : buildingConfig}
        />

        <FloorEditModal
          isOpen={!!editingFloor}
          floor={editingFloor}
          onSave={handleSaveFloor}
          onDelete={handleDeleteFloor}
          onClose={() => setEditingFloor(null)}
          hasExecutions={phases.some(p => p.subSteps.some(s => s.floorExecutions?.some(fe => editingFloor && fe.floorId === editingFloor.id)))}
        />

        <BulkEditBar
          selectedCount={selectedFloors.length}
          onApply={handleBulkApply}
          onCancel={() => setSelectedFloors([])}
        />

        <FloorDetail floor={selectedFloor ? { ...selectedFloor, services: [...selectedFloor.services], photos: [...(selectedFloor.photos || [])] } : null} onClose={() => setSelectedFloor(null)} onStatusChange={(fId, sName, val) => {
            if (!project) return;
            setAllProjects(allProjects.map(ap => ap.id === project?.id ? { ...ap, floors: (ap.floors || []).map(f => f.id === fId ? { ...f, services: (f.services || []).map(s => s.name === sName ? { ...s, status: val } : s) } : f) } : ap));
            saveProjects(allProjects);
            setToast({ message: "Sincronizado!", type: 'success' });
        }} onPhotoUpload={(fId, photos) => {
            if (!project) return;
            setAllProjects(allProjects.map(ap => ap.id === project?.id ? { ...ap, floors: (ap.floors || []).map(f => f.id === fId ? { ...f, photos } : f) } : ap));
            saveProjects(allProjects);
        }} existingPhotos={selectedFloor?.photos || []} />
      </main>

      {changePlanCompany && (
        <ChangePlanModal
          company={changePlanCompany}
          onCancel={() => setChangePlanCompany(null)}
          onConfirm={async (plan) => {
            const updated: Company = {
              ...changePlanCompany,
              plan: plan.name,
              monthlyValue: plan.monthlyValue,
            };
            const result = await saveCompany(updated);
            if (!result.ok) {
              setToast({ message: `Erro ao alterar plano: ${result.error}`, type: 'error' });
              return;
            }
            const fresh = await loadCompanies();
            setCompanies(fresh);
            setToast({ message: `Plano alterado para ${plan.name}!`, type: 'success' });
            setChangePlanCompany(null);
          }}
        />
      )}
    </div>
  );
}







function AdminPanel({ companies, users, togglePause, impersonate, onRenew, onToggleUser, onDeleteUser, onRefresh, onReset, onChangePlan }: any) {
  const now = new Date();
  const expiringSoon = companies.filter((c: any) => {
    const startDate = c.planStartDate ? new Date(c.planStartDate) : new Date(c.createdAt);
    const endDate = c.planEndDate ? new Date(c.planEndDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining > 0 && daysRemaining <= 7;
  }).length;
  
  const totalMRR = companies.reduce((sum: number, c: any) => sum + (c.monthlyValue || 0), 0);
  const avgLTV = companies.length > 0 ? Math.round(totalMRR * 12 / companies.length) : 0;
  
  const financialData = [
    { name: 'Jan', mrr: Math.round(totalMRR * 0.3) },
    { name: 'Fev', mrr: Math.round(totalMRR * 0.35) },
    { name: 'Mar', mrr: Math.round(totalMRR * 0.5) },
    { name: 'Abr', mrr: Math.round(totalMRR * 0.65) },
    { name: 'Mai', mrr: Math.round(totalMRR * 0.8) },
    { name: 'Jun', mrr: totalMRR }
  ];
  
  const planCounts = { Básico: 0, Pro: 0, Empresa: 0 };
  companies.forEach((c: any) => { if (planCounts[c.plan as keyof typeof planCounts] !== undefined) planCounts[c.plan as keyof typeof planCounts]++; });

  return (
    <div className="space-y-10 animate-fade-in">
       <div className="flex justify-end">
         <button onClick={onReset} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
           <Trash2 size={14} /> Resetar Tudo
         </button>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="MRR Total" value={`R$ ${(totalMRR/1000).toFixed(1)}k`} icon={CreditCard} growth="+12%" />
          <StatCard title="Churn Rate" value="1.2%" icon={AlertTriangle} color="bg-rose-500/10 text-rose-500" growth="-0.4%" />
          <StatCard title="Empresas" value={companies.length} icon={Building} color="bg-blue-500/10 text-blue-400" />
          <StatCard title="LTV Médio" value={`R$ ${(avgLTV/1000).toFixed(1)}k`} icon={BarChart3} color="bg-emerald-500/10 text-emerald-400" />
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 glass-card p-10 rounded-[40px]">
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="text-xl font-black text-white">Crescimento de Receita (MRR)</h3>
                   <p className="text-sm text-slate-500">Evolução mensal das assinaturas ativas.</p>
                </div>
                <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">Meta: R$ 50k</div>
             </div>
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={financialData}>
                      <defs>
                        <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#ffffff" strokeOpacity={0.03} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(v) => `R$${v/1000}k`} />
                      <Tooltip contentStyle={{backgroundColor: '#0d0d10', border: 'none', borderRadius: '16px'}} />
                      <Area type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={4} fill="url(#colorMrr)" />
</AreaChart>
               </ResponsiveContainer>
              </div>
           </div>

           <div className="glass-card p-10 rounded-[40px] flex flex-col">
              <h3 className="text-xl font-black text-white mb-8">Planos Populares</h3>
              <div className="space-y-6 flex-1">
                 <PlanBar label="Básico" count={planCounts['Básico']} total={companies.length} color="bg-slate-700" />
                 <PlanBar label="Pro" count={planCounts['Pro']} total={companies.length} color="bg-blue-600" />
                 <PlanBar label="Empresa" count={planCounts['Empresa']} total={companies.length} color="bg-indigo-600" />
              </div>
              <div className="mt-10 p-6 bg-blue-600/10 rounded-3xl border border-blue-600/20">
                 <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">Avisos Financeiros</p>
                 <p className="text-white text-sm font-bold">{expiringSoon} assinatura{expiringSoon !== 1 ? 's' : ''} expira em até 7 dias</p>
              </div>
           </div>
        </div>

       <div className="glass-card rounded-[40px] p-10">
          <div className="flex justify-between items-center mb-8">
             <h2 className="text-2xl font-black text-white">Carteira de Clientes</h2>
             <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 transition-all">Exportar Financeiro</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5">
                <tr><th className="pb-6">Cliente</th><th className="pb-6">Plano</th><th className="pb-6">Valor/Mês</th><th className="pb-6">Início</th><th className="pb-6">Expira em</th><th className="pb-6">Dias Rest.</th><th className="pb-6">Status</th><th className="pb-6 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {companies.filter((c: any) => c.id).map((c: any) => {
                  const fallbackDate = new Date();
                  const startDate = c.planStartDate ? new Date(c.planStartDate) : (c.createdAt ? new Date(c.createdAt) : fallbackDate);
                  const validStart = isNaN(startDate.getTime()) ? fallbackDate : startDate;
                  const endDate = c.planEndDate ? new Date(c.planEndDate) : new Date(validStart.getTime() + 30 * 24 * 60 * 60 * 1000);
                  const validEnd = isNaN(endDate.getTime()) ? new Date(fallbackDate.getTime() + 30 * 24 * 60 * 60 * 1000) : endDate;
                  const now = new Date();
                  const daysRemaining = Math.max(0, Math.ceil((validEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                  const isExpired = daysRemaining <= 0;
                  const createdLabel = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : validStart.toLocaleDateString();
                  return (
                  <tr key={c.id} className="hover:bg-white/[0.01] group">
                    <td className="py-6">
                       <p className="text-white font-bold">{c.name}</p>
                       <p className="text-[10px] text-slate-500">Criado em {createdLabel}</p>
                    </td>
                    <td className="py-6"><span className="text-xs font-bold text-slate-400">{c.plan}</span></td>
                    <td className="py-6 font-black text-white text-sm">R$ {c.monthlyValue || 0}</td>
                    <td className="py-6 text-slate-400 text-xs">{validStart.toLocaleDateString()}</td>
                    <td className="py-6 text-slate-400 text-xs">{validEnd.toLocaleDateString()}</td>
                    <td className="py-6">
                      <span className={cn("px-2 py-1 rounded text-[10px] font-black", isExpired ? "bg-rose-500/20 text-rose-400" : daysRemaining <= 7 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400")}>
                        {isExpired ? "Expirado" : `${daysRemaining} dias`}
                      </span>
                    </td>
                    <td className="py-6"><span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase", c.billingStatus === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>{c.billingStatus}</span></td>
<td className="py-6 text-right space-x-3">
                       <button onClick={() => togglePause(c.id)} className={cn("p-3 rounded-2xl transition-all", c.isPaused ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                         {c.isPaused ? <PlayCircle size={20}/> : <PauseCircle size={20}/>}
                       </button>
                       <button onClick={() => onChangePlan && onChangePlan(c.id, c.plan)} className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl hover:bg-blue-600/20 transition-all" title="Alterar Plano">
                         <RefreshCw size={20}/>
                       </button>
                       <button onClick={() => impersonate(c.id)} className="p-3 bg-white/5 text-slate-400 rounded-2xl hover:text-white transition-all"><Eye size={20}/></button>
                     </td>
                  </tr>
                )})}
              </tbody>
</table>
           </div>
        </div>

        <div className="glass-card rounded-[40px] p-10">
           <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-white">Gerenciamento de Usuários</h2>
              <button onClick={onRefresh} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                <RefreshCw size={14} /> Atualizar
              </button>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5">
                 <tr><th className="pb-6">Usuário</th><th className="pb-6">E-mail</th><th className="pb-6">Empresa</th><th className="pb-6">Cargo</th><th className="pb-6">Status</th><th className="pb-6 text-right">Ações</th></tr>
               </thead>
<tbody className="divide-y divide-white/5">
                 {users.filter((u: any) => u.role !== 'SUPERADMIN').map((u: any) => {
                   const userCompany = companies.find((c: any) => c.id === u.companyId);
                   const isActive = u.isActive !== false;
                   return (
                   <tr key={u.id} className="hover:bg-white/[0.01] group">
                     <td className="py-6">
                        <p className="text-white font-bold">{u.name}</p>
                     </td>
                     <td className="py-6 text-slate-400 text-sm">{u.email}</td>
                     <td className="py-6 text-slate-400 text-sm">{userCompany?.name || 'N/A'}</td>
                     <td className="py-6"><span className="text-xs font-bold text-slate-400">{u.role}</span></td>
                     <td className="py-6">
                       <span className={cn("px-2 py-1 rounded text-[10px] font-black", isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                         {isActive ? "Ativo" : "Inativo"}
                       </span>
                     </td>
<td className="py-6 text-right space-x-3">
                        <button onClick={() => onToggleUser(u.id, !isActive)} className={cn("p-3 rounded-2xl transition-all", isActive ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20")}>
                          {isActive ? <PauseCircle size={20}/> : <PlayCircle size={20}/>}
                        </button>
                        {u.role !== 'SUPERADMIN' && (
                          <button onClick={() => onDeleteUser(u.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500/20 transition-all">
                            <Trash2 size={20}/>
                          </button>
                        )}
                      </td>
                   </tr>
                 )})}
               </tbody>
             </table>
</div>
        </div>
      </div>
    );
  }

  function PlanBar({ label, count, total, color }: any) {
  const percent = Math.round((count / (total || 1)) * 100);
  return (
    <div className="space-y-2">
       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-500">{label}</span>
          <span className="text-white">{count} ({percent}%)</span>
       </div>
       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div className={cn("h-full", color)} style={{ width: `${percent}%` }} />
       </div>
    </div>
  );
}

function BillingPanel({ companies }: { companies: any[] }) {
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const totalMRR = companies.reduce((acc, c) => acc + (c.plan === 'Pro' ? 499 : c.plan === 'Empresa' ? 1200 : 199), 0);
  const activeSubs = companies.filter(c => c.billingStatus === 'ACTIVE').length;

  return (
    <div className="animate-fade-in space-y-10">
       <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Faturamento SaaS</h1>
            <p className="text-slate-500 text-sm">Gestão financeira e controle de planos.</p>
          </div>
          <button onClick={() => setShowNewPlanModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Novo Plano</button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="MRR Atual" value={`R$ ${totalMRR.toLocaleString()}`} icon={DollarSign} color="text-emerald-500 bg-emerald-500/10" />
          <StatCard title="Assinaturas Ativas" value={activeSubs.toString()} icon={CreditCard} color="text-blue-500 bg-blue-500/10" />
          <StatCard title="Crescimento" value="+12.4%" icon={TrendingUp} color="text-emerald-500 bg-emerald-500/10" />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card p-10 rounded-[40px] border-white/5">
             <h3 className="text-xl font-black text-white mb-8">Performance Mensal</h3>
             <div className="h-[200px] flex items-end gap-2 px-2">
                {[45, 60, 55, 75, 80, 70, 95].map((h, i) => (
                   <div key={i} className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 transition-all rounded-t-xl relative group cursor-pointer" style={{ height: `${h}%` }}>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded font-black opacity-0 group-hover:opacity-100 transition-all">R$ {h * 100}</div>
                   </div>
                ))}
             </div>
             <div className="flex justify-between mt-4 text-[10px] font-black text-slate-600 uppercase">
                <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span>
             </div>
          </div>

          <div className="glass-card p-10 rounded-[40px] border-white/5">
             <h3 className="text-xl font-black text-white mb-8">Inadimplência e Alertas</h3>
             <div className="space-y-6">
                {companies.filter(c => c.billingStatus === 'OVERDUE').map(c => (
                   <div key={c.id} className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500"><AlertTriangle size={20} /></div>
                         <div>
                            <p className="text-white font-bold text-sm">{c.name}</p>
                            <p className="text-[10px] text-rose-500/70 font-black uppercase">Fatura Atrasada há 5 dias</p>
                         </div>
                      </div>
                      <button className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-4 py-2 rounded-xl">Cobrar</button>
                   </div>
                ))}
                {companies.filter(c => c.billingStatus === 'OVERDUE').length === 0 && (
                   <div className="flex flex-col items-center justify-center py-10 text-slate-600 space-y-4">
                      <CheckCircle size={40} className="opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">Sem inadimplência hoje</p>
                   </div>
                )}
</div>
           </div>
        </div>

        {showNewPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-card w-full max-w-md p-8 rounded-[32px] border-white/10 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white">Criar Novo Plano</h3>
                <button onClick={() => setShowNewPlanModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nome do Plano</label>
                  <input type="text" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500" placeholder="Ex: Premium" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Valor Mensal (R$)</label>
                  <input type="number" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500" placeholder="Ex: 299" />
                </div>
                <button className="w-full btn-primary py-4 mt-4">Criar Plano</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

