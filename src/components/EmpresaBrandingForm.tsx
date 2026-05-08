'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Building2, Upload, Save, AlertCircle, Check } from 'lucide-react';
import {
  fetchEmpresaBranding,
  saveEmpresaBranding,
  uploadLogo,
  EmpresaBranding,
} from '@/lib/empresaBranding';

interface EmpresaBrandingFormProps {
  companyId: string;
}

export default function EmpresaBrandingForm({ companyId }: EmpresaBrandingFormProps) {
  const [branding, setBranding] = useState<EmpresaBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    cnpj: '',
    endereco: '',
    telefone: '',
    emailContato: '',
    responsavelTecnico: '',
    responsavelTecnicoCrea: '',
    logoUrl: null as string | null,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEmpresaBranding(companyId).then(b => {
      if (cancelled) return;
      if (b) {
        setBranding(b);
        setForm({
          cnpj: b.cnpj ?? '',
          endereco: b.endereco ?? '',
          telefone: b.telefone ?? '',
          emailContato: b.emailContato ?? '',
          responsavelTecnico: b.responsavelTecnico ?? '',
          responsavelTecnicoCrea: b.responsavelTecnicoCrea ?? '',
          logoUrl: b.logoUrl,
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setFeedback(null);
    const result = await uploadLogo(companyId, file);
    setUploadingLogo(false);
    if (!result.ok) {
      setFeedback({ kind: 'err', msg: result.error || 'Erro ao enviar logo.' });
      return;
    }
    // Cache-bust para forçar reload da imagem
    const cacheBusted = `${result.url}?t=${Date.now()}`;
    setForm(prev => ({ ...prev, logoUrl: cacheBusted }));
    setFeedback({ kind: 'ok', msg: 'Logo carregado. Não esqueça de salvar para persistir os campos.' });
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    if (!form.cnpj.trim()) {
      setFeedback({ kind: 'err', msg: 'CNPJ é obrigatório.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    const result = await saveEmpresaBranding(companyId, form);
    setSaving(false);
    if (!result.ok) {
      setFeedback({ kind: 'err', msg: result.error || 'Erro ao salvar.' });
      return;
    }
    setFeedback({ kind: 'ok', msg: 'Identidade da empresa salva com sucesso.' });
  };

  if (loading) {
    return <div className="p-8 text-slate-500 text-sm">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 size={24} className="text-blue-500" />
        <div>
          <h3 className="text-xl font-black text-white">Identidade da Empresa</h3>
          <p className="text-xs text-slate-500">
            Esses dados aparecem no Boletim de Medição PDF. {branding?.name && `Empresa: ${branding.name}.`}
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
            feedback.kind === 'ok'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}
        >
          {feedback.kind === 'ok' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Logo</label>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3">
            {form.logoUrl ? (
              <Image
                src={form.logoUrl}
                alt="Logo da empresa"
                width={120}
                height={120}
                className="rounded-xl object-contain bg-white/5 p-2"
                unoptimized
              />
            ) : (
              <div className="w-[120px] h-[120px] rounded-xl bg-white/5 flex items-center justify-center text-slate-600 text-[10px]">
                sem logo
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              ref={fileRef}
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
              disabled={uploadingLogo}
            />
            <label
              htmlFor="logo-upload"
              className={`flex items-center gap-2 px-3 py-2 text-xs rounded-xl cursor-pointer ${
                uploadingLogo ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              <Upload size={14} /> {uploadingLogo ? 'Enviando...' : 'Trocar logo'}
            </label>
            <p className="text-[10px] text-slate-600 text-center">PNG, JPG ou WEBP, máx. 2 MB.</p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CNPJ *</label>
            <input
              type="text"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Endereço</label>
            <input
              type="text"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              placeholder="Rua, número — bairro, cidade/UF"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone</label>
              <input
                type="text"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(11) 0000-0000"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">E-mail de contato</label>
              <input
                type="email"
                value={form.emailContato}
                onChange={(e) => setForm({ ...form, emailContato: e.target.value })}
                placeholder="contato@empresa.com.br"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Responsável Técnico</label>
              <input
                type="text"
                value={form.responsavelTecnico}
                onChange={(e) => setForm({ ...form, responsavelTecnico: e.target.value })}
                placeholder="Nome do engenheiro responsável"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CREA (opcional)</label>
              <input
                type="text"
                value={form.responsavelTecnicoCrea}
                onChange={(e) => setForm({ ...form, responsavelTecnicoCrea: e.target.value })}
                placeholder="123456-D/SP"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold ${
              saving ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            <Save size={16} /> {saving ? 'Salvando...' : 'Salvar identidade'}
          </button>
        </div>
      </div>
    </div>
  );
}
