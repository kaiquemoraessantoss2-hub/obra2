'use client';

import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupplierCategory =
  | 'STRUCTURAL' | 'FINISHING' | 'ELECTRICAL'
  | 'HYDRAULIC' | 'TOOLS' | 'SAFETY' | 'SERVICES' | 'OTHER';

export type PurchaseUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PurchaseRequestStatus =
  | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'RECEIVED';

export type QuotationStatus = 'PENDING' | 'SELECTED' | 'REJECTED';

export type PurchaseOrderStatus =
  | 'DRAFT' | 'APPROVED' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  cnpj?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  category: SupplierCategory;
  rating: number;
  active: boolean;
  createdAt?: string;
}

export interface PurchaseRequest {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  materialId?: string;
  materialName?: string;
  quantity: number;
  unit: string;
  urgency: PurchaseUrgency;
  status: PurchaseRequestStatus;
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface Quotation {
  id: string;
  purchaseRequestId: string;
  supplierId: string;
  supplierName?: string;
  unitPrice: number;
  totalPrice: number;
  deliveryDays?: number;
  validityDate?: string;
  notes?: string;
  status: QuotationStatus;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  projectId: string;
  purchaseRequestId: string;
  supplierId: string;
  supplierName?: string;
  quotationId?: string;
  totalAmount: number;
  status: PurchaseOrderStatus;
  approvedBy?: string;
  sentAt?: string;
  receivedAt?: string;
  notes?: string;
  createdAt: string;
  requestTitle?: string;
  requestQuantity?: number;
  requestUnit?: string;
  requestMaterialId?: string;
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function loadSuppliers(companyId: string): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('company_id', companyId)
    .order('name');
  if (error) { console.error('loadSuppliers', error); return []; }
  return (data || []).map(mapSupplier);
}

export async function saveSupplier(s: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([{
      company_id: s.companyId,
      name: s.name,
      cnpj: s.cnpj || null,
      contact: s.contact || null,
      phone: s.phone || null,
      email: s.email || null,
      address: s.address || null,
      category: s.category,
      rating: s.rating,
      active: s.active,
    }])
    .select()
    .single();
  if (error) { console.error('saveSupplier', error); return null; }
  return mapSupplier(data);
}

export async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<boolean> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.cnpj !== undefined) payload.cnpj = updates.cnpj;
  if (updates.contact !== undefined) payload.contact = updates.contact;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.address !== undefined) payload.address = updates.address;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.rating !== undefined) payload.rating = updates.rating;
  if (updates.active !== undefined) payload.active = updates.active;
  const { error } = await supabase.from('suppliers').update(payload).eq('id', id);
  if (error) { console.error('updateSupplier', error); return false; }
  return true;
}

export async function deleteSupplier(id: string): Promise<boolean> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) { console.error('deleteSupplier', error); return false; }
  return true;
}

// ─── Purchase Requests ────────────────────────────────────────────────────────

export async function loadPurchaseRequests(projectId: string): Promise<PurchaseRequest[]> {
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('*, materials(name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) { console.error('loadPurchaseRequests', error); return []; }
  return (data || []).map(mapRequest);
}

export async function savePurchaseRequest(
  r: Omit<PurchaseRequest, 'id' | 'createdAt' | 'materialName'>
): Promise<PurchaseRequest | null> {
  const { data, error } = await supabase
    .from('purchase_requests')
    .insert([{
      project_id: r.projectId,
      title: r.title,
      description: r.description || null,
      material_id: r.materialId || null,
      quantity: r.quantity,
      unit: r.unit,
      urgency: r.urgency,
      status: r.status,
      requested_by: r.requestedBy,
      approved_by: r.approvedBy || null,
      notes: r.notes || null,
    }])
    .select('*, materials(name)')
    .single();
  if (error) { console.error('savePurchaseRequest', error); return null; }
  return mapRequest(data);
}

export async function updateRequestStatus(
  id: string,
  status: PurchaseRequestStatus,
  approvedBy?: string
): Promise<boolean> {
  const payload: Record<string, unknown> = { status };
  if (approvedBy) payload.approved_by = approvedBy;
  const { error } = await supabase.from('purchase_requests').update(payload).eq('id', id);
  if (error) { console.error('updateRequestStatus', error); return false; }
  return true;
}

// ─── Quotations ───────────────────────────────────────────────────────────────

export async function loadQuotations(purchaseRequestId: string): Promise<Quotation[]> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, suppliers(name)')
    .eq('purchase_request_id', purchaseRequestId)
    .order('unit_price');
  if (error) { console.error('loadQuotations', error); return []; }
  return (data || []).map(mapQuotation);
}

