import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  MdCheckCircle,
  MdSearch,
  MdOutlineReceipt,
  MdArrowBack,
  MdSmartToy,
  MdClose,
  MdPayments,
  MdEditNote,
  MdOutlineCheckBox,
  MdOutlineCheckBoxOutlineBlank,
  MdLock,
  MdErrorOutline,
  MdHistory,
  MdEvent,
  MdOutlineCategory,
  MdWarningAmber,
  MdExpandMore,
  MdExpandLess,
  MdLink,
  MdTrendingDown,
  MdToday,
  MdDateRange,
  MdWarning
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

// Date helper for grouping (start of week: Monday)
const getWeekRange = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
  const startOfWeek = new Date(date.setDate(diff));
  const endOfWeek = new Date(date.setDate(startOfWeek.getDate() + 6));
  return { start: startOfWeek, end: endOfWeek };
};

const fmtDayMonth = (date) => {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const MANUAL_CATEGORIES = [
  'Nóminas',
  'Impuestos',
  'Alquiler',
  'Suministros',
  'Comisiones Bancarias',
  'Otros Gastos',
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
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 animate-in zoom-in-95 duration-200 overflow-hidden"
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
      return { label: inv?.factusol_number || inv?.id || id, vendor: inv?.client || '—', amount: parseFloat(amt) || 0 };
    })
    .filter((l) => l.amount > 0);

  const total = lines.reduce((a, l) => a + l.amount, 0);

  return (
    <Modal onClose={onCancel}>
      <div className="p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-none w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <MdPayments className="text-amber-600 dark:text-amber-400 text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-800 dark:text-neutral-100 text-base leading-tight">
              ¿Confirmar pago?
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Asignarás el pago de{' '}
              <span className="font-bold text-amber-600 dark:text-amber-400">{fmt(Math.abs(receipt?.amount))}</span>{' '}
              de "{receipt?.concept}" a las siguientes facturas:
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden mb-5">
          <div className="bg-neutral-50 dark:bg-neutral-800/60 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-700">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Desglose del pago</p>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-48 overflow-y-auto">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">{l.label}</p>
                  <p className="text-xs text-neutral-400">{l.vendor}</p>
                </div>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{fmt(l.amount)}</span>
              </div>
            ))}
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800/60 px-4 py-2.5 flex justify-between items-center border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total asignado</p>
            <p className="font-bold text-neutral-800 dark:text-neutral-100">{fmt(total)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50 mb-4">
          <MdCheckCircle className="text-amber-500 text-lg flex-none" />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            El saldo está cubierto al 100%. La operación es contablemente exacta.
          </p>
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
            {isLoading ? <><Spinner /> Procesando...</> : <><MdCheckCircle className="text-lg" /> Sí, confirmar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal de confirmación pago manual ─────────────────────────────────────────
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
              ¿Guardar gasto manual?
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Este pago de <span className="font-bold text-neutral-700 dark:text-neutral-200">{fmt(Math.abs(receipt?.amount))}</span> quedará registrado a otros gastos.
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
//   COMPONENTE PRINCIPAL: PAGOS
// ─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══
export default function Pagos() {
  const [activeTab, setActiveTab] = useState('conciliacion'); // 'conciliacion' | 'prevision'

  // Tab 1 state
  const [receipts, setReceipts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [detailView, setDetailView] = useState('invoices'); // 'invoices' | 'manual'
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState({});
  const [manualCategory, setManualCategory] = useState(MANUAL_CATEGORIES[0]);
  const [manualNotes, setManualNotes] = useState('');
  const [showConciliateModal, setShowConciliateModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Tab 2 state
  const [forecasts, setForecasts] = useState([]);
  const [forecastMaxDate, setForecastMaxDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2); // default 2 months ahead
    return d.toISOString().split('T')[0];
  });
  const [tempForecastMaxDate, setTempForecastMaxDate] = useState(forecastMaxDate);
  const todayDateString = new Date().toISOString().split('T')[0];
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [loadFullHistory, setLoadFullHistory] = useState(false);
  const [collapsedWeeks, setCollapsedWeeks] = useState(new Set());

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // ─── Fetch de datos ────────────────────────────────────────────────────────
  const refreshConciliationData = useCallback(async () => {
    try {
      const [rRes, iRes] = await Promise.all([
        fetch(`${apiUrl}/api/transactions/pending-payments`),
        fetch(`${apiUrl}/api/invoices/purchase-pending`),
      ]);
      if (rRes.ok) setReceipts(await rRes.json());
      if (iRes.ok) setInvoices(await iRes.json());
    } catch (err) {
      console.error('Error fetch conciliación:', err);
    }
  }, [apiUrl]);

  const refreshForecastData = useCallback(async () => {
    try {
      setIsLoadingForecast(true);
      let fMinDate = '';
      if (!loadFullHistory) {
      	const minD = new Date();
      	minD.setMonth(minD.getMonth() - 1); // Hace 1 mes
        fMinDate = `&minDate=${minD.toISOString().split('T')[0]}`;
      }
      const res = await fetch(`${apiUrl}/api/payments/forecast?maxDate=${forecastMaxDate}${fMinDate}`);
      if (res.ok) setForecasts(await res.json());
    } catch (err) {
      console.error('Error fetch forecast:', err);
    } finally {
      setIsLoadingForecast(false);
    }
  }, [apiUrl, forecastMaxDate, loadFullHistory]);

  useEffect(() => {
    // Initial fetch
    (async () => {
      setIsLoading(true);
      await Promise.all([refreshConciliationData(), refreshForecastData()]);
      setIsLoading(false);
    })();
  }, [refreshConciliationData, refreshForecastData]);

  // Forecast refresh when date changes
  useEffect(() => {
    if (!isLoading) {
      refreshForecastData();
    }
  }, [forecastMaxDate, refreshForecastData]);

  // Debounce para evitar que el calendario nativo se cierre al cambiar de mes antes del día
  useEffect(() => {
    const t = setTimeout(() => {
      if (tempForecastMaxDate !== forecastMaxDate && tempForecastMaxDate !== '') {
        setForecastMaxDate(tempForecastMaxDate);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [tempForecastMaxDate, forecastMaxDate]);

  // ─── Derivados Tab 1 ───────────────────────────────────────────────────────
  const activeReceipt = receipts.find((r) => r.id === activeReceiptId) ?? null;

  const suggestedInvoice = useMemo(() => {
    if (activeReceipt?.status !== 'suggested') return null;
    const base = invoices.find((i) => String(i.id) === String(activeReceipt.invoice_id));
    return {
      id: String(activeReceipt.invoice_id),
      client: activeReceipt.vendor_name || base?.client,
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

  const activeAbsAmount = Math.abs(activeReceipt?.amount ?? 0);

  const totalAssigned = useMemo(
    () => Object.values(assignments).reduce((acc, v) => acc + (parseFloat(v) || 0), 0),
    [assignments]
  );

  const balanceRestante = activeAbsAmount - totalAssigned;
  const isBalanceClosed = Math.abs(balanceRestante) < 0.005;
  const hasZeroAssignment = Object.values(assignments).some((v) => !(parseFloat(v) > 0));
  const canConciliate = Object.keys(assignments).length > 0 && isBalanceClosed && !hasZeroAssignment;

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

      if (receipt.invoice_id) {
        const absAmt = Math.abs(receipt.amount);
        const sugAmt = Math.min(receipt.pending_amount ?? absAmt, absAmt);
        setAssignments({ [String(receipt.invoice_id)]: String(sugAmt > 0 ? sugAmt.toFixed(2) : '') });
      } else {
        setAssignments({});
      }
    },
    [resetDetail]
  );

  // ─── Toggle checkbox con reglas ────────────────────────────────────────────
  const handleToggleInvoice = (invoice) => {
    if ((invoice.pending_amount ?? 0) <= 0) return;
    const id = String(invoice.id);
    setAssignments((prev) => {
      if (prev[id] !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const alreadyAssigned = Object.values(prev).reduce((a, v) => a + (parseFloat(v) || 0), 0);
      const leftToCover = activeAbsAmount - alreadyAssigned;
      if (leftToCover <= 0) return prev;
      const suggested = Math.min(leftToCover, invoice.pending_amount ?? 0);
      return { ...prev, [id]: String(suggested > 0 ? suggested.toFixed(2) : '') };
    });
  };

  // ─── Cambiar importe manualmente ───────────────────────────────────────────
  const handleAssignAmountChange = (invoice, value) => {
    const id = String(invoice.id);
    let newValue = value;
    const maxAmount = invoice.pending_amount ?? 0;
    
    // Si intenta poner más de lo pendiente, lo capamos al máximo posible de esa factura
    if (value !== '' && parseFloat(value) > maxAmount) {
      newValue = String(maxAmount.toFixed(2));
    }
    
    setAssignments((prev) => {
      if (prev[id] === undefined) return prev; 
      return { ...prev, [id]: newValue };
    });
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
          totalAmount: activeReceipt.amount, // backend handles negative
          concept: activeReceipt.concept,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Error ${res.status}`); }
      setReceipts((prev) => prev.filter((r) => r.id !== activeReceipt.id));
      setShowConciliateModal(false);
      resetDetail();
      setToast({ 
        message: `✓ Pago de ${fmt(activeAbsAmount)} conciliado con ${assignmentsArray.length} factura(s).`, 
        type: 'success' 
      });
      await Promise.all([refreshConciliationData(), refreshForecastData()]);
    } catch (err) {
      console.error(err);
      setShowConciliateModal(false);
      setToast({ message: `⚠️ ${err.message}`, type: 'error' });
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
          userId: userData.id,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || e.message || `Error ${res.status}`); }
      setReceipts((prev) => prev.filter((r) => r.id !== activeReceipt.id));
      setShowManualModal(false);
      resetDetail();
      setToast({ message: `✓ Gasto clasificado como "${manualCategory}".`, type: 'success' });
      await Promise.all([refreshConciliationData(), refreshForecastData()]);
    } catch (err) {
      console.error(err);
      setShowManualModal(false);
      setToast({ message: `${err.message}`, type: 'error' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleJumpToConciliation = (vendorName) => {
    setActiveTab('conciliacion');
    setDetailView('invoices');
    setSearchTerm(vendorName);
  };

  const toggleWeekCollapse = (weekKey) => {
    setCollapsedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekKey)) next.delete(weekKey);
      else next.add(weekKey);
      return next;
    });
  };

  const forecastStats = useMemo(() => {
    let vencido = 0;
    let pendingThisWeek = 0;
    let totalMes = 0;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const { start: weekStart, end: weekEnd } = getWeekRange(new Date());
    
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    forecasts.forEach(f => {
       const falto = parseFloat(f.falta_pagar) || 0;
       if (falto <= 0) return;
       
       const due = new Date(f.fecha_vencimiento);
       due.setHours(0,0,0,0);
       
       if (due < today) {
         vencido += falto;
       }
       if (due >= weekStart && due <= weekEnd) {
         pendingThisWeek += falto;
       }
       if (due.getMonth() === currentMonth && due.getFullYear() === currentYear) {
         totalMes += falto;
       }
    });
    
    return { vencido, pendingThisWeek, totalMes };
  }, [forecasts]);

  // ─── Weekly Grouping Forecast ─────────────────────────────────────────────
  const groupedForecasts = useMemo(() => {
    const groups = {};
    forecasts.forEach(f => {
      // Parse ISO date
      const v = new Date(f.fecha_vencimiento);
      const { start, end } = getWeekRange(v);
      // Key can be ISO date of Monday for sorting
      const key = start.toISOString().split('T')[0];
      if (!groups[key]) {
        groups[key] = {
          start,
          end,
          items: [],
          totalToPay: 0
        };
      }
      groups[key].items.push(f);
      if (parseFloat(f.falta_pagar) > 0) {
        groups[key].totalToPay += parseFloat(f.falta_pagar);
      }
    });

    return Object.keys(groups).sort().map(k => groups[k]);
  }, [forecasts]);

  // ─── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="w-12 h-12 border-4 border-neutral-200 dark:border-neutral-800 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-neutral-600 dark:text-neutral-300 font-medium">Cargando datos de pagos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-transparent animate-in fade-in duration-500">
      
      {/* ──────────────── Tabs Nav ──────────────── */}
      <div className="flex-none flex bg-white dark:bg-caixeta-card rounded-xl p-1 shadow-sm border border-neutral-200 dark:border-neutral-800 self-start mb-4">
        <button
          onClick={() => setActiveTab('conciliacion')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'conciliacion' 
              ? 'bg-amber-500 text-white shadow-md' 
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <MdPayments className="text-lg" />
          Conciliación Activa
        </button>
        <button
          onClick={() => setActiveTab('prevision')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'prevision' 
              ? 'bg-amber-500 text-white shadow-md' 
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <MdEvent className="text-lg" />
          Previsión de Pagos
        </button>
      </div>

      {toast && <StatusToast config={toast} onDone={() => setToast(null)} />}

      {/* ──────────────── TAB 1: Conciliación ──────────────── */}
      {activeTab === 'conciliacion' && (
        <div
          className="flex-1 min-h-0 flex flex-col lg:flex-row w-full bg-neutral-50 dark:bg-caixeta-dark rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden"
          onClick={() => handleSelectReceipt(null, null)}
        >
          {showConciliateModal && (
            <ConciliateModal receipt={activeReceipt} assignments={assignments} invoices={invoices} isLoading={isActionLoading} onConfirm={executeConciliate} onCancel={() => !isActionLoading && setShowConciliateModal(false)} />
          )}
          {showManualModal && (
            <ManualModal receipt={activeReceipt} category={manualCategory} notes={manualNotes} isLoading={isActionLoading} onConfirm={executeManual} onCancel={() => !isActionLoading && setShowManualModal(false)} />
          )}

          {/* Columna Izquierda — Movimientos */}
          <div
            className={`w-full lg:w-[340px] xl:w-[380px] flex-1 lg:flex-none border-r border-neutral-200 dark:border-neutral-800 flex flex-col min-h-0 ${activeReceiptId ? 'hidden lg:flex' : 'flex'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-none p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-caixeta-card">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                <MdPayments className="text-amber-500 text-xl" />
                Pagos a conciliar
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {receipts.length} movimiento{receipts.length !== 1 ? 's' : ''} pendiente(s)
              </p>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-neutral-50 dark:bg-caixeta-dark scrollbar-thin"
              onClick={() => handleSelectReceipt(null, null)}
            >
              {sortedReceipts.length === 0 && (
                <div className="text-center py-14">
                  <MdCheckCircle className="mx-auto text-4xl mb-2 text-emerald-500" />
                  <p className="font-medium text-neutral-600 dark:text-neutral-400">Todo al día</p>
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
                        ? 'ring-2 ring-amber-500 bg-white dark:bg-neutral-800 border-amber-300 dark:border-amber-700 shadow-md'
                        : 'bg-white dark:bg-caixeta-card border-neutral-200 dark:border-neutral-800 hover:shadow-sm hover:border-neutral-300'}
                      ${isSuggested && !isSelected ? 'border-l-[3px] border-l-amber-500' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-neutral-400">{fmtDate(receipt.value_date)}</span>
                      {isSuggested && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                          <MdSmartToy /> {receipt.match_confidence}%
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100 line-clamp-1" title={receipt.concept}>
                      {receipt.concept}
                    </p>
                    <p className="text-base font-bold mt-1 text-right text-amber-600 dark:text-amber-400">
                      {fmt(receipt.amount)} {/* Negativo original, ideal mostrarlo tal cual en la lista o positivo, usaré tal cual para ser preciso, o Math.abs para uniformar */}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha — Detalle */}
          <div
            className={`flex-1 min-h-0 flex flex-col bg-white dark:bg-caixeta-card ${!activeReceiptId ? 'hidden lg:flex' : 'flex'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {!activeReceipt && (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
                <div className="w-20 h-20 mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <MdOutlineReceipt className="text-4xl text-neutral-300 dark:text-neutral-600" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-600 dark:text-neutral-300 mb-1">Ningún pago seleccionado</h3>
                <p className="max-w-xs text-sm">Selecciona una salida de la lista para conciliar o clasificar.</p>
              </div>
            )}

            {activeReceipt && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="lg:hidden flex-none px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                  <button onClick={(e) => { e.stopPropagation(); handleSelectReceipt(null, null); }} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-500 transition-colors">
                    <MdArrowBack /> Volver
                  </button>
                </div>
                
                {/* Switch view if not invoices */}
                {detailView === 'manual' ? (
                  <>
                    <div className="flex-none px-4 pb-2 md:px-6">
                      <div className="flex items-center gap-2 mb-0.5">
                        <MdEditNote className="text-neutral-500 text-lg" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Clasificar Gasto Manual</h3>
                      </div>
                      <p className="text-xs text-neutral-400">Este movimiento no corresponde a ninguna factura de compra.</p>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-2 space-y-4">
                      {/* Importe bloqueado */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                          Importe (bloqueado)
                        </label>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                          <MdLock className="text-neutral-400 flex-none" />
                          <span className={`text-xl font-bold ${activeAbsAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-800 dark:text-white'}`}>
                            {fmt(activeAbsAmount)}
                          </span>
                          <span className="text-xs text-neutral-400 truncate">{activeReceipt.concept}</span>
                        </div>
                      </div>

                      {/* Categoría */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                          Categoría del gasto <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={manualCategory}
                          onChange={(e) => setManualCategory(e.target.value)}
                          className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
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
                          placeholder="Añade detalles sobre el origen de este gasto…"
                          className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all placeholder:text-neutral-400 resize-none"
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
                ) : (
                  <>
                    {/* Banner header for invoices mode */}
                    <div className="flex-none px-4 pt-4 pb-3 md:px-6">
                      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 px-4 py-3 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">Movimiento de salida</p>
                          <p className="font-semibold text-neutral-800 dark:text-neutral-100 truncate text-sm" title={activeReceipt.concept}>
                            {activeReceipt.concept}
                          </p>
                          <p className="text-xs text-neutral-400 mt-0.5">{fmtDate(activeReceipt.value_date)}</p>
                        </div>
                        <div className="flex-none text-right">
                          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {fmt(activeAbsAmount)}
                          </p>
                          {totalAssigned > 0 && (
                            <p className={`text-xs mt-0.5 font-semibold ${isBalanceClosed ? 'text-amber-500' : balanceRestante < 0 ? 'text-red-500' : 'text-neutral-500'}`}>
                              {isBalanceClosed ? '✓ Saldo cubierto' : balanceRestante < 0 ? `Excedido ${fmt(Math.abs(balanceRestante))}` : `Resta ${fmt(balanceRestante)}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {activeAbsAmount > 0 && totalAssigned > 0 && (
                        <div className="mt-2 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${totalAssigned > activeAbsAmount ? 'bg-red-500' : isBalanceClosed ? 'bg-amber-500' : 'bg-neutral-400'}`}
                            style={{ width: `${Math.min((totalAssigned / activeAbsAmount) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Buscador y opciones */}
                    <div className="flex-none px-4 pb-2 md:px-6">
                      <div className="relative">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-lg pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar factura por proveedor o número…"
                          className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all placeholder:text-neutral-400"
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
                        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                          <MdLock className="text-amber-600 dark:text-amber-400 text-sm flex-none" />
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                            Saldo agotado — no puedes añadir más facturas. Reduce algún importe para liberar saldo.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Tabla de Facturas */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-4 scrollbar-thin">
                      <div className="hidden sm:block overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                             <tr className="bg-neutral-100 dark:bg-neutral-800/80">
                               <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 w-10 text-center">Sel.</th>
                               <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 text-left">Factura</th>
                               <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 text-left">Proveedor</th>
                               <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 text-right">Total</th>
                               <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 text-right">Pendiente</th>
                               <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 text-right w-32">Asignar (€)</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {filteredInvoices.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-3 py-10 text-center text-neutral-400 text-sm">
                                  No hay facturas de este proveedor.
                                </td>
                              </tr>
                            )}
                            {filteredInvoices.map((invoice) => {
                              const id = String(invoice.id);
                              const isChecked = assignments[id] !== undefined;
                              const isDisabled = !isChecked && isBalanceClosed;
                              return (
                                <tr
                                  key={id}
                                  onClick={() => !isDisabled && handleToggleInvoice(invoice)}
                                  className={`transition-colors ${isDisabled ? 'opacity-40 cursor-not-allowed bg-white dark:bg-caixeta-card'
                                    : isChecked ? 'cursor-pointer bg-amber-50 dark:bg-amber-900/10'
                                      : 'cursor-pointer bg-white dark:bg-caixeta-card hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                                    }`}
                                >
                                  <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button disabled={isDisabled} onClick={() => !isDisabled && handleToggleInvoice(invoice)} className="flex items-center justify-center w-full">
                                      {isDisabled ? <MdLock className="text-neutral-300 dark:text-neutral-600 text-lg" />
                                        : isChecked ? <MdOutlineCheckBox className="text-amber-500 text-xl" />
                                          : <MdOutlineCheckBoxOutlineBlank className="text-neutral-400 text-xl" />
                                      }
                                    </button>
                                  </td>
                                  <td className="px-3 py-3">
                                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                      {invoice.factusol_number || invoice.id}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 font-medium text-neutral-800 dark:text-neutral-200">{invoice.client}</td>
                                  <td className="px-3 py-3 text-right text-neutral-500">
                                    {fmt(invoice.total_amount || invoice.amount || invoice.pending_amount)}
                                  </td>
                                  <td className="px-3 py-3 text-right font-semibold text-neutral-700 dark:text-neutral-200">
                                    {invoice.pending_amount <= 0 ? (
                                      <span className="text-amber-500 flex items-center justify-end gap-1">
                                        <MdCheckCircle /> Pagada
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
                                        ? 'border-amber-400 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white focus:ring-2 focus:ring-amber-400'
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
                      
                      {/* Mobile Cards (simplified) */}
                      <div className="sm:hidden space-y-2">
                        {filteredInvoices.map((invoice) => {
                          const id = String(invoice.id);
                          const isChecked = assignments[id] !== undefined;
                          const isDisabled = !isChecked && isBalanceClosed;
                          return (
                            <div key={id} onClick={() => !isDisabled && handleToggleInvoice(invoice)} className={`p-3 rounded-lg border ${isChecked ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-caixeta-card'}`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-mono text-xs text-neutral-500">{invoice.factusol_number}</span>
                                {isChecked 
                                  ? <MdOutlineCheckBox className="text-amber-500 text-xl" />
                                  : <MdOutlineCheckBoxOutlineBlank className="text-neutral-400 text-xl" />
                                }
                              </div>
                              <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100 truncate">{invoice.client}</p>
                              <p className="text-right font-bold text-neutral-900 dark:text-white mt-1">{fmt(invoice.pending_amount)}</p>
                            
                            {isChecked && (
                              <div className="mt-2.5 flex items-center gap-2 pl-9">
                                <label className="text-xs text-neutral-500 font-medium flex-none">Asignar (€):</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={assignments[id] ?? ''}
                                  onChange={(e) => handleAssignAmountChange(invoice, e.target.value)}
                                  className="flex-1 text-right px-2 py-1.5 text-sm rounded-lg border border-amber-400 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white focus:ring-2 focus:ring-amber-400 outline-none"
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
                          Pago: <strong className="text-neutral-800 dark:text-neutral-100">{fmt(activeAbsAmount)}</strong>
                        </span>
                        <span className={isBalanceClosed ? 'text-amber-600 dark:text-amber-400 font-bold' : totalAssigned > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-neutral-500'}>
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
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
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
                          ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-lg shadow-amber-600/20 cursor-pointer'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                          }`}
                      >
                        <MdCheckCircle className="text-lg" /> Conciliar seleccionadas
                      </button>
                      <button
                        onClick={() => setDetailView('manual')}
                        className="flex-none flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-medium text-sm border-2 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <MdOutlineCategory />
                        <span className="hidden xl:inline">Asignar a otros gastos (Manual)</span>
                        <span className="xl:hidden">Otros gastos</span>
                      </button>
                    </div>
                  </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── TAB 2: Previsión ──────────────── */}
      {activeTab === 'prevision' && (
        <div className="flex-1 bg-white dark:bg-caixeta-card rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col min-h-0 overflow-hidden">
          {/* Header Controls */}
          <div className="flex-none p-4 md:p-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                <MdHistory className="text-blue-500 text-xl" />
                Previsión de vencimientos
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Consulta facturas agrupadas por semana.</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Mostrar hasta:</label>
              <input 
                type="date" 
                min={todayDateString}
                value={tempForecastMaxDate} 
                onChange={e => setTempForecastMaxDate(e.target.value)}
                className="flex-1 md:flex-none px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-50 dark:bg-caixeta-dark scrollbar-thin">
            
            {/* ──────────────── Header Stats ──────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className="bg-white dark:bg-caixeta-card rounded-xl p-3 shadow-sm border-l-4 border-red-500 border-t border-r border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Vencido (Atrasado)</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-500">{fmt(forecastStats.vencido)}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <MdWarning className="text-red-500 text-lg" />
                </div>
              </div>

              <div className="bg-white dark:bg-caixeta-card rounded-xl p-3 shadow-sm border-l-4 border-amber-500 border-t border-r border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Pendiente esta semana</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-500">{fmt(forecastStats.pendingThisWeek)}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <MdToday className="text-amber-500 text-lg" />
                </div>
              </div>

              <div className="bg-white dark:bg-caixeta-card rounded-xl p-3 shadow-sm border-l-4 border-blue-500 border-t border-r border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Total Mes Actual</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-500">{fmt(forecastStats.totalMes)}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <MdDateRange className="text-blue-500 text-lg" />
                </div>
              </div>
            </div>

            {isLoadingForecast && groupedForecasts.length === 0 ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : groupedForecasts.length === 0 ? (
              <div className="text-center py-20 text-neutral-400">
                <MdEvent className="text-5xl mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <p>No hay previsiones para esta fecha.</p>
              </div>
            ) : (
              <div className={`space-y-6 transition-opacity duration-300 ${isLoadingForecast ? 'opacity-50 pointer-events-none' : ''}`}>
                {groupedForecasts.map((group, idx) => {
                  const weekKey = `week-${idx}`;
                  const isCollapsed = collapsedWeeks.has(weekKey);
                  
                  return (
                    <div key={idx} className="bg-white dark:bg-caixeta-card rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                      {/* Header Group Colapsable */}
                      <button 
                        onClick={() => toggleWeekCollapse(weekKey)}
                        className="w-full bg-neutral-100 dark:bg-neutral-800/80 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <h3 className="font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wider text-xs">
                          SEMANA {idx + 1} <span className="text-neutral-500 font-medium ml-1">({fmtDayMonth(group.start)} - {fmtDayMonth(group.end)})</span>
                        </h3>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">{fmt(group.totalToPay)}</span>
                          {isCollapsed ? <MdExpandMore className="text-neutral-500 text-xl" /> : <MdExpandLess className="text-neutral-500 text-xl" />}
                        </div>
                      </button>

                      {/* Table Group */}
                      {!isCollapsed && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-500 w-10">Estado</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Factura</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 whitespace-nowrap">Fecha Emi.</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Proveedor</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Forma Pago</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 whitespace-nowrap">Vencimiento</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 whitespace-nowrap">Pendiente</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-500 w-12">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                              {group.items.map((item, i) => {
                                const isPaid = parseFloat(item.falta_pagar) === 0;
                                
                                const dueDate = new Date(item.fecha_vencimiento);
                                dueDate.setHours(0,0,0,0);
                                const todayMs = new Date();
                                todayMs.setHours(0,0,0,0);
                                const isAtrasado = !isPaid && dueDate < todayMs;
                                const isHoy = !isPaid && dueDate.getTime() === todayMs.getTime();

                                return (
                                  <tr key={i} className={`transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${isPaid ? 'bg-neutral-50/50 dark:bg-neutral-900/30 opacity-60' : isAtrasado ? 'border-l-2 border-l-red-500 bg-red-50/30 dark:bg-red-900/10' : 'border-l-2 border-l-amber-400 bg-white dark:bg-caixeta-card'}`}>
                                    <td className="px-4 py-3 text-center">
                                      {isPaid ? <MdOutlineCheckBox className="text-emerald-500 text-xl mx-auto" /> : <MdOutlineCheckBoxOutlineBlank className="text-neutral-300 dark:text-neutral-600 text-xl mx-auto" />}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                      <span className={isPaid ? 'line-through' : ''}>{item.numero}</span>
                                    </td>
                                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">
                                      {fmtDate(item.fecha)}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-200">
                                      <span className={isPaid ? 'text-neutral-400' : ''}>{item.proveedor}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-neutral-500">
                                      {item.forma_pago || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                      <div className="flex items-center gap-1.5">
                                        <span className={isPaid ? 'text-neutral-400' : 'text-neutral-600 dark:text-neutral-300'}>{fmtDate(item.fecha_vencimiento)}</span>
                                        {isAtrasado && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 animate-pulse">VENCIDA</span>}
                                        {isHoy && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">HOY</span>}
                                      </div>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${isPaid ? 'text-neutral-400' : 'text-neutral-800 dark:text-neutral-100'}`}>
                                      {fmt(item.falta_pagar)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {!isPaid && (
                                        <button 
                                          title="Ir a conciliar proveedor"
                                          onClick={() => handleJumpToConciliation(item.proveedor)}
                                          className="p-1.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                                        >
                                          <MdLink className="text-lg" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Botón Cargar Historial */}
                {!loadFullHistory && (
                  <div className="pt-4 flex justify-center pb-8 border-t border-transparent">
                    <button 
                      onClick={() => setLoadFullHistory(true)}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition shadow-sm"
                    >
                      <MdHistory className="text-lg" />
                      Cargar historial antiguo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
