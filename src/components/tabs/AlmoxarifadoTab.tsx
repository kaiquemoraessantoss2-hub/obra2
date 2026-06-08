'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Package, TrendingUp, TrendingDown, AlertTriangle, ArrowDownCircle, ArrowUpCircle, ChevronDown, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import {
  Material, WarehouseEntry, WarehouseExit, MaterialCategory,
  loadMaterials, saveMaterial, deleteMaterial,
  loadEntries, addEntry,
  loadExits, addExit, approveExit,
} from '@/lib/almoxarifado';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: MaterialCategory; label: string }[] = [
  { value: 'STRUCTURAL', label: 'Estrutural' },
  { value: 'FINISHING', label: 'Acabamento' },
  { value: 'ELECTRICAL', label: 'Elétrica' },
  { value: 'HYDRAULIC', label: 'Hidráulica' },
  { value: 'TOOLS', label: 'Ferramentas' },
  { value: 'SAFETY', label: 'EPI / Segurança' },
  { value: 'OTHER', label: 'Outros' },
];

const CAT_COLORS: Record<MaterialCategory, string> = {
  STRUCTURAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  FINISHING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ELECTRICAL: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  HYDRAULIC: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  TOOLS: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  SAFETY: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  OTHER: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StockBadge({ current, min }: { current: number; min: number }) {
  const pct = min > 0 ? Math.min(100, Math.round((current / min) * 100)) : 100;
  const low = current <= min && min > 0;
  const critical = current === 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', critical ? 'bg-rose-500' : low ? 'bg-amber-500' : 'bg-emerald-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('text-xs font-black', critical ? 'text-rose-400' : low ? 'text-amber-400' : 'text-emerald-400')}>
        {current}
      </span>
    </div>
  );
}