export async function saveQuotation(
  q: Omit<Quotation, 'id' | 'createdAt' | 'supplierName'>
): Promise<Quotation | null> {
  const { data, error } = await supabase
    .from('quotations')
    .insert([{
      purchase_request_id: q.purchaseRequestId,
      supplier_id: q.supplierId,
      unit_price: q.unitPrice,
      total_price: q.totalPrice,
      delivery_days: q.deliveryDays || null,
      validity_date: q.validityDate || null,
      notes: q.notes || null,
      status: q.status,
    }])
    .select('*, suppliers(name)')
    .single();
  if (error) { console.error('saveQuotation', error); return null; }
  return mapQuotation(data);
}

export async function selectQuotation(
  quotationId: string,
  purchaseRequestId: string
): Promise<boolean> {
  await supabase
    .from('quotations')
    .update({ status: 'REJECTED' })
    .eq('purchase_request_id', purchaseRequestId)
    .neq('id', quotationId);
  const { error } = await supabase
    .from('quotations')
    .update({ status: 'SELECTED' })
    .eq('id', quotationId);
  if (error) { console.error('selectQuotation', error); return false; }
  return true;
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function loadPurchaseOrders(projectId: string): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name), purchase_requests(title, quantity, unit, material_id)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) { console.error('loadPurchaseOrders', error); return []; }
  return (data || []).map(mapOrder);
}

export async function createPurchaseOrder(
  o: Omit<PurchaseOrder, 'id' | 'createdAt' | 'supplierName' | 'requestTitle' | 'requestQuantity' | 'requestUnit' | 'requestMaterialId'>
): Promise<PurchaseOrder | null> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert([{
      project_id: o.projectId,
      purchase_request_id: o.purchaseRequestId,
      supplier_id: o.supplierId,
      quotation_id: o.quotationId || null,
      total_amount: o.totalAmount,
      status: o.status,
      approved_by: o.approvedBy || null,
      notes: o.notes || null,
    }])
    .select('*, suppliers(name), purchase_requests(title, quantity, unit, material_id)')
    .single();
  if (error) { console.error('createPurchaseOrder', error); return null; }
  return mapOrder(data);
}

export async function updateOrderStatus(
  orderId: string,
  status: PurchaseOrderStatus,
  extra?: { approvedBy?: string; sentAt?: string; receivedAt?: string }
): Promise<boolean> {
  const payload: Record<string, unknown> = { status };
  if (extra?.approvedBy) payload.approved_by = extra.approvedBy;
  if (extra?.sentAt) payload.sent_at = extra.sentAt;
  if (extra?.receivedAt) payload.received_at = extra.receivedAt;
  const { error } = await supabase.from('purchase_orders').update(payload).eq('id', orderId);
  if (error) { console.error('updateOrderStatus', error); return false; }
  return true;
}

