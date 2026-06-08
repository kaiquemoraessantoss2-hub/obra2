'use client';

import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MaterialCategory =
  | 'STRUCTURAL' | 'FINISHING' | 'ELECTRICAL'
  | 'HYDRAULIC' | 'TOOLS' | 'SAFETY' | 'OTHER';

export interface Material {
  id: string;
  projectId: string;
  name: string;
  category: MaterialCategory;
  unit: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
  supplier?: string;
  createdAt?: string;
}

export interface WarehouseEntry {
  id: string;
  projectId: string;
  materialId: string;
  materialName?: string;
  quantity: number;
  unitCost: number;
  supplier?: string;
  invoiceNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface WarehouseExit {
  id: string;
  projectId: string;
  materialId: string;
  materialName?: string;
  quantity: number;
  destinationFloor?: string;
  destinationPhase?: string;
  requestedBy: string;
  approvedBy?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  createdAt: string;
}

// ─── Materials ────────────────────────────────────────────────────────────────

export async function loadMaterials(projectId: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('project_id', projectId)
    .order('name');
  if (error) { console.error('loadMaterials', error); return []; }
  return (data || []).map(mapMaterial);
}

export async function saveMaterial(mat: Omit<Material, 'id' | 'createdAt'>): Promise<Material | null> {
  const { data, error } = await supabase
    .from('materials')
    .insert([{
      project_id: mat.projectId,
      name: mat.name,
      category: mat.category,
      unit: mat.unit,
      current_stock: mat.currentStock,
      min_stock: mat.minStock,
      unit_cost: mat.unitCost,
      supplier: mat.supplier || null,
    }])
    .select()
    .single();
  if (error) { console.error('saveMaterial', error); return null; }
  return mapMaterial(data);
}

export async function updateMaterial(id: string, updates: Partial<Material>): Promise<boolean> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.unit !== undefined) payload.unit = updates.unit;
  if (updates.currentStock !== undefined) payload.current_stock = updates.currentStock;
  if (updates.minStock !== undefined) payload.min_stock = updates.minStock;
  if (updates.unitCost !== undefined) payload.unit_cost = updates.unitCost;
  if (updates.supplier !== undefined) payload.supplier = updates.supplier;
  const { error } = await supabase.from('materials').update(payload).eq('id', id);
  if (error) { console.error('updateMaterial', error); return false; }
  return true;
}

export async function deleteMaterial(id: string): Promise<boolean> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) { console.error('deleteMaterial', error); return false; }
  return true;
}

// ─── Warehouse Entries ────────────────────────────────────────────────────────

