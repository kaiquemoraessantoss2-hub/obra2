import { supabase } from './supabase';

export interface EmpresaBranding {
  id: string;
  name: string;
  logoUrl: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  emailContato: string | null;
  responsavelTecnico: string | null;
  responsavelTecnicoCrea: string | null;
}

interface RawCompany {
  id: string;
  name: string;
  logo_url: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email_contato: string | null;
  responsavel_tecnico: string | null;
  responsavel_tecnico_crea: string | null;
}

function mapCompany(r: RawCompany): EmpresaBranding {
  return {
    id: r.id,
    name: r.name,
    logoUrl: r.logo_url,
    cnpj: r.cnpj,
    endereco: r.endereco,
    telefone: r.telefone,
    emailContato: r.email_contato,
    responsavelTecnico: r.responsavel_tecnico,
    responsavelTecnicoCrea: r.responsavel_tecnico_crea,
  };
}

export async function fetchEmpresaBranding(companyId: string): Promise<EmpresaBranding | null> {
  if (!companyId) return null;
  const { data, error } = await supabase
    .from('companies')
    .select('id,name,logo_url,cnpj,endereco,telefone,email_contato,responsavel_tecnico,responsavel_tecnico_crea')
    .eq('id', companyId)
    .maybeSingle();
  if (error || !data) return null;
  return mapCompany(data as RawCompany);
}

export interface BrandingUpdate {
  cnpj: string;
  endereco: string;
  telefone: string;
  emailContato: string;
  responsavelTecnico: string;
  responsavelTecnicoCrea: string; // pode ser ''
  logoUrl: string | null;
}

export async function saveEmpresaBranding(
  companyId: string,
  payload: BrandingUpdate,
): Promise<{ ok: boolean; error?: string }> {
  if (!companyId) return { ok: false, error: 'company_id ausente' };
  const { error } = await supabase
    .from('companies')
    .update({
      cnpj: payload.cnpj || null,
      endereco: payload.endereco || null,
      telefone: payload.telefone || null,
      email_contato: payload.emailContato || null,
      responsavel_tecnico: payload.responsavelTecnico || null,
      responsavel_tecnico_crea: payload.responsavelTecnicoCrea || null,
      logo_url: payload.logoUrl,
    })
    .eq('id', companyId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Faz upload do logo no bucket empresa-logos. Retorna URL pública. */
export async function uploadLogo(
  companyId: string,
  file: File,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!companyId) return { ok: false, error: 'company_id ausente' };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'Logo deve ter no máximo 2 MB.' };
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return { ok: false, error: 'Formato suportado: PNG, JPG, WEBP.' };
  }
  const path = `${companyId}/logo.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('empresa-logos')
    .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });
  if (uploadError) return { ok: false, error: uploadError.message };
  const { data } = supabase.storage.from('empresa-logos').getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