function MaterialModal({
  onClose, onSave, projectId,
}: { onClose: () => void; onSave: (m: Material) => void; projectId: string }) {
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const result = await saveMaterial({
      projectId,
      name: String(fd.get('name')),
      category: String(fd.get('category')) as MaterialCategory,
      unit: String(fd.get('unit')),
      currentStock: Number(fd.get('currentStock')),
      minStock: Number(fd.get('minStock')),
      unitCost: Number(fd.get('unitCost')),
      supplier: String(fd.get('supplier') || ''),
    });
    setSaving(false);
    if (result) onSave(result);
  };

  return (
    <Modal title="Novo Material" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome do Material"><input required name="name" placeholder="Ex: Cimento CP-II 50kg" className="modal-input" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoria">
            <select name="category" className="modal-input" defaultValue="OTHER">
              {CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-[#0d0d10]">{c.label}</option>)}
            </select>
          </Field>
          <Field label="Unidade"><input required name="unit" placeholder="kg, un, m², L..." className="modal-input" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Estoque Atual"><input required name="currentStock" type="number" step="0.01" min="0" defaultValue="0" className="modal-input" /></Field>
          <Field label="Estoque Mínimo"><input required name="minStock" type="number" step="0.01" min="0" defaultValue="0" className="modal-input" /></Field>
          <Field label="Custo Unit. (R$)"><input required name="unitCost" type="number" step="0.01" min="0" defaultValue="0" className="modal-input" /></Field>
        </div>
        <Field label="Fornecedor (opcional)"><input name="supplier" placeholder="Nome do fornecedor" className="modal-input" /></Field>
        <ModalFooter onClose={onClose} saving={saving} label="Cadastrar Material" />
      </form>
    </Modal>
  );
}

function EntryModal({
  materials, projectId, userName, onClose, onSave,
}: { materials: Material[]; projectId: string; userName: string; onClose: () => void; onSave: () => void }) {
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await addEntry({
      projectId,
      materialId: String(fd.get('materialId')),
      quantity: Number(fd.get('quantity')),
      unitCost: Number(fd.get('unitCost')),
      supplier: String(fd.get('supplier') || ''),
      invoiceNumber: String(fd.get('invoiceNumber') || ''),
      notes: String(fd.get('notes') || ''),
      createdBy: userName,
    });
    setSaving(false);
    onSave();
  };
  return (
    <Modal title="Registrar Entrada (NF)" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Material">
          <select required name="materialId" className="modal-input">
            <option value="" className="bg-[#0d0d10]">Selecione...</option>
            {materials.map(m => <option key={m.id} value={m.id} className="bg-[#0d0d10]">{m.name} ({m.unit})</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantidade"><input required name="quantity" type="number" step="0.01" min="0.01" placeholder="0" className="modal-input" /></Field>
          <Field label="Custo Unit. (R$)"><input required name="unitCost" type="number" step="0.01" min="0" defaultValue="0" className="modal-input" /></Field>
        </div>
        <Field label="Fornecedor"><input name="supplier" placeholder="Nome do fornecedor" className="modal-input" /></Field>
        <Field label="Nº Nota Fiscal"><input name="invoiceNumber" placeholder="NF-000000" className="modal-input" /></Field>
        <Field label="Observações"><input name="notes" placeholder="Opcional" className="modal-input" /></Field>
        <ModalFooter onClose={onClose} saving={saving} label="Registrar Entrada" />
      </form>
    </Modal>
  );
}

function ExitModal({
  materials, projectId, userName, onClose, onSave,
}: { materials: Material[]; projectId: string; userName: string; onClose: () => void; onSave: () => void }) {
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await addExit({
      projectId,
      materialId: String(fd.get('materialId')),
      quantity: Number(fd.get('quantity')),
      destinationFloor: String(fd.get('destinationFloor') || ''),
      destinationPhase: String(fd.get('destinationPhase') || ''),
      requestedBy: userName,
      status: 'PENDING',
      notes: String(fd.get('notes') || ''),
    });
    setSaving(false);
    onSave();
  };
  return (
    <Modal title="Requisição de Saída" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Material">
          <select required name="materialId" className="modal-input">
            <option value="" className="bg-[#0d0d10]">Selecione...</option>
            {materials.filter(m => m.currentStock > 0).map(m => (
              <option key={m.id} value={m.id} className="bg-[#0d0d10]">{m.name} — saldo: {m.currentStock} {m.unit}</option>
            ))}
          </select>
        </Field>
        <Field label="Quantidade"><input required name="quantity" type="number" step="0.01" min="0.01" placeholder="0" className="modal-input" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Destino (pavimento)"><input name="destinationFloor" placeholder="Ex: 3º Andar" className="modal-input" /></Field>
          <Field label="Fase"><input name="destinationPhase" placeholder="Ex: Alvenaria" className="modal-input" /></Field>
        </div>
        <Field label="Observações"><input name="notes" placeholder="Opcional" className="modal-input" /></Field>
        <ModalFooter onClose={onClose} saving={saving} label="Enviar Requisição" />
      </form>
    </Modal>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-lg p-8 rounded-[32px] relative">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function ModalFooter({ onClose, saving, label }: { onClose: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 text-slate-500 hover:text-white font-black text-xs uppercase tracking-widest">Cancelar</button>
      <button type="submit" disabled={saving} className="flex-2 btn-primary disabled:opacity-50">{saving ? 'Salvando...' : label}</button>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

type SubTab = 'estoque' | 'entradas' | 'saidas';

export default function AlmoxarifadoTab() {
  const { activeProjectId, currentUser, project } = useAppContext();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [entries, setEntries] = useState<WarehouseEntry[]>([]);
  const [exits, setExits] = useState<WarehouseExit[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('estoque');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<MaterialCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const projectId = activeProjectId || '';
  const userName = currentUser?.name || 'Sistema';

  const reload = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    const [mats, ents, exts] = await Promise.all([loadMaterials(projectId), loadEntries(projectId), loadExits(projectId)]);
    setMaterials(mats);
    setEntries(ents);
    setExits(exts);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  const lowStock = materials.filter(m => m.currentStock <= m.minStock && m.minStock > 0);
  const totalValue = materials.reduce((acc, m) => acc + m.currentStock * m.unitCost, 0);

  const filteredMaterials = materials.filter(m => {
    if (filterCategory !== 'ALL' && m.category !== filterCategory) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!activeProjectId) {
    return (
      <div className="glass-card p-12 rounded-[40px] text-center">
        <Package className="text-slate-600 mx-auto mb-4" size={48} />
        <p className="text-slate-500 font-bold">Selecione um projeto para acessar o almoxarifado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Almoxarifado</h2>
          <p className="text-sm text-slate-500 mt-1">{project?.name} — controle de materiais e estoque</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowExitModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-sm font-bold transition-all">
            <ArrowUpCircle size={16} className="text-amber-400" /> Saída
          </button>
          <button onClick={() => setShowEntryModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-sm font-bold transition-all">
            <ArrowDownCircle size={16} className="text-emerald-400" /> Entrada
          </button>
          <button onClick={() => setShowMaterialModal(true)} className="flex items-center gap-2 px-4 py-2.5 btn-primary rounded-2xl text-sm">
            <Plus size={16} /> Material
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Package} label="Total Materiais" value={materials.length} color="text-blue-400 bg-blue-500/10" />
        <KpiCard icon={AlertTriangle} label="Estoque Baixo" value={lowStock.length} color="text-amber-400 bg-amber-500/10" alert={lowStock.length > 0} />
        <KpiCard icon={TrendingDown} label="Entradas (mês)" value={entries.filter(e => isThisMonth(e.createdAt)).length} color="text-emerald-400 bg-emerald-500/10" />
        <KpiCard icon={TrendingUp} label="Valor em Estoque" value={`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} color="text-purple-400 bg-purple-500/10" />
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-black text-amber-400">Estoque baixo em {lowStock.length} {lowStock.length === 1 ? 'material' : 'materiais'}</p>
            <p className="text-xs text-slate-400 mt-1">{lowStock.slice(0, 3).map(m => m.name).join(', ')}{lowStock.length > 3 ? ` e +${lowStock.length - 3} outros` : ''}</p>
          </div>
        </div>
      )}

      {/* Sub tabs */}
      <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 w-fit">
        {(['estoque', 'entradas', 'saidas'] as SubTab[]).map(t => (
          <button key={t} onClick={() => setSubTab(t)} className={cn('px-5 py-2.5 rounded-xl text-xs font-black transition-all capitalize', subTab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white')}>
            {t === 'estoque' ? 'Estoque' : t === 'entradas' ? 'Entradas' : 'Saídas/Requisições'}
          </button>
        ))}
      </div>

      {/* ── Estoque tab ──────────────────────────────────────────────────── */}
      {subTab === 'estoque' && (
        <div className="glass-card rounded-[32px] overflow-hidden">
          {/* Filters */}
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar material..."
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as any)} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none">
              <option value="ALL" className="bg-[#0d0d10]">Todas categorias</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-[#0d0d10]">{c.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-600 font-bold text-sm">Carregando...</div>
          ) : filteredMaterials.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-bold text-sm">{materials.length === 0 ? 'Nenhum material cadastrado.' : 'Nenhum resultado encontrado.'}</p>
              {materials.length === 0 && <button onClick={() => setShowMaterialModal(true)} className="mt-4 btn-primary text-sm px-6 py-2">Cadastrar primeiro material</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5">
                    <th className="px-6 py-4">Material</th>
                    <th className="px-4 py-4">Categoria</th>
                    <th className="px-4 py-4">Estoque</th>
                    <th className="px-4 py-4">Mínimo</th>
                    <th className="px-4 py-4">Custo Unit.</th>
                    <th className="px-4 py-4">Valor Total</th>
                    <th className="px-4 py-4">Fornecedor</th>
                    <th className="px-4 py-4 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map(mat => (
                    <tr key={mat.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 font-bold text-white text-sm">{mat.name}</td>
                      <td className="px-4 py-4">
                        <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black border', CAT_COLORS[mat.category])}>
                          {CATEGORIES.find(c => c.value === mat.category)?.label || mat.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StockBadge current={mat.currentStock} min={mat.minStock} />
                        <span className="text-[10px] text-slate-600 mt-1 block">{mat.unit}</span>
                      </td>
                      <td className="px-4 py-4 text-slate-400 text-sm font-bold">{mat.minStock} {mat.unit}</td>
                      <td className="px-4 py-4 text-slate-400 text-sm font-bold">R$ {mat.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-white text-sm font-black">R$ {(mat.currentStock * mat.unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-slate-500 text-xs">{mat.supplier || '—'}</td>
                      <td className="px-4 py-4">
                        <button onClick={() => deleteMaterial(mat.id).then(reload)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Entradas tab ─────────────────────────────────────────────────── */}
      {subTab === 'entradas' && (
        <div className="glass-card rounded-[32px] overflow-hidden">
          {loading ? <div className="p-12 text-center text-slate-600 font-bold text-sm">Carregando...</div>
          : entries.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowDownCircle size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-bold text-sm">Nenhuma entrada registrada.</p>
              <button onClick={() => setShowEntryModal(true)} className="mt-4 btn-primary text-sm px-6 py-2">Registrar Entrada</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5">
                    <th className="px-6 py-4">Material</th>
                    <th className="px-4 py-4">Qtd.</th>
                    <th className="px-4 py-4">Custo Unit.</th>
                    <th className="px-4 py-4">Total</th>
                    <th className="px-4 py-4">Fornecedor</th>
                    <th className="px-4 py-4">NF</th>
                    <th className="px-4 py-4">Registrado por</th>
                    <th className="px-4 py-4">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold text-white text-sm">{e.materialName || '—'}</td>
                      <td className="px-4 py-4 text-emerald-400 font-black text-sm">+{e.quantity}</td>
                      <td className="px-4 py-4 text-slate-400 text-sm">R$ {e.unitCost.toFixed(2)}</td>
                      <td className="px-4 py-4 text-white font-bold text-sm">R$ {(e.quantity * e.unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-slate-400 text-sm">{e.supplier || '—'}</td>
                      <td className="px-4 py-4 text-slate-400 text-sm font-mono">{e.invoiceNumber || '—'}</td>
                      <td className="px-4 py-4 text-slate-400 text-sm">{e.createdBy}</td>
                      <td className="px-4 py-4 text-slate-500 text-xs">{formatDate(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Saídas tab ───────────────────────────────────────────────────── */}
      {subTab === 'saidas' && (
        <div className="glass-card rounded-[32px] overflow-hidden">
          {loading ? <div className="p-12 text-center text-slate-600 font-bold text-sm">Carregando...</div>
          : exits.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowUpCircle size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-bold text-sm">Nenhuma requisição registrada.</p>
              <button onClick={() => setShowExitModal(true)} className="mt-4 btn-primary text-sm px-6 py-2">Nova Requisição</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5">
                    <th className="px-6 py-4">Material</th>
                    <th className="px-4 py-4">Qtd.</th>
                    <th className="px-4 py-4">Destino</th>
                    <th className="px-4 py-4">Fase</th>
                    <th className="px-4 py-4">Solicitante</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Data</th>
                    <th className="px-4 py-4 w-24">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {exits.map(ex => {
                    const mat = materials.find(m => m.id === ex.materialId);
                    return (
                      <tr key={ex.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-bold text-white text-sm">{ex.materialName || '—'}</td>
                        <td className="px-4 py-4 text-amber-400 font-black text-sm">-{ex.quantity}</td>
                        <td className="px-4 py-4 text-slate-400 text-sm">{ex.destinationFloor || '—'}</td>
                        <td className="px-4 py-4 text-slate-400 text-sm">{ex.destinationPhase || '—'}</td>
                        <td className="px-4 py-4 text-slate-400 text-sm">{ex.requestedBy}</td>
                        <td className="px-4 py-4">
                          <StatusBadge status={ex.status} />
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-xs">{formatDate(ex.createdAt)}</td>
                        <td className="px-4 py-4">
                          {ex.status === 'PENDING' && (
                            <button
                              onClick={async () => {
                                await approveExit(ex.id, ex.materialId, ex.quantity, userName);
                                await reload();
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/20 text-emerald-400 rounded-xl text-xs font-black transition-all"
                            >
                              <Check size={12} /> Aprovar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showMaterialModal && (
        <MaterialModal
          projectId={projectId}
          onClose={() => setShowMaterialModal(false)}
          onSave={() => { setShowMaterialModal(false); reload(); }}
        />
      )}
      {showEntryModal && (
        <EntryModal
          materials={materials}
          projectId={projectId}
          userName={userName}
          onClose={() => setShowEntryModal(false)}
          onSave={() => { setShowEntryModal(false); reload(); }}
        />
      )}
      {showExitModal && (
        <ExitModal
          materials={materials}
          projectId={projectId}
          userName={userName}
          onClose={() => setShowExitModal(false)}
          onSave={() => { setShowExitModal(false); reload(); }}
        />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color, alert }: { icon: any; label: string; value: number | string; color: string; alert?: boolean }) {
  return (
    <div className={cn('glass-card p-6 rounded-[24px] flex items-center gap-4', alert && 'border-amber-500/20')}>
      <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0', color)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: WarehouseExit['status'] }) {
  const map = {
    PENDING: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    APPROVED: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    REJECTED: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  };
  const labels = { PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado' };
  return (
    <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black border', map[status])}>
      {labels[status]}
    </span>
  );
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function isThisMonth(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