export async function receiveOrder(order: PurchaseOrder, receivedBy: string): Promise<boolean> {
  const ok = await updateOrderStatus(order.id, 'RECEIVED', {
    receivedAt: new Date().toISOString(),
  });
  if (!ok) return false;

  await supabase
    .from('purchase_requests')
    .update({ status: 'RECEIVED' })
    .eq('id', order.purchaseRequestId);

  if (order.requestMaterialId) {
    const qty = order.requestQuantity ?? 0;
    const unitCost = qty > 0 ? order.totalAmount / qty : 0;
    const { error: entryErr } = await supabase
      .from('warehouse_entries')
      .insert([{
        project_id: order.projectId,
        material_id: order.requestMaterialId,
        quantity: qty,
        unit_cost: unitCost,
        supplier: order.supplierName || '',
        notes: `OC recebida — ${order.requestTitle || ''}`,
        created_by: receivedBy,
      }]);
    if (!entryErr) {
      const { data: mat } = await supabase
        .from('materials')
        .select('current_stock')
        .eq('id', order.requestMaterialId)
        .single();
      if (mat) {
        await supabase
          .from('materials')
          .update({ current_stock: Number(mat.current_stock) + qty })
          .eq('id', order.requestMaterialId);
      }
    }
  }
  return true;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapSupplier(r: Record<string, unknown>): Supplier {
  return {
    id: r.id as string,
    companyId: r.company_id as string,
    name: r.name as string,
    cnpj: (r.cnpj as string) || '',
    contact: (r.contact as string) || '',
    phone: (r.phone as string) || '',
    email: (r.email as string) || '',
    address: (r.address as string) || '',
    category: r.category as SupplierCategory,
    rating: Number(r.rating ?? 3),
    active: (r.active as boolean) ?? true,
    createdAt: r.created_at as string,
  };
}

function mapRequest(r: Record<string, unknown>): PurchaseRequest {
  const mats = r.materials as Record<string, unknown> | null;
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    title: r.title as string,
    description: (r.description as string) || '',
    materialId: (r.material_id as string) || '',
    materialName: (mats?.name as string) || '',
    quantity: Number(r.quantity),
    unit: r.unit as string,
    urgency: r.urgency as PurchaseUrgency,
    status: r.status as PurchaseRequestStatus,
    requestedBy: r.requested_by as string,
    approvedBy: (r.approved_by as string) || '',
    notes: (r.notes as string) || '',
    createdAt: r.created_at as string,
  };
}

function mapQuotation(r: Record<string, unknown>): Quotation {
  const sup = r.suppliers as Record<string, unknown> | null;
  return {
    id: r.id as string,
    purchaseRequestId: r.purchase_request_id as string,
    supplierId: r.supplier_id as string,
    supplierName: (sup?.name as string) || '',
    unitPrice: Number(r.unit_price ?? 0),
    totalPrice: Number(r.total_price ?? 0),
    deliveryDays: r.delivery_days ? Number(r.delivery_days) : undefined,
    validityDate: (r.validity_date as string) || '',
    notes: (r.notes as string) || '',
    status: r.status as QuotationStatus,
    createdAt: r.created_at as string,
  };
}

function mapOrder(r: Record<string, unknown>): PurchaseOrder {
  const sup = r.suppliers as Record<string, unknown> | null;
  const req = r.purchase_requests as Record<string, unknown> | null;
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    purchaseRequestId: r.purchase_request_id as string,
    supplierId: r.supplier_id as string,
    supplierName: (sup?.name as string) || '',
    quotationId: (r.quotation_id as string) || '',
    totalAmount: Number(r.total_amount ?? 0),
    status: r.status as PurchaseOrderStatus,
    approvedBy: (r.approved_by as string) || '',
    sentAt: (r.sent_at as string) || '',
    receivedAt: (r.received_at as string) || '',
    notes: (r.notes as string) || '',
    createdAt: r.created_at as string,
    requestTitle: (req?.title as string) || '',
    requestQuantity: req?.quantity ? Number(req.quantity) : 0,
    requestUnit: (req?.unit as string) || '',
    requestMaterialId: (req?.material_id as string) || '',
  };
}
