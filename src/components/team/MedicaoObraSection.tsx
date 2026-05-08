'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Plus, Download, Upload, Trash2, Filter, List, LayoutGrid,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { newId } from '@/lib/utils';

// Lazy import do Kanban
const MedicoesKanban = dynamic(() => import('./MedicoesKanban'), {
  ssr: false,
  loading: () => <div className="text-center py-8 text-slate-500">Carregando Kanban...</div>,
});

const VIEW_STORAGE_KEY = 'medicoes_view_mode';
type ViewMode = 'list' | 'kanban';

interface Medicao {
  id: string;
  projectId: string;
  disciplina: string;
  contratante: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  createdAt: string;
  createdBy: string;
}

const DISCIPLINAS = ['Elétrica', 'Hidráulica', 'Alvenaria', 'Revestimento', 'Pintura', 'Gás', 'Dados', 'Incêndio'];

async function fetchMedicoes(projectId: string): Promise<Medicao[]> {
  const { data, error } = await supabase
    .from('medicoes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    disciplina: r.disciplina,
    contratante: r.contratante ?? '',
    descricao: r.descricao,
    quantidade: r.quantidade,
    unidade: r.unidade ?? '',
    valorUnitario: r.valor_unitario,
    valorTotal: r.valor_total,
    createdAt: r.created_at,
    createdBy: r.created_by ?? '',
  }));
}

interface MedicaoFormData {
  disciplina: string;
  contratante: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  valorUnitario: string;
}

interface MedicaoObraSectionProps {
  projectId: string;
  currentUserName: string;
  canEdit?: boolean;
}

