'use client';

import {
  Building2, CheckCircle, BarChart3, FileText, Plus,
  LayoutDashboard, Settings, Building, Users, Shield,
  CreditCard, AlertTriangle, Box, Layers, Package,
  Bell, Clock, DollarSign, Menu, LogOut, X, Pencil, ShoppingCart, FolderOpen, ClipboardList, TrendingUp, LayoutGrid,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import BuildingMap from '@/components/BuildingMap';
import Building3D from '@/components/Building3D';
import DashboardCharts from '@/components/DashboardCharts';
import FloorDetail from '@/components/FloorDetail';
import Auth from '@/components/Auth';
import NavItem from '@/components/ui/nav-item';
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
import AdminPanel from '@/components/admin/AdminPanel';
import BillingPanel from '@/components/admin/BillingPanel';
import EngineeringTab from '@/components/tabs/EngineeringTab';
import ReportsTab from '@/components/tabs/ReportsTab';
import SettingsTab from '@/components/tabs/SettingsTab';
import AlmoxarifadoTab from '@/components/tabs/AlmoxarifadoTab';
import ComprasTab from '@/components/tabs/ComprasTab';
import DocumentosTab from '@/components/tabs/DocumentosTab';
import RDOTab from '@/components/tabs/RDOTab';
import FinanceiroTab from '@/components/tabs/FinanceiroTab';
import VisaoGeralTab from '@/components/tabs/VisaoGeralTab';
import { cn } from '@/lib/utils';
import {
  saveProjects, saveProject, saveCompany, loadCompanies, getAllUsers,
  updateUserActive, deleteUser, deleteCompany,
  deleteProjectsByCompany, resetToCleanState, signOut,
} from '@/lib/auth';
import { saveProjectPhases, loadProjectPhases, saveProjectConfig, loadProjectConfig } from '@/lib/projectStorage';
import { getProgressPercentage } from '@/lib/utils';
import { AppProvider, useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

// ─── Root export wraps shell in context provider ────────────────────────────
export default function GlobalApplication() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

// ─── Inner shell — all state comes from context ──────────────────────────────
function AppShell() {
  const {
    currentUser, setCurrentUser, currentMember, setCurrentMember,
    activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen,
    companies, setCompanies, allProjects, setAllProjects, allUsers, setAllUsers,
    team, currentViewCompanyId, setCurrentViewCompanyId,
    currentCompany, companyProjects, project,
    activeProjectId, setActiveProjectId, currentProjectIndex, setCurrentProjectIndex,
    selectProject, phases, setPhases, buildingConfig, setBuildingConfig,
    projectDisciplines, disciplineProgress, totalProgress,
    toast, setToast, viewMode, setViewMode,
    showEmptyPhaseState, setShowEmptyPhaseState,
    editingProjectIndex, setEditingProjectIndex,
    editingFloor, setEditingFloor, selectedFloors, setSelectedFloors,
    selectedFloor, setSelectedFloor, editingExecution, setEditingExecution,
    isConfigModalOpen, setIsConfigModalOpen, isCreatingNewProject, setIsCreatingNewProject,
    changePlanCompany, setChangePlanCompany,
    fileInputRef, profileInputRef,
    handleLogin, handleSaveBuildingConfig, handleSaveFloor, handleDeleteFloor,
    handleDeleteProject, handleBulkApply,
    handleImportCSV, handleAddMember, openNewProjectModal, togglePauseCompany,
    isAddingMember, setIsAddingMember, loadInitialData,
  } = useAppContext();

  // ── Member layout ────────────────────────────────────────────────────────
  if (currentMember) {
    const defaultPerms: Record<string, string> = {
      DASHBOARD: 'VER', CRONOGRAMA: 'VER', PAVIMENTOS: 'VER',
      MEDICAO: 'VER', DOCUMENTOS: 'VER', PENDENCIAS: 'VER', MEDICAO_OBRA: 'VER',
      VISAO_GERAL: 'VER', CALENDARIO: 'VER', RELATORIOS: 'VER',
      ALMOXARIFADO: 'VER', COMPRAS: 'VER', RDO: 'VER', FINANCEIRO: 'VER',
    };
    const perms = currentMember.permissions || defaultPerms;
    const activeModule = currentMember.activeModule || 'welcome';
    const hasAccess = (module: string) => { const p = perms[module] || defaultPerms[module]; return p === 'VER' || p === 'EDITAR'; };
    const canEdit = (module: string) => { const p = perms[module] || defaultPerms[module]; return p === 'EDITAR'; };

    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" />}
        <aside className={`fixed lg:sticky inset-y-0 left-0 lg:top-0 lg:h-screen w-[280px] flex flex-col p-8 space-y-10 border-r border-white/5 bg-[var(--background)] z-50 lg:z-10 transform transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-2 font-black text-xl italic tracking-tighter text-white">
            <span className="flex items-center gap-3"><Building2 size={24} /> Obramesh</span>
            <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
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
          <button onClick={() => { setCurrentMember(null); supabase.auth.signOut(); }} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest border-t border-white/5 pt-8 mt-auto">
            <LogOut size={16} /> Sair
          </button>
        </aside>
        <main className="flex-1 overflow-y-auto pb-20 w-full">
          <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-[var(--background)]/80 backdrop-blur-md border-b border-white/5">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-white"><Menu size={24} /></button>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 font-black text-base italic text-white"><Building2 size={18} /> Obramesh</div>
              {project && <p className="text-[10px] text-slate-500 font-bold truncate max-w-[160px]">{project.name}</p>}
            </div>
            <div className="w-10" />
          </header>
          <div className="p-4 md:p-10">
            {activeModule === 'dashboard' && hasAccess('DASHBOARD') && (
              <ModuleGuard module="DASHBOARD" access={canEdit('DASHBOARD') ? 'EDITAR' : 'VER'}>
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
            {activeModule === 'timeline' && hasAccess('CRONOGRAMA') && (
              <ConstructionTimeline
                phases={phases}
                onAddPhase={(phase) => { const updated = [...phases, phase]; setPhases(updated); if (activeProjectId) saveProjectPhases(activeProjectId, updated); }}
                onRemovePhase={(phaseId) => { const updated = phases.filter(p => p.id !== phaseId); setPhases(updated); if (activeProjectId) saveProjectPhases(activeProjectId, updated); }}
                onUpdatePhase={(phaseId, data) => { const updated = phases.map(p => p.id === phaseId ? { ...p, ...data } : p); setPhases(updated); if (activeProjectId) saveProjectPhases(activeProjectId, updated); }}
              />
            )}
            {activeModule === 'engineering' && hasAccess('PAVIMENTOS') && (
              <EngineeringTab />
            )}
            {activeModule === 'pendencias' && hasAccess('PENDENCIAS') && (
              <ModuleGuard module="PENDENCIAS" access={canEdit('PENDENCIAS') ? 'EDITAR' : 'VER'}>
                <PendenciasSection
                  projectId={activeProjectId || ''}
                  currentUserName={currentMember.name}
                  canEdit={canEdit('PENDENCIAS')}
                />
              </ModuleGuard>
            )}
            {activeModule === 'medicoes' && hasAccess('MEDICAO_OBRA') && (
              <ModuleGuard module="MEDICAO_OBRA" access={canEdit('MEDICAO_OBRA') ? 'EDITAR' : 'VER'}>
                <MedicaoObraSection projectId={activeProjectId || ''} currentUserName={currentMember.name} />
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

  // ── Auth gates ────────────────────────────────────────────────────────────
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

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
      {toast && <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-2 rounded-full bg-blue-600 text-white animate-fade-in text-xs font-black shadow-xl shadow-blue-500/30">{toast.message}</div>}

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
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsAddingMember(false)} className="flex-1 py-4 text-slate-500 font-black text-xs uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="flex-2 btn-primary">Convidar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" />}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`fixed lg:sticky inset-y-0 left-0 lg:top-0 lg:h-screen w-[280px] flex flex-col p-8 space-y-10 border-r border-white/5 bg-[var(--background)] z-50 lg:z-10 transform transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2 font-black text-xl italic tracking-tighter text-white">
          <span className="flex items-center gap-3"><Building2 size={24} /> Obramesh</span>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white"><X size={20} /></button>
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
                <NavItem icon={LayoutGrid} label="Visão Geral" active={activeTab === 'visao-geral'} onClick={() => setActiveTab('visao-geral')} />
                <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavItem icon={Clock} label="Cronograma" active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} />
                <NavItem icon={Building} label="Calendário" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
                <NavItem icon={Box} label="Gestão Técnica" active={activeTab === 'engineering'} onClick={() => setActiveTab('engineering')} />
                <NavItem icon={Building} label="Projetos" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
                <NavItem icon={Users} label="Equipe" active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">Mais</p>
                <NavItem icon={FileText} label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                <NavItem icon={AlertTriangle} label="Pendências" active={activeTab === 'pendencias'} onClick={() => setActiveTab('pendencias')} />
                <NavItem icon={DollarSign} label="Medições" active={activeTab === 'medicoes'} onClick={() => setActiveTab('medicoes')} />
                <NavItem icon={Package} label="Almoxarifado" active={activeTab === 'almoxarifado'} onClick={() => setActiveTab('almoxarifado')} />
                <NavItem icon={ShoppingCart} label="Compras" active={activeTab === 'compras'} onClick={() => setActiveTab('compras')} />
                <NavItem icon={FolderOpen} label="Documentos" active={activeTab === 'documentos'} onClick={() => setActiveTab('documentos')} />
                <NavItem icon={ClipboardList} label="RDO" active={activeTab === 'rdo'} onClick={() => setActiveTab('rdo')} />
                <NavItem icon={TrendingUp} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
                <NavItem icon={Settings} label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
              </div>
            </>
          )}
        </nav>
        <div className="space-y-4 pt-8 border-t border-white/5">
          <div className="flex items-center gap-4 px-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 flex items-center justify-center">
              <span className="text-sm font-black text-blue-400">{currentUser.name?.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={() => { setCurrentUser(null); signOut(); }} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-20 w-full">
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-[var(--background)]/80 backdrop-blur-md border-b border-white/5">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-white"><Menu size={24} /></button>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 font-black text-base italic text-white"><Building2 size={18} /> Obramesh</div>
            {project && <p className="text-[10px] text-slate-500 font-bold truncate max-w-[160px]">{project.name}</p>}
          </div>
          <div className="w-10" />
        </header>

        <div className="px-4 md:px-10 mt-6 space-y-10">
          {/* ── Superadmin tabs ─────────────────────────────────────────── */}
          {currentUser.role === 'SUPERADMIN' && activeTab === 'admin_dashboard' && (
            <AdminPanel
              companies={companies}
              users={allUsers}
              togglePause={togglePauseCompany}
              impersonate={(id: string) => { setCurrentViewCompanyId(id); setActiveTab('dashboard'); }}
              onRenew={(id: string) => {
                setCompanies(prev => prev.map(c => {
                  if (c.id !== id) return c;
                  const currentEnd = new Date(c.planEndDate || Date.now());
                  const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + 30 * 24 * 60 * 60 * 1000);
                  return { ...c, planEndDate: newEnd.toISOString(), billingStatus: 'ACTIVE', isPaused: false };
                }));
                setToast({ message: 'Plano renovado por +30 dias!', type: 'success' });
              }}
              onChangePlan={(companyId: string) => {
                const company = companies.find(c => c.id === companyId);
                if (company) setChangePlanCompany(company);
              }}
              onToggleUser={async (userId: string, isActive: boolean) => {
                await updateUserActive(userId, isActive);
                const refreshedUsers = await getAllUsers();
                setAllUsers(refreshedUsers.map((u: any) => ({ ...u, isActive: u.isActive ?? u.is_active ?? true })));
                setToast({ message: isActive ? 'Usuário ativado!' : 'Usuário desativado!', type: 'success' });
              }}
              onDeleteUser={async (userId: string) => {
                if (confirm('Tem certeza que deseja excluir este usuário?')) {
                  try {
                    const usersBefore = await getAllUsers();
                    const userToDelete = usersBefore.find((u: any) => u.id === userId);
                    const companyIdToCheck = userToDelete?.companyId;
                    const deleted = await deleteUser(userId);
                    if (!deleted) { setToast({ message: 'Erro ao excluir usuário', type: 'error' }); return; }
                    const updatedUsers = await getAllUsers();
                    if (companyIdToCheck) {
                      const remaining = updatedUsers.filter((u: any) => u.companyId === companyIdToCheck);
                      if (remaining.length === 0) { deleteCompany(companyIdToCheck); deleteProjectsByCompany(companyIdToCheck); }
                    }
                    setToast({ message: 'Usuário excluído! Atualizando...', type: 'success' });
                    setTimeout(() => window.location.reload(), 1000);
                  } catch { setToast({ message: 'Erro ao processar exclusão', type: 'error' }); }
                }
              }}
              onRefresh={async () => {
                const [freshCompanies, freshUsers] = await Promise.all([loadCompanies(), getAllUsers()]);
                setCompanies(freshCompanies);
                setAllUsers(freshUsers);
                setToast({ message: 'Dados atualizados do Supabase!', type: 'success' });
              }}
              onReset={() => {
                if (confirm('ATENÇÃO: Isso vai excluir TODOS os dados (usuários, empresas, projetos). Continuar?')) {
                  resetToCleanState();
                  window.location.reload();
                }
              }}
            />
          )}

          {currentUser.role === 'SUPERADMIN' && activeTab === 'billing' && <BillingPanel companies={companies} />}

          {currentUser.role === 'SUPERADMIN' && activeTab === 'plans_catalog' && (
            <PlansCatalog onToast={(message, type) => setToast({ message, type })} />
          )}

          {currentUser.role === 'SUPERADMIN' && activeTab === 'admin_settings' && (
            <AdminSettings currentUser={currentUser} onUpdateUser={(user) => { setCurrentUser(user); setToast({ message: 'Perfil atualizado!', type: 'success' }); }} />
          )}

          {/* ── Regular user tabs ─────────────────────────────────────── */}
          {currentUser.role !== 'SUPERADMIN' && (
            <div className="space-y-10">
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
                      onUseTemplate={(templatePhases) => { setPhases(templatePhases); if (activeProjectId) saveProjectPhases(activeProjectId, templatePhases); setShowEmptyPhaseState(false); }}
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
                        <button onClick={() => setViewMode('2d')} className={cn('flex-1 py-3 rounded-xl text-xs font-black transition-all', viewMode === '2d' ? 'bg-blue-600 text-white' : 'text-slate-500')}>Mapa 2D</button>
                        <button onClick={() => setViewMode('3d')} className={cn('flex-1 py-3 rounded-xl text-xs font-black transition-all', viewMode === '3d' ? 'bg-blue-600 text-white' : 'text-slate-500')}>3D</button>
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
                    onAddPhase={(phase) => { const updated = [...phases, phase]; setPhases(updated); if (activeProjectId) saveProjectPhases(activeProjectId, updated); }}
                    onRemovePhase={(phaseId) => { const updated = phases.filter(p => p.id !== phaseId); setPhases(updated); if (activeProjectId) saveProjectPhases(activeProjectId, updated); }}
                    onUpdatePhase={(phaseId, data) => { const updated = phases.map(p => p.id === phaseId ? { ...p, ...data } : p); setPhases(updated); if (activeProjectId) saveProjectPhases(activeProjectId, updated); }}
                  />
                </ModuleGuard>
              )}

              {activeTab === 'calendar' && (
                <ModuleGuard module="CALENDARIO" access="VER">
                  <ConstructionCalendar companyId={currentViewCompanyId} projectId={activeProjectId} />
                </ModuleGuard>
              )}

              {activeTab === 'engineering' && <EngineeringTab />}

              {activeTab === 'projects' && editingProjectIndex !== null && editingProjectIndex < companyProjects.length && companyProjects[editingProjectIndex] ? (
                <ProjectEditCard
                  project={companyProjects[editingProjectIndex]}
                  companyId={currentViewCompanyId}
                  onUpdate={(p) => { const updated = allProjects.map(ap => ap.id === p.id ? p : ap); setAllProjects(updated); saveProjects(updated); }}
                  onDelete={() => handleDeleteProject(companyProjects[editingProjectIndex].id)}
                  onClose={() => setEditingProjectIndex(null)}
                />
              ) : activeTab === 'projects' && companyProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {companyProjects.map((p, i) => (
                    <div key={p.id} className={cn('glass-card rounded-[40px] cursor-pointer group hover:scale-[1.02] transition-all relative overflow-hidden', currentProjectIndex === i ? 'border-blue-600 border-2' : 'border-white/5')}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (p?.id) {
                            setCurrentProjectIndex(i);
                            setActiveProjectId(p.id);
                            const savedPhases = await loadProjectPhases(p.id);
                            setPhases(savedPhases || []);
                            const savedConfig = await loadProjectConfig(p.id);
                            setBuildingConfig(savedConfig);
                            setShowEmptyPhaseState(!savedPhases || savedPhases.length === 0);
                            if (editingProjectIndex !== null) setEditingProjectIndex(null);
                            else setEditingProjectIndex(i);
                          }
                        }}
                        className="absolute top-4 right-4 z-10 p-2 bg-blue-600/80 backdrop-blur-sm text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Pencil size={16} />
                      </button>
                      {p.coverPhoto && (
                        <div className="relative h-40 w-full overflow-hidden">
                          <img src={p.coverPhoto} alt={p.name} className="w-full h-full object-cover" />
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
                  ))}
                </div>
              ) : null}

              {activeTab === 'teams' && (
                <TeamPage ownerId={currentUser?.id || 'default'} companyId={currentUser?.companyId || ''} plan="GOLD" />
              )}

              {activeTab === 'reports' && (
                <ModuleGuard module="RELATORIOS" access="VER">
                  <ReportsTab />
                </ModuleGuard>
              )}

              {activeTab === 'pendencias' && (
                <PendenciasSection projectId={activeProjectId || ''} currentUserName={currentUser?.name || ''} canEdit />
              )}

              {activeTab === 'medicoes' && (
                <MedicaoObraSection projectId={activeProjectId || ''} currentUserName={currentUser?.name || ''} />
              )}

              {activeTab === 'almoxarifado' && (
                <ModuleGuard module="ALMOXARIFADO" access="VER">
                  <AlmoxarifadoTab />
                </ModuleGuard>
              )}
              {activeTab === 'compras' && (
                <ModuleGuard module="COMPRAS" access="VER">
                  <ComprasTab />
                </ModuleGuard>
              )}
              {activeTab === 'documentos' && (
                <ModuleGuard module="DOCUMENTOS" access="VER">
                  <DocumentosTab />
                </ModuleGuard>
              )}
              {activeTab === 'rdo' && (
                <ModuleGuard module="RDO" access="VER">
                  <RDOTab />
                </ModuleGuard>
              )}
              {activeTab === 'financeiro' && (
                <ModuleGuard module="FINANCEIRO" access="VER">
                  <FinanceiroTab />
                </ModuleGuard>
              )}
              {activeTab === 'visao-geral' && (
                <ModuleGuard module="VISAO_GERAL" access="VER">
                  <VisaoGeralTab />
                </ModuleGuard>
              )}
              {activeTab === 'settings' && <SettingsTab />}
            </div>
          )}
        </div>
      </main>

      {/* ── Global modals ─────────────────────────────────────────────────── */}
      <BuildingConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => { setIsConfigModalOpen(false); setIsCreatingNewProject(false); }}
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

      <FloorDetail
        floor={selectedFloor ? { ...selectedFloor, services: [...selectedFloor.services], photos: [...(selectedFloor.photos || [])] } : null}
        onClose={() => setSelectedFloor(null)}
        onStatusChange={(fId, sName, val) => {
          if (!project) return;
          setAllProjects(allProjects.map(ap => ap.id === project?.id ? { ...ap, floors: (ap.floors || []).map(f => f.id === fId ? { ...f, services: (f.services || []).map(s => s.name === sName ? { ...s, status: val } : s) } : f) } : ap));
          saveProjects(allProjects);
          setToast({ message: 'Sincronizado!', type: 'success' });
        }}
        onPhotoUpload={(fId, photos) => {
          if (!project) return;
          setAllProjects(allProjects.map(ap => ap.id === project?.id ? { ...ap, floors: (ap.floors || []).map(f => f.id === fId ? { ...f, photos } : f) } : ap));
          saveProjects(allProjects);
        }}
        existingPhotos={selectedFloor?.photos || []}
      />

      {changePlanCompany && (
        <ChangePlanModal
          company={changePlanCompany}
          onCancel={() => setChangePlanCompany(null)}
          onConfirm={async (plan) => {
            const updated = { ...changePlanCompany, plan: plan.name, monthlyValue: plan.monthlyValue };
            const result = await saveCompany(updated);
            if (!result.ok) { setToast({ message: `Erro ao alterar plano: ${result.error}`, type: 'error' }); return; }
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