export async function loadEntries(projectId: string): Promise<WarehouseEntry[]> {
  const { data, error } = await supabase
    .from('warehouse_entries')
    .select('*, materials(name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) { console.error('loadEntries', error); return []; }
  return (data || []).map(mapEntry);
}

export async function addEntry(entry: Omit<WarehouseEntry, 'id' | 'createdAt' | 'materialName'>): Promise<boolean> {
  const { error: entryErr } = await supabase
    .from('warehouse_entries')
    .insert([{
      project_id: entry.projectId,
      material_id: entry.materialId,
      quantity: entry.quantity,
      unit_cost: entry.unitCost,
      supplier: entry.supplier || null,
      invoice_number: entry.invoiceNumber || null,
      notes: entry.notes || null,
      created_by: entry.createdBy,
    }]);
  if (entryErr) { console.error('addEntry', entryErr); return false; }

  // update current_stock
  const { data: mat } = await supabase.from('materials').select('current_stock').eq('id', entry.materialId).single();
  if (mat) {
    await supabase.from('materials').update({ current_stock: Number(mat.current_stock) + entry.quantity }).eq('id', entry.materialId);
  }
  return true;
}

// ─── Warehouse Exits ──────────────────────────────────────────────────────────

export async function loadExits(projectId: string): Promise<WarehouseExit[]> {
  const { data, error } = await supabase
    .from('warehouse_exits')
    .select('*, materials(name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) { console.error('loadExits', error); return []; }
  return (data || []).map(mapExit);
}

export async function addExit(exit: Omit<WarehouseExit, 'id' | 'createdAt' | 'materialName'>): Promise<boolean> {
  const { error } = await supabase
    .from('warehouse_exits')
    .insert([{
      project_id: exit.projectId,
      material_id: exit.materialId,
      quantity: exit.quantity,
      destination_floor: exit.destinationFloor || null,
      destination_phase: exit.destinationPhase || null,
      requested_by: exit.requestedBy,
      approved_by: exit.approvedBy || null,
      status: exit.status,
      notes: exit.notes || null,
    }]);
  if (error) { console.error('addExit', error); return false; }

  if (exit.status === 'APPROVED') {
    const { data: mat } = await supabase.from('materials').select('current_stock').eq('id', exit.materialId).single();
    if (mat) {
      const newStock = Math.max(0, Number(mat.current_stock) - exit.quantity);
      await supabase.from('materials').update({ current_stock: newStock }).eq('id', exit.materialId);
    }
  }
  return true;
}

export async function approveExit(exitId: string, materialId: string, quantity: number, approvedBy: string): Promise<boolean> {
  const { error } = await supabase.from('warehouse_exits').update({ status: 'APPROVED', approved_by: approvedBy }).eq('id', exitId);
  if (error) { console.error('approveExit', error); return false; }
  const { data: mat } = await supabase.from('materials').select('current_stock').eq('id', materialId).single();
  if (mat) {
    const newStock = Math.max(0, Number(mat.current_stock) - quantity);
    await supabase.from('materials').update({ current_stock: newStock }).eq('id', materialId);
  }
  return true;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapMaterial(r: any): Material {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    category: r.category,
    unit: r.unit,
    currentStock: Number(r.current_stock ?? 0),
    minStock: Number(r.min_stock ?? 0),
    unitCost: Number(r.unit_cost ?? 0),
    supplier: r.supplier || '',
    createdAt: r.created_at,
  };
}

function mapEntry(r: any): WarehouseEntry {
  return {
    id: r.id,
    projectId: r.project_id,
    materialId: r.material_id,
    materialName: r.materials?.name,
    quantity: Number(r.quantity),
    unitCost: Number(r.unit_cost ?? 0),
    supplier: r.supplier || '',
    invoiceNumber: r.invoice_number || '',
    notes: r.notes || '',
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

function mapExit(r: any): WarehouseExit {
  return {
    id: r.id,
    projectId: r.project_id,
    materialId: r.material_id,
    materialName: r.materials?.name,
    quantity: Number(r.quantity),
    destinationFloor: r.destination_floor || '',
    destinationPhase: r.destination_phase || '',
    requestedBy: r.requested_by,
    approvedBy: r.approved_by || '',
    status: r.status,
    notes: r.notes || '',
    createdAt: r.created_at,
  };
}

// ─── SQL migration (run once in Supabase SQL editor) ─────────────────────────
/*
CREATE TABLE IF NOT EXISTS materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    TEXT NOT NULL,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'OTHER',
  unit          TEXT NOT NULL DEFAULT 'un',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock     NUMERIC NOT NULL DEFAULT 0,
  unit_cost     NUMERIC NOT NULL DEFAULT 0,
  supplier      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warehouse_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     TEXT NOT NULL,
  material_id    UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity       NUMERIC NOT NULL,
  unit_cost      NUMERIC NOT NULL DEFAULT 0,
  supplier       TEXT,
  invoice_number TEXT,
  notes          TEXT,
  created_by     TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warehouse_exits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        TEXT NOT NULL,
  material_id       UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity          NUMERIC NOT NULL,
  destination_floor TEXT,
  destination_phase TEXT,
  requested_by      TEXT NOT NULL,
  approved_by       TEXT,
  status            TEXT NOT NULL DEFAULT 'PENDING',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS (enable after testing)
-- ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE warehouse_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE warehouse_exits ENABLE ROW LEVEL SECURITY;
*/
