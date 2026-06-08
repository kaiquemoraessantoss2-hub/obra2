'use client';

import { useState, useEffect } from 'react';
import {
  Plus, X, ChevronLeft, Printer, Trash2, Pencil,
  Sun, Cloud, CloudRain, CloudLightning, CloudSun,
  Users, HardHat, Clipboard, Wrench, AlertTriangle, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import {
  RDO, RDOWorker, WeatherType,
  loadRDOs, saveRDO, updateRDO, deleteRDO, printRDO,
} from '@/lib/rdo';

// ─── Constants ────────────────────────────────────────────────────────────────

const WEATHER_OPTIONS: { value: WeatherType; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { value: 'SUNNY',         label: 'Ensolarado',          Icon: Sun },
  { value: 'PARTLY_CLOUDY', label: 'Parcialmente nublado', Icon: CloudSun },
  { value: 'CLOUDY',        label: 'Nublado',              Icon: Cloud },
  { value: 'RAINY',         label: 'Chuvoso',              Icon: CloudRain },
  { value: 'STORMY',        label: 'Tempestuoso',          Icon: CloudLightning },
];

const WEATHER_COLORS: Record<WeatherType, string> = {
  SUNNY:         'text-amber-400',
  PARTLY_CLOUDY: 'text-sky-300',
  CLOUDY:        'text-zinc-400',
  RAINY:         'text-blue-400',
  STORMY:        'text-violet-400',
};

const COMMON_TRADES = [
  'Pedreiro', 'Servente', 'Armador', 'Carpinteiro', 'Eletricista',
  'Encanador', 'Pintor', 'Gesseiro', 'Azulejista', 'Mestre de obras',
];

function weatherLabel(w: WeatherType) {
  return WEATHER_OPTIONS.find(o => o.value === w)?.label ?? w;
}

function WeatherIcon({ weather, size = 16, className }: { weather: WeatherType; size?: number; className?: string }) {
  const found = WEATHER_OPTIONS.find(o => o.value === weather);
  if (!found) return null;
  return <found.Icon size={size} className={cn(WEATHER_COLORS[weather], className)} />;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Empty form ───────────────────────────────────────────────────────────────

function emptyForm() {
  return {
    date: new Date().toISOString().split('T')[0],
    weather: 'SUNNY' as WeatherType,
    temperature: '' as string | number,
    workersJson: [] as RDOWorker[],
    activities: '',
    occurrences: '',
    materialsUsed: '',
    observations: '',
  };
}

type FormState = ReturnType<typeof emptyForm>;

// ─── Workers editor ───────────────────────────────────────────────────────────

interface WorkersEditorProps {
  workers: RDOWorker[];
  onChange: (workers: RDOWorker[]) => void;
}

function WorkersEditor({ workers, onChange }: WorkersEditorProps) {
  const [newTrade, setNewTrade] = useState('');
  const [newCount, setNewCount] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  function addWorker() {
    const trade = newTrade.trim();
    const count = parseInt(newCount);
    if (!trade || !count || count < 1) return;
    const existing = workers.findIndex(w => w.trade.toLowerCase() === trade.toLowerCase());
    if (existing >= 0) {
      const updated = [...workers];
      updated[existing] = { ...updated[existing], count: updated[existing].count + count };
      onChange(updated);
    } else {
      onChange([...workers, { trade, count }]);
    }
    setNewTrade('');
    setNewCount('');
  }

  function removeWorker(idx: number) {
    onChange(workers.filter((_, i) => i !== idx));
  }

  function updateCount(idx: number, count: number) {
    if (count < 1) return removeWorker(idx);
    const updated = [...workers];
    updated[idx] = { ...updated[idx], count };
    onChange(updated);
  }

  const suggestions = COMMON_TRADES.filter(
    t => t.toLowerCase().includes(newTrade.toLowerCase()) &&
      !workers.some(w => w.trade.toLowerCase() === t.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {workers.map((w, i) => (
        <div key={i} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
          <span className="flex-1 text-sm text-white">{w.trade}</span>
          <input
            type="number"
            min={1}
            value={w.count}
            onChange={e => updateCount(i, parseInt(e.target.value) || 0)}
            className="w-14 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-zinc-500"
          />
          <button onClick={() => removeWorker(i)} className="text-zinc-500 hover:text-rose-400 transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}

      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Função (ex: Pedreiro)"
            value={newTrade}
            onChange={e => { setNewTrade(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
          {showSuggestions && newTrade && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 max-h-40 overflow-y-auto">
              {suggestions.slice(0, 6).map(s => (
                <button
                  key={s}
                  onMouseDown={() => { setNewTrade(s); setShowSuggestions(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="number"
          min={1}
          placeholder="Qtd"
          value={newCount}
          onChange={e => setNewCount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addWorker()}
          className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={addWorker}
          disabled={!newTrade.trim() || !newCount}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded-lg text-white transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface RDOFormProps {
  initial?: RDO;
  onSave: (form: FormState) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function RDOForm({ initial, onSave, onCancel, saving }: RDOFormProps) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          date: initial.date,
          weather: initial.weather,
          temperature: initial.temperature ?? '',
          workersJson: initial.workersJson,
          activities: initial.activities,
          occurrences: initial.occurrences,
          materialsUsed: initial.materialsUsed,
          observations: initial.observations,
        }
      : emptyForm()
  );

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  const totalWorkers = form.workersJson.reduce((s, w) => s + w.count, 0);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Date + Weather + Temp */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Data *</label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Temperatura (°C)</label>
          <input
            type="number"
            placeholder="Ex: 28"
            value={form.temperature}
            onChange={e => set('temperature', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Weather */}
      <div>
        <label className="block text-xs text-zinc-400 mb-2">Condição do Tempo *</label>
        <div className="flex gap-2 flex-wrap">
          {WEATHER_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => set('weather', o.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                form.weather === o.value
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300',
              )}
            >
              <o.Icon size={14} className={form.weather === o.value ? WEATHER_COLORS[o.value] : ''} />
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-zinc-400">Mão de Obra</label>
          {totalWorkers > 0 && (
            <span className="text-xs text-zinc-500">{totalWorkers} pessoa{totalWorkers !== 1 ? 's' : ''}</span>
          )}
        </div>
        <WorkersEditor workers={form.workersJson} onChange={w => set('workersJson', w)} />
      </div>

      {/* Activities */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Atividades Realizadas *</label>
        <textarea
          rows={4}
          placeholder="Descreva as atividades executadas hoje…"
          value={form.activities}
          onChange={e => set('activities', e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
        />
      </div>

      {/* Materials Used */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Materiais Utilizados</label>
        <textarea
          rows={3}
          placeholder="Liste os materiais consumidos hoje…"
          value={form.materialsUsed}
          onChange={e => set('materialsUsed', e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
        />
      </div>

      {/* Occurrences */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Ocorrências / Incidentes</label>
        <textarea
          rows={3}
          placeholder="Registre ocorrências, problemas ou acidentes…"
          value={form.occurrences}
          onChange={e => set('occurrences', e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
        />
      </div>

      {/* Observations */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Observações Gerais</label>
        <textarea
          rows={3}
          placeholder="Observações adicionais…"
          value={form.observations}
          onChange={e => set('observations', e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.date || !form.activities.trim() || saving}
          className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {saving ? 'Salvando…' : initial ? 'Atualizar RDO' : 'Salvar RDO'}
        </button>
      </div>
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

interface RDODetailProps {
  rdo: RDO;
  projectName: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function RDODetail({ rdo, projectName, onBack, onEdit, onDelete }: RDODetailProps) {
  const totalWorkers = rdo.workersJson.reduce((s, w) => s + w.count, 0);

  function SectionBlock({ icon: Icon, title, content }: { icon: React.FC<{ size?: number; className?: string }>; title: string; content: string }) {
    if (!content.trim()) return null;
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={14} className="text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</span>
        </div>
        <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={16} /> Voltar
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => printRDO(rdo, projectName)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-800 transition-colors"
          >
            <Printer size={13} /> Imprimir / PDF
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-800 transition-colors"
          >
            <Pencil size={13} /> Editar
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 text-xs hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 size={13} /> Excluir
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{formatDate(rdo.date)}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Por {rdo.createdBy}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg">
            <WeatherIcon weather={rdo.weather} size={18} />
            <span className="text-sm text-zinc-300">{weatherLabel(rdo.weather)}</span>
            {rdo.temperature != null && (
              <span className="text-sm text-zinc-500">{rdo.temperature}°C</span>
            )}
          </div>
        </div>

        {/* Workers summary */}
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Users size={14} />
          <span>{totalWorkers} pessoa{totalWorkers !== 1 ? 's' : ''} na obra</span>
        </div>
      </div>

      {/* Workers detail */}
      {rdo.workersJson.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <HardHat size={14} className="text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mão de Obra</span>
          </div>
          <div className="space-y-1.5">
            {rdo.workersJson.map((w, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{w.trade}</span>
                <span className="text-zinc-500 tabular-nums">{w.count}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-800 font-medium">
              <span className="text-zinc-200">Total</span>
              <span className="text-white tabular-nums">{totalWorkers}</span>
            </div>
          </div>
        </div>
      )}

      <SectionBlock icon={Clipboard} title="Atividades Realizadas" content={rdo.activities} />
      <SectionBlock icon={Wrench} title="Materiais Utilizados" content={rdo.materialsUsed} />
      <SectionBlock icon={AlertTriangle} title="Ocorrências" content={rdo.occurrences} />
      <SectionBlock icon={MessageSquare} title="Observações" content={rdo.observations} />
    </div>
  );
}

// ─── List card ────────────────────────────────────────────────────────────────

interface RDOCardProps {
  rdo: RDO;
  onClick: () => void;
}

function RDOCard({ rdo, onClick }: RDOCardProps) {
  const totalWorkers = rdo.workersJson.reduce((s, w) => s + w.count, 0);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <WeatherIcon weather={rdo.weather} size={14} />
            <span className="text-sm font-semibold text-white">{formatDate(rdo.date)}</span>
          </div>
          {rdo.activities && (
            <p className="text-xs text-zinc-500 truncate mt-0.5">{rdo.activities}</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
          <Users size={12} />
          <span>{totalWorkers}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type View = 'list' | 'form-new' | 'form-edit' | 'detail';

export default function RDOTab() {
  const { activeProjectId, currentUser, allProjects } = useAppContext();

  const [rdos, setRdos] = useState<RDO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<RDO | null>(null);

  const projectName = allProjects?.find(p => p.id === activeProjectId)?.name ?? 'Obra';

  useEffect(() => {
    if (!activeProjectId) return;
    setLoading(true);
    loadRDOs(activeProjectId).then(data => {
      setRdos(data);
      setLoading(false);
    });
  }, [activeProjectId]);

  async function handleSaveNew(form: ReturnType<typeof emptyForm>) {
    if (!activeProjectId || !currentUser) return;
    setSaving(true);
    const rdo = await saveRDO({
      projectId: activeProjectId,
      date: form.date,
      weather: form.weather,
      temperature: form.temperature !== '' ? Number(form.temperature) : undefined,
      workersJson: form.workersJson,
      activities: form.activities,
      occurrences: form.occurrences,
      materialsUsed: form.materialsUsed,
      observations: form.observations,
      createdBy: currentUser.name || currentUser.email,
    });
    setSaving(false);
    if (rdo) {
      setRdos(prev => [rdo, ...prev]);
      setSelected(rdo);
      setView('detail');
    }
  }

  async function handleSaveEdit(form: ReturnType<typeof emptyForm>) {
    if (!selected) return;
    setSaving(true);
    const ok = await updateRDO(selected.id, {
      date: form.date,
      weather: form.weather,
      temperature: form.temperature !== '' ? Number(form.temperature) : undefined,
      workersJson: form.workersJson,
      activities: form.activities,
      occurrences: form.occurrences,
      materialsUsed: form.materialsUsed,
      observations: form.observations,
    });
    setSaving(false);
    if (ok) {
      const updated = { ...selected, ...form, temperature: form.temperature !== '' ? Number(form.temperature) : undefined };
      setRdos(prev => prev.map(r => r.id === selected.id ? updated : r));
      setSelected(updated);
      setView('detail');
    }
  }

  async function handleDelete() {
    if (!selected) return;
    const ok = await deleteRDO(selected.id);
    if (ok) {
      setRdos(prev => prev.filter(r => r.id !== selected.id));
      setSelected(null);
      setView('list');
    }
  }

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        Selecione um projeto para ver os RDOs.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Form — New */}
      {view === 'form-new' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('list')} className="text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-white">Novo RDO</h2>
          </div>
          <RDOForm onSave={handleSaveNew} onCancel={() => setView('list')} saving={saving} />
        </div>
      )}

      {/* Form — Edit */}
      {view === 'form-edit' && selected && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('detail')} className="text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-white">Editar RDO</h2>
          </div>
          <RDOForm initial={selected} onSave={handleSaveEdit} onCancel={() => setView('detail')} saving={saving} />
        </div>
      )}

      {/* Detail */}
      {view === 'detail' && selected && (
        <RDODetail
          rdo={selected}
          projectName={projectName}
          onBack={() => setView('list')}
          onEdit={() => setView('form-edit')}
          onDelete={handleDelete}
        />
      )}

      {/* List */}
      {view === 'list' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">RDO</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Relatório Diário de Obra</p>
            </div>
            <button
              onClick={() => setView('form-new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <Plus size={15} /> Novo RDO
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">Carregando…</div>
          ) : rdos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-zinc-500">
              <Clipboard size={36} className="text-zinc-700" />
              <p className="text-sm">Nenhum RDO registrado ainda.</p>
              <button
                onClick={() => setView('form-new')}
                className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-2"
              >
                Criar primeiro RDO
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {rdos.map(rdo => (
                <RDOCard
                  key={rdo.id}
                  rdo={rdo}
                  onClick={() => { setSelected(rdo); setView('detail'); }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
