'use client';

import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentCategory =
  | 'PLANTA' | 'CONTRATO' | 'ART' | 'MEMORIAL' | 'FOTO' | 'OUTRO';

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  category: DocumentCategory;
  url: string;
  storagePath: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function loadDocuments(projectId: string): Promise<ProjectDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) { console.error('loadDocuments', error); return []; }
  return (data || []).map(mapDocument);
}

export async function uploadDocument(
  projectId: string,
  file: File,
  category: DocumentCategory,
  uploadedBy: string
): Promise<ProjectDocument | null> {
  const ext = file.name.split('.').pop() ?? '';
  const storagePath = `${projectId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('project-documents')
    .upload(storagePath, file, { upsert: false });

  if (uploadError) { console.error('uploadDocument storage', uploadError); return null; }

  const { data: urlData } = supabase.storage
    .from('project-documents')
    .getPublicUrl(storagePath);

  const { data, error: dbError } = await supabase
    .from('documents')
    .insert([{
      project_id: projectId,
      name: file.name,
      category,
      url: urlData.publicUrl,
      storage_path: storagePath,
      size: file.size,
      uploaded_by: uploadedBy,
    }])
    .select()
    .single();

  if (dbError) {
    console.error('uploadDocument db', dbError);
    await supabase.storage.from('project-documents').remove([storagePath]);
    return null;
  }
  return mapDocument(data);
}

export async function deleteDocument(doc: ProjectDocument): Promise<boolean> {
  const { error: storageError } = await supabase.storage
    .from('project-documents')
    .remove([doc.storagePath]);
  if (storageError) console.warn('deleteDocument storage', storageError);

  const { error } = await supabase.from('documents').delete().eq('id', doc.id);
  if (error) { console.error('deleteDocument db', error); return false; }
  return true;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapDocument(r: Record<string, unknown>): ProjectDocument {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    name: r.name as string,
    category: r.category as DocumentCategory,
    url: r.url as string,
    storagePath: r.storage_path as string,
    size: Number(r.size ?? 0),
    uploadedBy: r.uploaded_by as string,
    createdAt: r.created_at as string,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
