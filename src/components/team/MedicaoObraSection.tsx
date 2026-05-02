'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Download, Upload, Trash2, DollarSign, FileSpreadsheet, Filter, X } from 'lucide-react';

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

const MEDICOES_KEY = 'projeto_medicoes';

const DISCIPLINAS = ['Elétrica', 'Hidráulica', 'Alvenaria', 'Revestimento', 'Pintura', 'Gás', 'Dados', 'Incêndio'];

function loadMedicoes(projectId: string): Medicao[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`${MEDICOES_KEY}_${projectId}`);
  return stored ? JSON.parse(stored) : [];
}

function saveMedicoes(projectId: string, medicoes: Medicao[]): void {
  localStorage.setItem(`${MEDICOES_KEY}_${projectId}`, JSON.stringify(medicoes));
}

function generateId(): string {
  return `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
}

export default function MedicaoObraSection({ 
  projectId, 
  currentUserName 
}: MedicaoObraSectionProps) {
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
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
    setMedicoes(loadMedicoes(projectId));
  }, [projectId]);

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

  const adicionarMedicao = () => {
    if (!form.disciplina || !form.descricao || !form.quantidade || !form.valorUnitario) return;
    
    const quantidade = parseFloat(form.quantidade.replace(',', '.'));
    const valorUnitario = parseFloat(form.valorUnitario.replace(',', '.'));
    
    const nova: Medicao = {
      id: generateId(),
      projectId,
      disciplina: form.disciplina,
      contratante: form.contratante,
      descricao: form.descricao,
      quantidade,
      unidade: form.unidade,
      valorUnitario,
      valorTotal: quantidade * valorUnitario,
      createdAt: new Date().toISOString(),
      createdBy: currentUserName,
    };
    
    const updated = [...medicoes, nova];
    saveMedicoes(projectId, updated);
    setMedicoes(updated);
    resetForm();
    setShowAdd(false);
  };

  const removerMedicao = (id: string) => {
    if (!confirm('Remover esta medição?')) return;
    const updated = medicoes.filter(m => m.id !== id);
    saveMedicoes(projectId, updated);
    setMedicoes(updated);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newMedicoes: Medicao[] = [];

      // Pular header (linha 0)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(',');
        if (cols.length >= 7) {
          const quantidade = parseFloat(cols[4].replace(',', '.')) || 0;
          const valorUnitario = parseFloat(cols[6].replace(',', '.')) || 0;
          
          newMedicoes.push({
            id: generateId(),
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

      const updated = [...medicoes, ...newMedicoes];
      saveMedicoes(projectId, updated);
      setMedicoes(updated);
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
          <p className="text-sm text-slate-500">{medicoes.length} item(ns) • Total: R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="flex gap-2">
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${showFilters ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
          >
            <Filter size={18} /> Filtrar
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl"
          >
            <Plus size={18} /> Novo
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
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
          Nenhuma medição ainda. Clique em "Novo" para adicionar.
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
    </div>
  );
}