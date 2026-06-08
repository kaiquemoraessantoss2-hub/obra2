'use client';

import { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react';
import {
  FileText, Image, FileCheck, FileStack, File, Upload,
  Download, Trash2, X, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import {
  ProjectDocument, DocumentCategory,
  loadDocuments, uploadDocument, deleteDocument, formatFileSize,
} from '@/lib/documentos';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: DocumentCategory; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { value: 'PLANTA',    label: 'Planta',     Icon: FileStack },
  { value: 'CONTRATO',  label: 'Contrato',   Icon: FileCheck },
  { value: 'ART',       label: 'ART',        Icon: FileText },
  { value: 'MEMORIAL',  label: 'Memorial',   Icon: FileText },
  { value: 'FOTO',      label: 'Foto',       Icon: Image },
  { value: 'OUTRO',     label: 'Outro',      Icon: File },
];

const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  PLANTA:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CONTRATO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ART:      'bg-violet-500/10 text-violet-400 border-violet-500/20',
  MEMORIAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  FOTO:     'bg-pink-500/10 text-pink-400 border-pink-500/20',
  OUTRO:    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

function categoryIcon(cat: DocumentCategory) {
  const found = CATEGORIES.find(c => c.value === cat);
  return found?.Icon ?? File;
}

function categoryLabel(cat: DocumentCategory) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onUpload: (file: File, category: DocumentCategory) => Promise<void>;
  uploading: boolean;
}

function UploadModal({ onClose, onUpload, uploading }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('OUTRO');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }

  async function handleSubmit() {
    if (!file) return;
    await onUpload(file, category);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Enviar Documento</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer transition-colors mb-4',
            dragging
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/40',
          )}
        >
          <Upload size={24} className="text-zinc-400" />
          {file ? (
            <span className="text-sm text-white font-medium text-center break-all">{file.name}</span>
          ) : (
            <>
              <span className="text-sm text-zinc-300">Arraste ou clique para selecionar</span>
              <span className="text-xs text-zinc-500">PDF, DWG, DXF, JPG, PNG, DOCX…</span>
            </>
          )}
          {file && (
            <span className="text-xs text-zinc-500">{formatFileSize(file.size)}</span>
          )}
          <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>

        <div className="mb-5">
          <label className="block text-xs text-zinc-400 mb-1.5">Categoria</label>
          <div className="relative">
            <select
              value={category}
              onChange={e => setCategory(e.target.value as DocumentCategory)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:border-zinc-500"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {uploading ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocCardProps {
  doc: ProjectDocument;
  onDelete: (doc: ProjectDocument) => void;
}

function DocCard({ doc, onDelete }: DocCardProps) {
  const Icon = categoryIcon(doc.category);
  const colorClass = CATEGORY_COLORS[doc.category];

  const date = new Date(doc.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className={cn('p-2.5 rounded-lg border', colorClass)}>
          <Icon size={20} />
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Baixar"
          >
            <Download size={14} />
          </a>
          <button
            onClick={() => onDelete(doc)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate" title={doc.name}>
          {doc.name}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">{formatFileSize(doc.size)}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', colorClass)}>
          {categoryLabel(doc.category)}
        </span>
        <span className="text-xs text-zinc-600">{date}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DocumentosTab() {
  const { activeProjectId, currentUser } = useAppContext();

  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [filterCat, setFilterCat] = useState<DocumentCategory | 'ALL'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProjectId) return;
    setLoading(true);
    loadDocuments(activeProjectId).then(data => {
      setDocs(data);
      setLoading(false);
    });
  }, [activeProjectId]);

  async function handleUpload(file: File, category: DocumentCategory) {
    if (!activeProjectId || !currentUser) return;
    setUploading(true);
    const doc = await uploadDocument(activeProjectId, file, category, currentUser.name || currentUser.email);
    if (doc) setDocs(prev => [doc, ...prev]);
    setUploading(false);
    setShowUpload(false);
  }

  async function handleDelete(doc: ProjectDocument) {
    setDeletingId(doc.id);
    const ok = await deleteDocument(doc);
    if (ok) setDocs(prev => prev.filter(d => d.id !== doc.id));
    setDeletingId(null);
  }

  const filtered = filterCat === 'ALL' ? docs : docs.filter(d => d.category === filterCat);

  const counts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.value] = docs.filter(d => d.category === c.value).length;
    return acc;
  }, {});

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        Selecione um projeto para ver os documentos.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
          uploading={uploading}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Documentos</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {docs.length} {docs.length === 1 ? 'arquivo' : 'arquivos'}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <Upload size={15} />
          Enviar Arquivo
        </button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setFilterCat('ALL')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            filterCat === 'ALL'
              ? 'bg-white/10 border-white/20 text-white'
              : 'border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600',
          )}
        >
          Todos ({docs.length})
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilterCat(c.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              filterCat === c.value
                ? cn('border', CATEGORY_COLORS[c.value])
                : 'border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600',
            )}
          >
            {c.label} ({counts[c.value] ?? 0})
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
          Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-zinc-500">
          <File size={36} className="text-zinc-700" />
          <p className="text-sm">
            {filterCat === 'ALL' ? 'Nenhum documento enviado ainda.' : `Sem documentos na categoria "${categoryLabel(filterCat)}".`}
          </p>
          {filterCat === 'ALL' && (
            <button
              onClick={() => setShowUpload(true)}
              className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-2"
            >
              Enviar primeiro arquivo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(doc => (
            <div key={doc.id} className={cn('transition-opacity', deletingId === doc.id && 'opacity-40 pointer-events-none')}>
              <DocCard doc={doc} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
