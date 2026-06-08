'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Plus, X, ShoppingCart, Truck, Users, Star,
  CheckCircle, Clock, Send, ChevronDown, ChevronRight, ReceiptText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import {
  Supplier, PurchaseRequest, Quotation, PurchaseOrder,
  SupplierCategory, PurchaseUrgency, PurchaseOrderStatus,
  loadSuppliers, saveSupplier,
  loadPurchaseRequests, savePurchaseRequest, updateRequestStatus,
  loadQuotations, saveQuotation, selectQuotation,
  loadPurchaseOrders, createPurchaseOrder, updateOrderStatus, receiveOrder,
} from '@/lib/compras';
import { loadMaterials, Material } from '@/lib/almoxarifado';

// ─── Constants ────────────────────────────────────────────────────────────────

const URGENCY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const URGENCY_LABELS: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
};

const REQUEST_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  ORDERED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  RECEIVED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', PENDING: 'Pendente', APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada', ORDERED: 'Em pedido', RECEIVED: 'Recebida',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PARTIAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  RECEIVED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', APPROVED: 'Aprovada', SENT: 'Enviada',
  PARTIAL: 'Parcial', RECEIVED: 'Recebida', CANCELLED: 'Cancelada',
};

const SUPPLIER_CATEGORIES: { value: SupplierCategory; label: string }[] = [
  { value: 'STRUCTURAL', label: 'Estrutural' },
  { value: 'FINISHING', label: 'Acabamento' },
  { value: 'ELECTRICAL', label: 'Elétrica' },
  { value: 'HYDRAULIC', label: 'Hidráulica' },
  { value: 'TOOLS', label: 'Ferramentas' },
  { value: 'SAFETY', label: 'EPI / Segurança' },
  { value: 'SERVICES', label: 'Serviços' },
  { value: 'OTHER', label: 'Outros' },
];

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type SubTab = 'requests' | 'orders' | 'suppliers';

const SUB_TABS: { key: SubTab; Icon: React.FC<{ size?: number; className?: string }>; label: string }[] = [
  { key: 'requests', Icon: ShoppingCart, label: 'Solicitações' },
  { key: 'orders', Icon: Truck, label: 'Ordens de Compra' },
  { key: 'suppliers', Icon: Users, label: 'Fornecedores' },
];

