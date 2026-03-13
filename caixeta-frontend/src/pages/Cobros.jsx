import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  MdCheckCircle,
  MdSearch,
  MdOutlineReceipt,
  MdArrowBack,
  MdSmartToy,
  MdClose,
  MdOutlineAccountBalance,
  MdEditNote,
  MdOutlineCategory,
  MdOutlineCheckBox,
  MdOutlineCheckBoxOutlineBlank,
  MdWarningAmber,
  MdLock,
  MdErrorOutline,
} from 'react-icons/md';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (amount) => {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};
const fmtDate = (d) => {
  if (!d) return '';
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));
};

const MANUAL_CATEGORIES = [
  'Otros Ingresos',
  'Devolución de Impuestos',
  'Subvenciones',
  'Préstamo Bancario',
  'Aportación de Socios',
];

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 flex-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── Toast de estado (Success/Error) ──────────────────────────────────────────
function StatusToast({ config, onDone }) {
  const { message, type = 'success' } = config;
  
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  const isError = type === 'error';

  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${
      isError ? 'bg-red-600 shadow-red-600/30' : 'bg-emerald-600 shadow-emerald-600/30'
    }`}>
      {isError ? (
        <MdErrorOutline className="text-2xl flex-none" />
      ) : (
        <MdCheckCircle className="text-2xl flex-none" />
      )}
      <p className="font-semibold text-sm">{message}</p>
    </div>
  );
}

// ─── Modal genérico ───────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Modal de confirmación conciliación ───────────────────────────────────────
function ConciliateModal({ receipt, assignments, invoices, isLoading, onConfirm, onCancel }) {
  const lines = Object.entries(assignments)
    .map(([id, amt]) => {
      const inv = invoices.find((i) => i.id === id || String(i.id) === String(id));
      return { label: inv?.factusol_number || inv?.id || id, client: inv?.client || '—', amount: parseFloat(amt) || 0 };
    })
    .filter((l) => l.amount > 0);

  const total = lines.reduce((a, l) => a + l.amount, 0);

  return (
    <Modal onClose={onCancel}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-none w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <MdOutlineAccountBalance className="text-emerald-600 dark:text-emerald-400 text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-800 dark:text-neutral-100 text-base leading-tight">
              ¿Confirmar conciliación?
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Asignarás el cobro de{' '}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(receipt?.amount)}</span>{' '}
              de "{receipt?.concept}" a las siguientes facturas:
            </p>
          </div>
        </div>

        {/* Desglose */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden mb-5">
          <div className="bg-neutral-50 dark:bg-neutral-800/60 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-700">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Desglose de la operación</p>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">{l.label}</p>
                  <p className="text-xs text-neutral-400">{l.client}</p>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{fmt(l.amount)}</span>
              </div>
            ))}
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800/60 px-4 py-2.5 flex justify-between items-center border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total asignado</p>
            <p className="font-bold text-neutral-800 dark:text-neutral-100">{fmt(total)}</p>
          </div>
        </div>

        {/* Confirmación de saldo exacto */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800/50 mb-4">
          <MdCheckCircle className="text-emerald-500 text-lg flex-none" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            El saldo está cubierto al 100%. La operación es contablemente exacta.
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm border-2 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <><Spinner /> Procesando...</> : <><MdCheckCircle className="text-lg" /> Sí, confirmar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal de confirmación ingreso manual ─────────────────────────────────────
function ManualModal({ receipt, category, notes, isLoading, onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel}>
      <div className="p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-none w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <MdEditNote className="text-amber-600 dark:text-amber-400 text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-800 dark:text-neutral-100 text-base leading-tight">
              ¿Guardar clasificación manual?
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Este ingreso de <span className="font-bold text-neutral-700 dark:text-neutral-200">{fmt(receipt?.amount)}</span> quedará registrado sin factura.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden mb-5">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <div className="flex justify-between items-center px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Movimiento</p>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 text-right max-w-[200px] truncate">{receipt?.concept}</p>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Categoría</p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{category}</p>
            </div>
            {notes && (
              <div className="px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Notas</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm border-2 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-lg shadow-amber-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <><Spinner /> Guardando...</> : <><MdEditNote className="text-lg" /> Sí, guardar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══
//   COMPONENTE PRINCIPAL
// ─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══
export default function Cobros() {
  const [receipts, setReceipts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReceiptId, setActiveReceiptId] = useState(null);

  // 'invoices' | 'manual'
  const [detailView, setDetailView] = useState('invoices');

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  // { invoiceId (string) -> amount (string) }
  const [assignments, setAssignments] = useState({});

  // Clasificación manual
  const [manualCategory, setManualCategory] = useState(MANUAL_CATEGORIES[0]);
  const [manualNotes, setManualNotes] = useState('');

  // Modales
  const [showConciliateModal, setShowConciliateModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Acción
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // ─── Fetch de datos ────────────────────────────────────────────────────────
  const refreshData = useCallback(async () => {
    try {
      const [rRes, iRes] = await Promise.all([
        fetch(`${apiUrl}/api/transactions/pending`),
        fetch(`${apiUrl}/api/invoices/pending`),
      ]);
      if (rRes.ok) setReceipts(await rRes.json());
      if (iRes.ok) setInvoices(await iRes.json());
    } catch (err) {
      console.error('Error fetch:', err);
    }
  }, [apiUrl]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await refreshData();
      setIsLoading(false);
    })();
  }, [refreshData]);

  // ─── Derivados ─────────────────────────────────────────────────────────────
  const activeReceipt = receipts.find((r) => r.id === activeReceiptId) ?? null;

  const suggestedInvoice = useMemo(() => {
    if (activeReceipt?.status !== 'suggested') return null;
    const base = invoices.find((i) => String(i.id) === String(activeReceipt.invoice_id));
    return {
      id: String(activeReceipt.invoice_id),
      client_name: activeReceipt.client_name,
      client: activeReceipt.client_name,
      pending_amount: activeReceipt.pending_amount ?? base?.pending_amount,
      factusol_number: activeReceipt.factusol_number ?? base?.factusol_number,
      date: base?.date,
    };
  }, [activeReceipt, invoices]);

  const filteredInvoices = useMemo(() => {
    const lower = searchTerm.toLowerCase().trim();
    if (!lower) return invoices;
    return invoices.filter(
      (inv) =>
        inv.client?.toLowerCase().includes(lower) ||
        inv.factusol_number?.toLowerCase().includes(lower) ||
        String(inv.id).includes(lower)
    );
  }, [searchTerm, invoices]);

  const sortedReceipts = useMemo(
    () =>
      [...receipts].sort((a, b) => {
        if (a.status === 'suggested' && b.status !== 'suggested') return -1;
        if (a.status !== 'suggested' && b.status === 'suggested') return 1;
        return new Date(b.value_date || 0) - new Date(a.value_date || 0);
      }),
    [receipts]
  );

  // ── Valores financieros clave ──────────────────────────────────────────────
  const totalAssigned = useMemo(
    () => Object.values(assignments).reduce((acc, v) => acc + (parseFloat(v) || 0), 0),
    [assignments]
  );

  const balanceRestante = (activeReceipt?.amount ?? 0) - totalAssigned;
  const isBalanceClosed = Math.abs(balanceRestante) < 0.005; // ≈ 0
  const hasZeroAssignment = Object.values(assignments).some((v) => !(parseFloat(v) > 0));
  // ⚠ Regla estricta: el total asignado DEBE igualar exactamente el importe del cobro
  const canConciliate =
    Object.keys(assignments).length > 0 &&
    isBalanceClosed &&
    !hasZeroAssignment;

  // ─── Reset completo ────────────────────────────────────────────────────────
  const resetDetail = useCallback(() => {
    setActiveReceiptId(null);
    setAssignments({});
    setSearchTerm('');
    setDetailView('invoices');
    setManualCategory(MANUAL_CATEGORIES[0]);
    setManualNotes('');
  }, []);

  // ─── Seleccionar movimiento ────────────────────────────────────────────────
  const handleSelectReceipt = useCallback(
    (e, receipt) => {
      if (e) e.stopPropagation();
      if (!receipt) { resetDetail(); return; }

      setActiveReceiptId(receipt.id);
      setSearchTerm('');
      setDetailView('invoices');
      setManualCategory(MANUAL_CATEGORIES[0]);
      setManualNotes('');

      // Pre-asignar sugerencia IA
      if (receipt.invoice_id) {
        const sugAmt = Math.min(receipt.pending_amount ?? receipt.amount, receipt.amount);
        setAssignments({ [String(receipt.invoice_id)]: String(sugAmt > 0 ? sugAmt.toFixed(2) : '') });
      } else {
        setAssignments({});
      }
    },
    [resetDetail]
  );

  // ─── Toggle checkbox con reglas ────────────────────────────────────────────
  const handleToggleInvoice = (invoice) => {
    if ((invoice.pending_amount ?? 0) <= 0) return; // Ya cobrada
    const id = String(invoice.id);
    setAssignments((prev) => {
      if (prev[id] !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      // Calcular resto disponible en la nueva situación
      const alreadyAssigned = Object.values(prev).reduce((a, v) => a + (parseFloat(v) || 0), 0);
      const leftToCover = (activeReceipt?.amount ?? 0) - alreadyAssigned;
      if (leftToCover <= 0) return prev; // balance cerrado, no añadir
      const suggested = Math.min(leftToCover, invoice.pending_amount ?? 0);
      return { ...prev, [id]: String(suggested > 0 ? suggested.toFixed(2) : '') };
    });
  };

  // ─── Cambio de amount con validación ──────────────────────────────────────
  const handleAssignAmountChange = (invoice, rawValue) => {
    const id = String(invoice.id);
    const pending = invoice.pending_amount ?? 0;
    
    // Calcular el máximo permitido: min(pending_amount, balanceRestante + lo que ya tiene este id)
    const currentForThisId = parseFloat(assignments[id]) || 0;
    const otherAssigned = totalAssigned - currentForThisId;
    const maxAllowed = Math.min(
      pending,
      (activeReceipt?.amount ?? 0) - otherAssigned
    );

    let parsed = parseFloat(rawValue);
    if (isNaN(parsed)) { 
      setAssignments((p) => ({ ...p, [id]: rawValue })); 
      return; 
    }
    
    if (parsed < 0) parsed = 0;
    if (parsed > maxAllowed) {
      // Bloquear en el máximo permitido (ya sea por factura o por cobro total)
      parsed = parseFloat(maxAllowed.toFixed(2));
    }

    setAssignments((p) => ({ ...p, [id]: String(parsed) }));
  };

  // ─── API: Conciliar ────────────────────────────────────────────────────────
  const executeConciliate = async () => {
    if (!canConciliate || isActionLoading) return;
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const assignmentsArray = Object.entries(assignments)
      .map(([invoiceId, amount]) => ({ invoiceId, amount: parseFloat(amount) }))
      .filter((a) => a.amount > 0);

    setIsActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/reconcile-multi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: activeReceipt.id,
          assignments: assignmentsArray,
          userId: userData.id,
          totalAmount: activeReceipt.amount,
          concept: activeReceipt.concept,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Error ${res.status}`); }
      setReceipts((prev) => prev.filter((r) => r.id !== activeReceipt.id));
      setShowConciliateModal(false);
      resetDetail();
      setToast({ 
        message: `✓ Cobro de ${fmt(activeReceipt.amount)} conciliado con ${assignmentsArray.length} factura(s).`, 
        type: 'success' 
      });
      // Refrescar datos para limpiar facturas a 0
      refreshData();
    } catch (err) {
      console.error(err);
      setShowConciliateModal(false);
      setToast({ 
        message: `⚠️ ${err.message}`, 
        type: 'error' 
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // ─── API: Clasificar manual ────────────────────────────────────────────────
  const executeManual = async () => {
    if (isActionLoading) return;
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setIsActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/classify-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: activeReceipt.id,
          category: manualCategory,
          notes: manualNotes,
          concept: activeReceipt.concept,
          userId: userData.id, // Añadido userId para el backend
        }),
      });
      
      if (!res.ok) { 
        const e = await res.json().catch(() => ({})); 
        throw new Error(e.error || e.message || `Error ${res.status}`); 
      }

      setReceipts((prev) => prev.filter((r) => r.id !== activeReceipt.id));
      setShowManualModal(false);
      resetDetail();
      setToast({ 
        message: `✓ Ingreso clasificado como "${manualCategory}".`, 
        type: 'success' 
      });
      // Refrescar transacciones y facturas
      refreshData();
    } catch (err) {
      console.error(err);
      setShowManualModal(false);
      setToast({ 
        message: `${err.message}`, 
        type: 'error' 
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="w-12 h-12 border-4 border-neutral-200 dark:border-neutral-800 border-t-caixeta-red rounded-full animate-spin mb-4" />
        <p className="text-neutral-600 dark:text-neutral-300 font-medium">Cargando datos bancarios...</p>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Modales */}
      {showConciliateModal && (
        <ConciliateModal
          receipt={activeReceipt}
          assignments={assignments}
          invoices={invoices}
          isLoading={isActionLoading}
          onConfirm={executeConciliate}
          onCancel={() => !isActionLoading && setShowConciliateModal(false)}
        />
      )}
      {showManualModal && (
        <ManualModal
          receipt={activeReceipt}
          category={manualCategory}
          notes={manualNotes}
          isLoading={isActionLoading}
          onConfirm={executeManual}
          onCancel={() => !isActionLoading && setShowManualModal(false)}
        />
      )}
      {toast && <StatusToast config={toast} onDone={() => setToast(null)} />}

      {/* Layout principal */}
      <div
        className="flex flex-col lg:flex-row h-full w-full min-h-0 overflow-hidden bg-neutral-50 dark:bg-caixeta-dark rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 animate-in fade-in duration-500"
        onClick={() => handleSelectReceipt(null, null)}
      >

        {/* ══════════════════════════════════════════
            COLUMNA IZQUIERDA — Movimientos
        ══════════════════════════════════════════ */}
        <div
          className={`w-full lg:w-[340px] xl:w-[380px] flex-1 lg:flex-none border-r border-neutral-200 dark:border-neutral-800 flex flex-col min-h-0 ${activeReceiptId ? 'hidden lg:flex' : 'flex'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-none p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-caixeta-card">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
              <MdOutlineAccountBalance className="text-caixeta-red text-xl" />
              Movimientos Bancarios
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {receipts.length} pendiente{receipts.length !== 1 ? 's' : ''} de conciliar
            </p>
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-neutral-50 dark:bg-caixeta-dark scrollbar-thin"
            onClick={() => handleSelectReceipt(null, null)}
          >
            {sortedReceipts.length === 0 && (
              <div className="text-center py-14">
                <MdCheckCircle className="mx-auto text-4xl mb-2 text-emerald-500" />
                <p className="font-medium text-neutral-600 dark:text-neutral-400">Todo conciliado</p>
              </div>
            )}
            {sortedReceipts.map((receipt) => {
              const isSelected = activeReceiptId === receipt.id;
              const isSuggested = receipt.status === 'suggested';
              return (
                <div
                  key={receipt.id}
                  onClick={(e) => handleSelectReceipt(e, receipt)}
                  className={`
                    relative cursor-pointer rounded-xl p-3.5 border transition-all duration-150 overflow-hidden select-none
                    ${isSelected
                      ? 'ring-2 ring-emerald-500 bg-white dark:bg-neutral-800 border-emerald-300 dark:border-emerald-700 shadow-md'
                      : 'bg-white dark:bg-caixeta-card border-neutral-200 dark:border-neutral-800 hover:shadow-sm hover:border-neutral-300'}
                    ${isSuggested && !isSelected ? 'border-l-[3px] border-l-emerald-500' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-neutral-400">{fmtDate(receipt.value_date)}</span>
                    {isSuggested && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        <MdSmartToy /> {receipt.match_confidence}%
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100 line-clamp-1" title={receipt.concept}>
                    {receipt.concept}
                  </p>
                  <p className={`text-base font-bold mt-1 text-right ${receipt.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-700 dark:text-white'}`}>
                    {receipt.amount > 0 && '+'}{fmt(receipt.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            COLUMNA DERECHA — Detalle
        ══════════════════════════════════════════ */}
        <div
          className={`flex-1 min-h-0 flex flex-col bg-white dark:bg-caixeta-card ${!activeReceiptId ? 'hidden lg:flex' : 'flex'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Empty state */}
          {!activeReceipt && (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
              <div className="w-20 h-20 mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <MdOutlineReceipt className="text-4xl text-neutral-300 dark:text-neutral-600" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-600 dark:text-neutral-300 mb-1">Ningún movimiento seleccionado</h3>
              <p className="max-w-xs text-sm">Selecciona un movimiento de la lista para iniciar la conciliación.</p>
            </div>
          )}

          {/* Detalle activo */}
          {activeReceipt && (
            <div className="flex-1 flex flex-col min-h-0">

              {/* Volver — solo móvil */}
              <div className="lg:hidden flex-none px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <button onClick={(e) => { e.stopPropagation(); handleSelectReceipt(null, null); }} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-caixeta-red transition-colors">
                  <MdArrowBack /> Volver
                </button>
              </div>

              {/* Banner del movimiento */}
              <div className="flex-none px-4 pt-4 pb-3 md:px-6">
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 px-4 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">Movimiento bancario</p>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100 truncate text-sm" title={activeReceipt.concept}>
                      {activeReceipt.concept}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">{fmtDate(activeReceipt.value_date)}</p>
                  </div>
                  <div className="flex-none text-right">
                    <p className={`text-2xl font-bold ${activeReceipt.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-800 dark:text-white'}`}>
                      {activeReceipt.amount > 0 && '+'}{fmt(activeReceipt.amount)}
                    </p>
                    {/* Indicador de balance */}
                    {totalAssigned > 0 && (
                      <p className={`text-xs mt-0.5 font-semibold ${isBalanceClosed ? 'text-emerald-500' : balanceRestante < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                        {isBalanceClosed ? '✓ Saldo cubierto' : balanceRestante < 0 ? `Excedido ${fmt(Math.abs(balanceRestante))}` : `Resta ${fmt(balanceRestante)}`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Barra de progreso */}
                {activeReceipt.amount > 0 && totalAssigned > 0 && (
                  <div className="mt-2 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${totalAssigned > activeReceipt.amount ? 'bg-red-500' : isBalanceClosed ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min((totalAssigned / activeReceipt.amount) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* ══════════════════ VISTA: FACTURAS ══════════════════ */}
              {detailView === 'invoices' && (
                <>
                  {/* Sugerencia IA */}
                  {suggestedInvoice && (() => {
                    const id = suggestedInvoice.id;
                    const isChecked = assignments[id] !== undefined;
                    const isDisabled = !isChecked && isBalanceClosed;
                    return (
                      <div className="flex-none px-4 pb-2 md:px-6">
                        <div
                          onClick={() => !isDisabled && handleToggleInvoice(suggestedInvoice)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/30'
                            : isChecked ? 'cursor-pointer border-emerald-500 bg-emerald-50 dark:bg-emerald-900/15'
                              : 'cursor-pointer border-neutral-200 dark:border-neutral-700 hover:border-emerald-400/70'
                            }`}
                        >
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-none">
                            <MdSmartToy /> IA Sugiere
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100 truncate">{suggestedInvoice.client_name}</p>
                            <p className="text-xs text-neutral-400">{suggestedInvoice.factusol_number}</p>
                          </div>
                          <p className="font-bold text-sm text-neutral-700 dark:text-neutral-200 flex-none">{fmt(suggestedInvoice.pending_amount)}</p>
                          {isDisabled
                            ? <MdLock className="text-neutral-400 text-lg flex-none" />
                            : isChecked
                              ? <MdOutlineCheckBox className="text-emerald-500 text-xl flex-none" />
                              : <MdOutlineCheckBoxOutlineBlank className="text-neutral-400 text-xl flex-none" />
                          }
                        </div>
                      </div>
                    );
                  })()}

                  {/* Buscador */}
                  <div className="flex-none px-4 pb-2 md:px-6">
                    <div className="relative">
                      <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-lg pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar factura por cliente o número…"
                        className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-neutral-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                          <MdClose />
                        </button>
                      )}
                    </div>

                    {/* Indicador de balance cerrado */}
                    {isBalanceClosed && Object.keys(assignments).length > 0 && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
                        <MdLock className="text-emerald-600 dark:text-emerald-400 text-sm flex-none" />
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                          Saldo agotado — no puedes añadir más facturas. Reduce algún importe para liberar saldo.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tabla de facturas — scroll interno reforzado */}
                  <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-4 scrollbar-thin">

                    {/* Desktop: tabla */}
                    <div className="hidden sm:block overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                           <tr className="bg-neutral-100 dark:bg-neutral-800/80">
                             <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 w-10 text-center">Sel.</th>
                             <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 text-left">Factura</th>
                             <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 text-left">Cliente</th>
                             <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 text-right">Total</th>
                             <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 text-right">Pendiente</th>
                             <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 text-right w-32">Asignar (€)</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {filteredInvoices.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-3 py-10 text-center text-neutral-400 text-sm">
                                No hay facturas pendientes.
                              </td>
                            </tr>
                          )}
                          {filteredInvoices.map((invoice) => {
                            const id = String(invoice.id);
                            const isChecked = assignments[id] !== undefined;
                            const isDisabled = !isChecked && isBalanceClosed;
                            const isSug = suggestedInvoice?.id === id;
                            return (
                              <tr
                                key={id}
                                onClick={() => !isDisabled && handleToggleInvoice(invoice)}
                                className={`transition-colors ${isDisabled ? 'opacity-40 cursor-not-allowed bg-white dark:bg-caixeta-card'
                                  : isChecked ? 'cursor-pointer bg-emerald-50 dark:bg-emerald-900/10'
                                    : 'cursor-pointer bg-white dark:bg-caixeta-card hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                                  }`}
                              >
                                {/* Checkbox */}
                                <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    disabled={isDisabled}
                                    onClick={() => !isDisabled && handleToggleInvoice(invoice)}
                                    className="flex items-center justify-center w-full"
                                  >
                                    {isDisabled
                                      ? <MdLock className="text-neutral-300 dark:text-neutral-600 text-lg" />
                                      : isChecked
                                        ? <MdOutlineCheckBox className="text-emerald-500 text-xl" />
                                        : <MdOutlineCheckBoxOutlineBlank className="text-neutral-400 text-xl" />
                                    }
                                  </button>
                                </td>
                                {/* Nº Factura */}
                                <td className="px-3 py-3">
                                  <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${isSug ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>
                                    {invoice.factusol_number || invoice.id}
                                  </span>
                                  {isSug && <span className="ml-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">IA</span>}
                                </td>
                                {/* Cliente */}
                                <td className="px-3 py-3">
                                  <p className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">{invoice.client}</p>
                                  {invoice.date && <p className="text-xs text-neutral-400">{fmtDate(invoice.date)}</p>}
                                </td>
                                {/* Total factura */}
                                <td className="px-3 py-3 text-right text-neutral-500">
                                  {fmt(invoice.total_amount || invoice.amount)}
                                </td>
                                {/* Pte. cobro */}
                                <td className="px-3 py-3 text-right font-semibold text-neutral-700 dark:text-neutral-200">
                                  {invoice.pending_amount <= 0 ? (
                                    <span className="text-emerald-500 flex items-center justify-end gap-1">
                                      <MdCheckCircle /> Cobrada
                                    </span>
                                  ) : fmt(invoice.pending_amount)}
                                </td>
                                {/* Input Asignar */}
                                <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    disabled={!isChecked}
                                    value={isChecked ? (assignments[id] ?? '') : ''}
                                    onChange={(e) => handleAssignAmountChange(invoice, e.target.value)}
                                    onClick={(e) => { e.stopPropagation(); if (!isChecked && !isDisabled) handleToggleInvoice(invoice); }}
                                    className={`w-28 text-right px-2 py-1.5 text-sm rounded-lg border outline-none transition-all ${isChecked
                                      ? 'border-emerald-400 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white focus:ring-2 focus:ring-emerald-400'
                                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-300 dark:text-neutral-600 cursor-pointer'
                                      }`}
                                    placeholder="0,00"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile: tarjetas */}
                    <div className="sm:hidden space-y-2">
                      {filteredInvoices.length === 0 && (
                        <p className="text-center py-8 text-neutral-400 text-sm">No hay facturas pendientes.</p>
                      )}
                      {filteredInvoices.map((invoice) => {
                        const id = String(invoice.id);
                        const isChecked = assignments[id] !== undefined;
                        const isDisabled = !isChecked && isBalanceClosed;
                        const isSug = suggestedInvoice?.id === id;
                        return (
                          <div
                            key={id}
                            className={`rounded-xl border-2 p-3 transition-all ${isDisabled ? 'opacity-40 border-neutral-200 dark:border-neutral-800'
                              : isChecked ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-caixeta-card'
                              }`}
                          >
                            <div className="flex items-start gap-3" onClick={() => !isDisabled && handleToggleInvoice(invoice)}>
                              <button disabled={isDisabled} className="flex-none mt-0.5">
                                {isDisabled
                                  ? <MdLock className="text-neutral-300 text-xl" />
                                  : isChecked
                                    ? <MdOutlineCheckBox className="text-emerald-500 text-xl" />
                                    : <MdOutlineCheckBoxOutlineBlank className="text-neutral-400 text-xl" />
                                }
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${isSug ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>
                                    {invoice.factusol_number || invoice.id}
                                  </span>
                                  {isSug && <span className="text-[10px] font-bold text-emerald-600">IA</span>}
                                </div>
                                <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-200 truncate">{invoice.client}</p>
                                <div className="flex gap-3 mt-1">
                                  <p className="text-[10px] text-neutral-400">Total: {fmt(invoice.total_amount || invoice.amount)}</p>
                                  {invoice.date && <p className="text-[10px] text-neutral-400">{fmtDate(invoice.date)}</p>}
                                </div>
                              </div>
                              <div className="flex-none text-right">
                                <p className={`font-bold text-sm ${invoice.pending_amount <= 0 ? 'text-emerald-500' : 'text-neutral-700 dark:text-neutral-200'}`}>
                                  {invoice.pending_amount <= 0 ? '✓ Cobrada' : fmt(invoice.pending_amount)}
                                </p>
                                {invoice.pending_amount > 0 && <p className="text-[10px] text-neutral-400">Pendiente</p>}
                              </div>
                            </div>
                            {isChecked && (
                              <div className="mt-2.5 flex items-center gap-2 pl-9">
                                <label className="text-xs text-neutral-500 font-medium flex-none">Asignar (€):</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={assignments[id] ?? ''}
                                  onChange={(e) => handleAssignAmountChange(invoice, e.target.value)}
                                  className="flex-1 text-right px-2 py-1.5 text-sm rounded-lg border border-emerald-400 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white focus:ring-2 focus:ring-emerald-400 outline-none"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Footer con totales + botones ── */}
                  <div className="flex-none border-t-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-caixeta-dark">
                    {/* Barra de totales */}
                    <div className="px-4 md:px-6 pt-3 pb-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-neutral-500">
                          Cobro: <strong className="text-neutral-800 dark:text-neutral-100">{fmt(activeReceipt.amount)}</strong>
                        </span>
                        <span className={isBalanceClosed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : totalAssigned > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-neutral-500'}>
                          Asignado: <strong>{fmt(totalAssigned)}</strong>
                        </span>
                        {/* Indicador obligatorio: cuánto falta para cubrir el 100% */}
                        {!isBalanceClosed && balanceRestante > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <MdWarningAmber className="flex-none" />
                            Faltan <strong>{fmt(balanceRestante)}</strong> para poder conciliar
                          </span>
                        )}
                        {isBalanceClosed && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <MdCheckCircle className="flex-none" /> Saldo cubierto al 100%
                          </span>
                        )}
                        {balanceRestante < 0 && (
                          <span className="text-red-500 font-bold flex items-center gap-1">
                            <MdWarningAmber /> Excedido en {fmt(Math.abs(balanceRestante))}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400">
                        {Object.keys(assignments).length} factura{Object.keys(assignments).length !== 1 ? 's' : ''} marcada{Object.keys(assignments).length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Advertencia de ceros */}
                    {hasZeroAssignment && Object.keys(assignments).length > 0 && (
                      <div className="mx-4 md:mx-6 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/50">
                        <MdWarningAmber className="text-red-500 flex-none" />
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Hay facturas marcadas con 0 €. Pon un importe mayor a 0 o desmarcarlas.
                        </p>
                      </div>
                    )}

                    {/* Botones */}
                    <div className="px-4 md:px-6 pb-4 flex flex-col sm:flex-row gap-2.5">
                      <button
                        onClick={() => canConciliate && setShowConciliateModal(true)}
                        disabled={!canConciliate}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm transition-all ${canConciliate
                          ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-600/20 cursor-pointer'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                          }`}
                      >
                        <MdCheckCircle className="text-lg" /> Conciliar Seleccionadas
                      </button>
                      <button
                        onClick={() => setDetailView('manual')}
                        className="flex-none flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-medium text-sm border-2 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <MdOutlineCategory />
                        <span className="hidden xl:inline">Asignar a otros ingresos (Manual)</span>
                        <span className="xl:hidden">Otros ingresos</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ══════════════════ VISTA: MANUAL ══════════════════ */}
              {detailView === 'manual' && (
                <>
                  <div className="flex-none px-4 pb-2 md:px-6">
                    <div className="flex items-center gap-2 mb-0.5">
                      <MdEditNote className="text-neutral-500 text-lg" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Clasificar Ingreso Manual</h3>
                    </div>
                    <p className="text-xs text-neutral-400">Este movimiento no corresponde a ninguna factura.</p>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-2 space-y-4">
                    {/* Importe bloqueado */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                        Importe (bloqueado)
                      </label>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                        <MdLock className="text-neutral-400 flex-none" />
                        <span className={`text-xl font-bold ${activeReceipt.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-800 dark:text-white'}`}>
                          {fmt(activeReceipt.amount)}
                        </span>
                        <span className="text-xs text-neutral-400 truncate">{activeReceipt.concept}</span>
                      </div>
                    </div>

                    {/* Categoría */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                        Categoría del ingreso <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value)}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      >
                        {MANUAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Notas */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                        Concepto / Notas adicionales
                      </label>
                      <textarea
                        rows={4}
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        placeholder="Añade detalles sobre el origen de este ingreso…"
                        className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-neutral-400 resize-none"
                      />
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50">
                      <span className="text-amber-500 text-base flex-none mt-0.5"></span>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        La IA aprenderá de esta clasificación para sugerirla en futuros movimientos similares.
                      </p>
                    </div>
                  </div>

                  <div className="flex-none border-t-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-caixeta-dark px-4 md:px-6 py-4 flex gap-2.5">
                    <button
                      onClick={() => setDetailView('invoices')}
                      className="flex-none flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-medium text-sm border-2 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <MdArrowBack /> Cancelar
                    </button>
                    <button
                      onClick={() => setShowManualModal(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-lg shadow-amber-500/20 transition-all"
                    >
                      <MdEditNote className="text-lg" /> Guardar Clasificación
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