export default function MedicaoObraSection({
  projectId,
  currentUserName,
  canEdit = true,
}: MedicaoObraSectionProps) {
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDisciplina, setFilterDisciplina] = useState('');
  const [filterContratante, setFilterContratante] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<MedicaoFormData>({
    disciplina: '',
    contratante: '',
    descricao: '',
    quantidade: '',
    unidade: '',
    valorUnitario: '',
  });

  useEffect(() => {
    fetchMedicoes(projectId).then(setMedicoes);
  }, [projectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'list' || saved === 'kanban') setViewMode(saved);
  }, []);

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
    }
  };

  const resetForm = () => {
    setForm({
      disciplina: '',
      contratante: '',
      descricao: '',
      quantidade: '',
      unidade: '',
      valorUnitario: '',
    });
  };

  const adicionarMedicao = async () => {
    if (!form.disciplina || !form.descricao || !form.quantidade || !form.valorUnitario) {
      alert('Preencha disciplina, descrição, quantidade e valor unitário.');
      return;
    }
    if (!projectId) {
      alert('Selecione um projeto antes de adicionar medições.');
      return;
    }
    const quantidade = parseFloat((form.quantidade || '').replace(',', '.'));
    const valorUnitario = parseFloat((form.valorUnitario || '').replace(',', '.'));
    if (Number.isNaN(quantidade) || Number.isNaN(valorUnitario)) {
      alert('Quantidade e valor unitário devem ser números válidos (use vírgula ou ponto).');
      return;
    }
    const { data, error } = await supabase.from('medicoes').insert({
      id: newId(),
      project_id: projectId,
      disciplina: form.disciplina,
      contratante: form.contratante,
      descricao: form.descricao,
      quantidade,
      unidade: form.unidade,
      valor_unitario: valorUnitario,
      valor_total: quantidade * valorUnitario,
      created_by: currentUserName,
    }).select().maybeSingle();
    if (error) {
      console.error('Erro ao adicionar medição:', error);
      alert(`Erro ao adicionar medição: ${error.message}`);
      return;
    }
    if (!data) {
      alert('Não foi possível salvar a medição. Verifique se você tem permissão neste projeto.');
      return;
    }
    setMedicoes(prev => [...prev, {
      id: data.id, projectId: data.project_id, disciplina: data.disciplina,
      contratante: data.contratante ?? '', descricao: data.descricao,
      quantidade: data.quantidade, unidade: data.unidade ?? '',
      valorUnitario: data.valor_unitario, valorTotal: data.valor_total,
      createdAt: data.created_at, createdBy: data.created_by ?? '',
    }]);
    resetForm();
    setShowAdd(false);
  };

  const removerMedicao = async (id: string) => {
    if (!confirm('Remover esta medição?')) return;
    await supabase.from('medicoes').delete().eq('id', id);
    setMedicoes(prev => prev.filter(m => m.id !== id));
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newMedicoes: Medicao[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',');
        if (cols.length >= 7) {
          const quantidade = parseFloat((cols[4] || '').replace(',', '.')) || 0;
          const valorUnitario = parseFloat((cols[6] || '').replace(',', '.')) || 0;

          newMedicoes.push({
            id: '',
            projectId,
            disciplina: cols[0].trim(),
            contratante: cols[1].trim(),
            descricao: cols[2].trim(),
            quantidade,
            unidade: cols[5].trim(),
            valorUnitario,
            valorTotal: quantidade * valorUnitario,
            createdAt: new Date().toISOString(),
            createdBy: currentUserName,
          });
        }
      }

      const inserts = newMedicoes.map(m => ({
        id: newId(),
        project_id: m.projectId,
        disciplina: m.disciplina,
        contratante: m.contratante,
        descricao: m.descricao,
        quantidade: m.quantidade,
        unidade: m.unidade,
        valor_unitario: m.valorUnitario,
        valor_total: m.valorTotal,
        created_by: m.createdBy,
      }));
      await supabase.from('medicoes').insert(inserts);
      const refreshed = await fetchMedicoes(projectId);
      setMedicoes(refreshed);
      alert(`${newMedicoes.length} medições importadas!`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadRelatorio = (disciplina?: string) => {
    let filtered = medicoes;
    if (disciplina) {
      filtered = medicoes.filter(m => m.disciplina === disciplina);
    }

    let csv = 'Disciplina,Contratante,Descrição,Quantidade,Unidade,Valor Unitário,Valor Total\n';
    let totalGeral = 0;

    filtered.forEach(m => {
      csv += `${m.disciplina},${m.contratante},${m.descricao},${m.quantidade},${m.unidade},${m.valorUnitario.toFixed(2)},${m.valorTotal.toFixed(2)}\n`;
      totalGeral += m.valorTotal;
    });

    csv += `\n,,,,,,TOTAL,${totalGeral.toFixed(2)}`;

    const disciplinaLabel = disciplina ? `_${disciplina}` : '_todos';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medicoes${disciplinaLabel}.csv`;
    a.click();
  };

  const filteredMedicoes = medicoes.filter(m => {
    if (filterDisciplina && m.disciplina !== filterDisciplina) return false;
    if (filterContratante && m.contratante !== filterContratante) return false;
    return true;
  });

  const totalGeral = filteredMedicoes.reduce((acc, m) => acc + m.valorTotal, 0);
  const contratantes = [...new Set(medicoes.map(m => m.contratante))];

  return (
    <div className="glass-card p-8 rounded-[40px] space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Medições da Obra</h2>
          <p className="text-sm text-slate-500">
            {medicoes.length} item(ns) • Total: R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => switchView('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
              }`}
              aria-pressed={viewMode === 'list'}
            >
              <List size={14} /> Lista
            </button>
            <button
              onClick={() => switchView('kanban')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
              }`}
              aria-pressed={viewMode === 'kanban'}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
          </div>
          {viewMode === 'list' && (
            <>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleCSVUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-500 hover:text-white rounded-xl cursor-pointer"
              >
                <Upload size={18} /> Importar
              </label>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                  showFilters ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'
                }`}
              >
                <Filter size={18} /> Filtrar
              </button>
              {canEdit && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl"
                >
                  <Plus size={18} /> Novo
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <MedicoesKanban
          projectId={projectId}
          currentUserName={currentUserName}
          canEdit={canEdit}
        />
      ) : (
        <>
          {showFilters && (
            <div className="flex gap-4 p-4 bg-white/5 rounded-xl flex-wrap">
              <select
                value={filterDisciplina}
                onChange={(e) => setFilterDisciplina(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              >
                <option value="">Todas disciplinas</option>
                {DISCIPLINAS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={filterContratante}
                onChange={(e) => setFilterContratante(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              >
                <option value="">Todos contratantes</option>
                {contratantes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => downloadRelatorio()}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-500 hover:text-white rounded-xl"
                >
                  <Download size={18} /> Todos
                </button>
                {filterDisciplina && (
                  <button
                    onClick={() => downloadRelatorio(filterDisciplina)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl"
                  >
                    <Download size={18} /> {filterDisciplina}
                  </button>
                )}
              </div>
            </div>
          )}

          {showAdd && (
            <div className="p-4 bg-white/5 rounded-xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={form.disciplina}
                  onChange={(e) => setForm({ ...form, disciplina: e.target.value })}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                >
                  <option value="">Disciplina</option>
                  {DISCIPLINAS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.contratante}
                  onChange={(e) => setForm({ ...form, contratante: e.target.value })}
                  placeholder="Contratante"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
              </div>
              <input
                type="text"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição do serviço"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                  placeholder="Quantidade"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
                <input
                  type="text"
                  value={form.unidade}
                  onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                  placeholder="Unidade (m, m², etc)"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
                <input
                  type="text"
                  value={form.valorUnitario}
                  onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })}
                  placeholder="Valor Unitário (R$)"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 py-2 text-slate-500 hover:text-white">
                  Cancelar
                </button>
                <button onClick={adicionarMedicao} className="flex-1 py-2 bg-blue-600 text-white rounded-xl">
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {filteredMedicoes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nenhuma medição ainda. Clique em &quot;Novo&quot; para adicionar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-white/10">
                    <th className="pb-3">Disciplina</th>
                    <th className="pb-3">Contratante</th>
                    <th className="pb-3">Descrição</th>
                    <th className="pb-3 text-right">Qtd</th>
                    <th className="pb-3 text-right">Valor Unit.</th>
                    <th className="pb-3 text-right">Total</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedicoes.map(m => (
                    <tr key={m.id} className="border-b border-white/5">
                      <td className="py-3 text-white">{m.disciplina}</td>
                      <td className="py-3 text-slate-400">{m.contratante}</td>
                      <td className="py-3 text-slate-400">{m.descricao}</td>
                      <td className="py-3 text-right text-white">{m.quantidade} {m.unidade}</td>
                      <td className="py-3 text-right text-slate-400">R$ {m.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right text-green-400 font-bold">R$ {m.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => removerMedicao(m.id)} className="text-slate-500 hover:text-rose-500">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