// ─── Small helpers ────────────────────────────────────────────────────────────

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', className)}>
      {children}
    </span>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} className={i <= value ? 'fill-amber-400 text-amber-400' : 'text-white/10'} />
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ComprasTab() {
  const { project, currentCompany, currentUser } = useAppContext();

  // Data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quotations, setQuotations] = useState<Record<string, Quotation[]>>({});

  // UI
  const [subTab, setSubTab] = useState<SubTab>('requests');
  const [loading, setLoading] = useState(false);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);
  const [loadingQ, setLoadingQ] = useState<string | null>(null);

  // Modals
  const [showReqModal, setShowReqModal] = useState(false);
  const [quotationTarget, setQuotationTarget] = useState<PurchaseRequest | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Request form
  const [rTitle, setRTitle] = useState('');
  const [rDesc, setRDesc] = useState('');
  const [rMaterialId, setRMaterialId] = useState('');
  const [rQty, setRQty] = useState('');
  const [rUnit, setRUnit] = useState('un');
  const [rUrgency, setRUrgency] = useState<PurchaseUrgency>('MEDIUM');

  // Quotation form
  const [qSupplierId, setQSupplierId] = useState('');
  const [qUnitPrice, setQUnitPrice] = useState('');
  const [qDelivery, setQDelivery] = useState('');
  const [qNotes, setQNotes] = useState('');

  // Supplier form
  const [sName, setSName] = useState('');
  const [sCnpj, setSCnpj] = useState('');
  const [sContact, setSContact] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sCategory, setSCategory] = useState<SupplierCategory>('OTHER');
  const [sRating, setSRating] = useState(3);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!project?.id || !currentCompany?.id) return;
    setLoading(true);
    const [s, r, o, m] = await Promise.all([
      loadSuppliers(currentCompany.id),
      loadPurchaseRequests(project.id),
      loadPurchaseOrders(project.id),
      loadMaterials(project.id),
    ]);
    setSuppliers(s);
    setRequests(r);
    setOrders(o);
    setMaterials(m);
    setLoading(false);
  }, [project?.id, currentCompany?.id]);

  useEffect(() => { load(); }, [load]);

  // ── Expand SC → lazy-load quotations ─────────────────────────────────────

  const toggleExpand = useCallback(async (reqId: string) => {
    if (expandedReq === reqId) { setExpandedReq(null); return; }
    setExpandedReq(reqId);
    if (!quotations[reqId]) {
      setLoadingQ(reqId);
      const q = await loadQuotations(reqId);
      setQuotations(prev => ({ ...prev, [reqId]: q }));
      setLoadingQ(null);
    }
  }, [expandedReq, quotations]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleApprove = async (req: PurchaseRequest) => {
    await updateRequestStatus(req.id, 'APPROVED', currentUser?.name || '');
    setRequests(prev => prev.map(r =>
      r.id === req.id ? { ...r, status: 'APPROVED' as const, approvedBy: currentUser?.name || '' } : r
    ));
  };

  const handleReject = async (req: PurchaseRequest) => {
    await updateRequestStatus(req.id, 'REJECTED');
    setRequests(prev => prev.map(r =>
      r.id === req.id ? { ...r, status: 'REJECTED' as const } : r
    ));
  };

  const handleSelectQuotation = async (q: Quotation, req: PurchaseRequest) => {
    if (!project?.id) return;
    await selectQuotation(q.id, req.id);
    const oc = await createPurchaseOrder({
      projectId: project.id,
      purchaseRequestId: req.id,
      supplierId: q.supplierId,
      quotationId: q.id,
      totalAmount: q.totalPrice,
      status: 'APPROVED',
      notes: '',
    });
    await updateRequestStatus(req.id, 'ORDERED', currentUser?.name || '');
    if (oc) setOrders(prev => [oc, ...prev]);
    const [newQ, newR] = await Promise.all([
      loadQuotations(req.id),
      loadPurchaseRequests(project.id),
    ]);
    setQuotations(prev => ({ ...prev, [req.id]: newQ }));
    setRequests(newR);
  };

  const handleMarkSent = async (order: PurchaseOrder) => {
    await updateOrderStatus(order.id, 'SENT', { sentAt: new Date().toISOString() });
    setOrders(prev => prev.map(o =>
      o.id === order.id ? { ...o, status: 'SENT' as PurchaseOrderStatus } : o
    ));
  };

  const handleReceive = async (order: PurchaseOrder) => {
    await receiveOrder(order, currentUser?.name || '');
    await load();
  };

  // ── Save handlers ─────────────────────────────────────────────────────────

  const handleSaveRequest = async () => {
    if (!project?.id || !rTitle.trim() || !rQty) return;
    const mat = materials.find(m => m.id === rMaterialId);
    const req = await savePurchaseRequest({
      projectId: project.id,
      title: rTitle.trim(),
      description: rDesc,
      materialId: rMaterialId || undefined,
      quantity: Number(rQty),
      unit: mat?.unit || rUnit,
      urgency: rUrgency,
      status: 'PENDING',
      requestedBy: currentUser?.name || '',
    });
    if (req) {
      setRequests(prev => [req, ...prev]);
      setShowReqModal(false);
      setRTitle(''); setRDesc(''); setRMaterialId(''); setRQty(''); setRUnit('un'); setRUrgency('MEDIUM');
    }
  };

  const handleSaveQuotation = async () => {
    if (!quotationTarget || !qSupplierId || !qUnitPrice) return;
    const unitPrice = Number(qUnitPrice);
    const q = await saveQuotation({
      purchaseRequestId: quotationTarget.id,
      supplierId: qSupplierId,
      unitPrice,
      totalPrice: unitPrice * quotationTarget.quantity,
      deliveryDays: qDelivery ? Number(qDelivery) : undefined,
      notes: qNotes,
      status: 'PENDING',
    });
    if (q) {
      setQuotations(prev => ({
        ...prev,
        [quotationTarget.id]: [...(prev[quotationTarget.id] || []), q],
      }));
      setQuotationTarget(null);
      setQSupplierId(''); setQUnitPrice(''); setQDelivery(''); setQNotes('');
    }
  };

  const handleSaveSupplier = async () => {
    if (!currentCompany?.id || !sName.trim()) return;
    const s = await saveSupplier({
      companyId: currentCompany.id,
      name: sName.trim(),
      cnpj: sCnpj,
      contact: sContact,
      phone: sPhone,
      email: sEmail,
      category: sCategory,
      rating: sRating,
      active: true,
    });
    if (s) {
      setSuppliers(prev => [...prev, s]);
      setShowSupplierModal(false);
      setSName(''); setSCnpj(''); setSContact(''); setSPhone(''); setSEmail('');
      setSCategory('OTHER'); setSRating(3);
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const pendingReqs = requests.filter(r => r.status === 'PENDING').length;
  const approvedReqs = requests.filter(r => r.status === 'APPROVED').length;
  const activeOrders = orders.filter(o => o.status !== 'RECEIVED' && o.status !== 'CANCELLED').length;
  const totalOrderValue = orders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-white/40 text-sm">
        Selecione um projeto para ver as compras.
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Compras & Fornecedores</h2>
          <p className="text-sm text-white/40 mt-0.5">{project.name}</p>
        </div>
        <button
          onClick={() => {
            if (subTab === 'requests') setShowReqModal(true);
            else if (subTab === 'suppliers') setShowSupplierModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} />
          {subTab === 'requests' && 'Nova SC'}
          {subTab === 'orders' && 'Nova OC'}
          {subTab === 'suppliers' && 'Novo Fornecedor'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'SCs Pendentes', value: pendingReqs, Icon: Clock, color: 'text-amber-400' },
          { label: 'SCs Aprovadas', value: approvedReqs, Icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'OCs Ativas', value: activeOrders, Icon: Truck, color: 'text-blue-400' },
          { label: 'Total em OCs', value: BRL(totalOrderValue), Icon: ReceiptText, color: 'text-purple-400' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white/3 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={color} />
              <span className="text-xs text-white/40">{label}</span>
            </div>
            <p className="text-xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/5 rounded-xl p-1 w-fit">
        {SUB_TABS.map(({ key, Icon, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              subTab === key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Solicitações ────────────────────────────────────────────────────── */}
      {subTab === 'requests' && (
        <div className="space-y-3">
          {loading && <p className="text-white/40 text-sm">Carregando...</p>}
          {!loading && requests.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-white/30">
              <ShoppingCart size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Nenhuma solicitação de compra</p>
            </div>
          )}
          {requests.map(req => {
            const expanded = expandedReq === req.id;
            const reqQ = quotations[req.id] || [];

            return (
              <div key={req.id} className="bg-white/3 border border-white/5 rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-white truncate">{req.title}</span>
                        <Badge className={URGENCY_COLORS[req.urgency]}>{URGENCY_LABELS[req.urgency]}</Badge>
                        <Badge className={REQUEST_STATUS_COLORS[req.status]}>{REQUEST_STATUS_LABELS[req.status]}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40 flex-wrap">
                        <span>{req.quantity} {req.unit}</span>
                        {req.materialName && <span>· {req.materialName}</span>}
                        <span>· Por {req.requestedBy}</span>
                      </div>
                      {req.description && (
                        <p className="text-xs text-white/30 mt-1 line-clamp-1">{req.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(req)}
                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleReject(req)}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Rejeitar
                          </button>
                        </>
                      )}
                      {(req.status === 'APPROVED' || req.status === 'ORDERED') && (
                        <button
                          onClick={() => {
                            setQuotationTarget(req);
                            if (!expanded) toggleExpand(req.id);
                          }}
                          className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-lg transition-colors"
                        >
                          + Cotação
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpand(req.id)}
                        className="p-1.5 text-white/40 hover:text-white/60 transition-colors"
                      >
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quotations */}
                {expanded && (
                  <div className="border-t border-white/5 bg-black/10 p-4 space-y-2">
                    {loadingQ === req.id ? (
                      <p className="text-xs text-white/30">Carregando cotações...</p>
                    ) : reqQ.length === 0 ? (
                      <p className="text-xs text-white/30">Nenhuma cotação ainda.</p>
                    ) : (
                      reqQ.map(q => (
                        <div
                          key={q.id}
                          className={cn(
                            'flex items-center justify-between gap-3 p-3 rounded-lg border',
                            q.status === 'SELECTED'
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : q.status === 'REJECTED'
                              ? 'border-white/5 bg-white/2 opacity-40'
                              : 'border-white/5 bg-white/3'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-white">{q.supplierName}</span>
                              {q.status === 'SELECTED' && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Selecionada</Badge>
                              )}
                            </div>
                            <p className="text-xs text-white/40 mt-0.5">
                              {BRL(q.unitPrice)}/un · Total: {BRL(q.totalPrice)}
                              {q.deliveryDays ? ` · ${q.deliveryDays} dias` : ''}
                            </p>
                          </div>
                          {q.status === 'PENDING' && req.status !== 'ORDERED' && (
                            <button
                              onClick={() => handleSelectQuotation(q, req)}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                            >
                              Selecionar → OC
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Ordens de Compra ─────────────────────────────────────────────────── */}
      {subTab === 'orders' && (
        <div className="space-y-3">
          {loading && <p className="text-white/40 text-sm">Carregando...</p>}
          {!loading && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-white/30">
              <Truck size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Nenhuma ordem de compra</p>
            </div>
          )}
          {orders.map(order => (
            <div key={order.id} className="bg-white/3 border border-white/5 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-white">{order.requestTitle || '—'}</span>
                    <Badge className={ORDER_STATUS_COLORS[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 flex-wrap">
                    <span>{order.supplierName}</span>
                    <span>· {BRL(order.totalAmount)}</span>
                    {order.requestQuantity != null && order.requestUnit && (
                      <span>· {order.requestQuantity} {order.requestUnit}</span>
                    )}
                  </div>
                  {order.approvedBy && (
                    <p className="text-xs text-white/30 mt-0.5">Aprovada por {order.approvedBy}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {order.status === 'APPROVED' && (
                    <button
                      onClick={() => handleMarkSent(order)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Send size={12} />
                      Enviada
                    </button>
                  )}
                  {(order.status === 'SENT' || order.status === 'PARTIAL') && (
                    <button
                      onClick={() => handleReceive(order)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <CheckCircle size={12} />
                      Receber
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Fornecedores ──────────────────────────────────────────────────────── */}
      {subTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading && <p className="text-white/40 text-sm col-span-full">Carregando...</p>}
          {!loading && suppliers.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-40 text-white/30">
              <Users size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Nenhum fornecedor cadastrado</p>
            </div>
          )}
          {suppliers.map(s => (
            <div key={s.id} className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{s.name}</p>
                  <p className="text-xs text-white/40">
                    {SUPPLIER_CATEGORIES.find(c => c.value === s.category)?.label}
                  </p>
                </div>
                <StarRating value={s.rating} />
              </div>
              {(s.contact || s.phone || s.email) && (
                <div className="space-y-0.5 text-xs text-white/40">
                  {s.contact && <p>{s.contact}</p>}
                  {s.phone && <p>{s.phone}</p>}
                  {s.email && <p>{s.email}</p>}
                </div>
              )}
              {s.cnpj && <p className="text-xs text-white/30">CNPJ: {s.cnpj}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Nova SC ──────────────────────────────────────────────────────── */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Nova Solicitação de Compra</h3>
              <button onClick={() => setShowReqModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Título *</label>
                <input
                  value={rTitle}
                  onChange={e => setRTitle(e.target.value)}
                  placeholder="Ex: Cimento CP-II 50 sacos"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Material vinculado (opcional)</label>
                <select
                  value={rMaterialId}
                  onChange={e => {
                    const mat = materials.find(m => m.id === e.target.value);
                    setRMaterialId(e.target.value);
                    if (mat) setRUnit(mat.unit);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">— sem vínculo —</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Quantidade *</label>
                  <input
                    type="number"
                    min="0"
                    value={rQty}
                    onChange={e => setRQty(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Unidade</label>
                  <input
                    value={rUnit}
                    onChange={e => setRUnit(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Urgência</label>
                <select
                  value={rUrgency}
                  onChange={e => setRUrgency(e.target.value as PurchaseUrgency)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Descrição</label>
                <textarea
                  value={rDesc}
                  onChange={e => setRDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowReqModal(false)} className="flex-1 py-2 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSaveRequest}
                disabled={!rTitle.trim() || !rQty}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Criar SC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nova Cotação ─────────────────────────────────────────────────── */}
      {quotationTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">Nova Cotação</h3>
                <p className="text-xs text-white/40 mt-0.5">
                  {quotationTarget.title} · {quotationTarget.quantity} {quotationTarget.unit}
                </p>
              </div>
              <button onClick={() => setQuotationTarget(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Fornecedor *</label>
                <select
                  value={qSupplierId}
                  onChange={e => setQSupplierId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">— selecione —</option>
                  {suppliers.filter(s => s.active).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Preço unitário (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={qUnitPrice}
                    onChange={e => setQUnitPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Total estimado</label>
                  <div className="bg-white/3 border border-white/5 rounded-lg px-3 py-2 text-sm text-white/60">
                    {qUnitPrice ? BRL(Number(qUnitPrice) * quotationTarget.quantity) : '—'}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Prazo de entrega (dias)</label>
                <input
                  type="number"
                  min="0"
                  value={qDelivery}
                  onChange={e => setQDelivery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Observações</label>
                <textarea
                  value={qNotes}
                  onChange={e => setQNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setQuotationTarget(null)} className="flex-1 py-2 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSaveQuotation}
                disabled={!qSupplierId || !qUnitPrice}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Salvar Cotação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Novo Fornecedor ──────────────────────────────────────────────── */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Novo Fornecedor</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Nome *</label>
                <input
                  value={sName}
                  onChange={e => setSName(e.target.value)}
                  placeholder="Razão social ou nome fantasia"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">CNPJ</label>
                  <input
                    value={sCnpj}
                    onChange={e => setSCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Categoria</label>
                  <select
                    value={sCategory}
                    onChange={e => setSCategory(e.target.value as SupplierCategory)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  >
                    {SUPPLIER_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Contato</label>
                  <input
                    value={sContact}
                    onChange={e => setSContact(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Telefone</label>
                  <input
                    value={sPhone}
                    onChange={e => setSPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">E-mail</label>
                <input
                  type="email"
                  value={sEmail}
                  onChange={e => setSEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Avaliação</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} type="button" onClick={() => setSRating(i)} className="p-1">
                      <Star size={20} className={i <= sRating ? 'fill-amber-400 text-amber-400' : 'text-white/20'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowSupplierModal(false)} className="flex-1 py-2 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSaveSupplier}
                disabled={!sName.trim()}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Salvar Fornecedor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
