import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  MdAccountBalanceWallet,
  MdAdd,
  MdRemove,
  MdHistory,
  MdClose,
  MdCheckCircle,
  MdErrorOutline,
  MdOutlinePointOfSale,
  MdArrowUpward,
  MdArrowDownward,
  MdPerson,
  MdAccessTime,
  MdLock,
  MdWarningAmber,
  MdChevronLeft,
  MdChevronRight,
  MdOpenInFull,
  MdExpandMore,
} from 'react-icons/md';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval,
  subDays, subWeeks, subMonths, subYears,
  addWeeks, addMonths, addYears,
  startOfDay, getYear, getMonth, getDaysInMonth, getDay,
  setYear, setMonth as setDateMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (amount) => {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

const fmtDateTime = (d) => {
  if (!d) return '';
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = ({ size = 'sm' }) => (
  <svg
    className={`animate-spin flex-none ${size === 'sm' ? 'h-4 w-4' : 'h-8 w-8'}`}
    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── Agrupar historial por día ───────────────────────────────────────────────
const groupByDay = (items) => {
  const groups = {};
  items.forEach(item => {
    const dayKey = item.created_at ? item.created_at.split('T')[0] : 'unknown';
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(item);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, items]) => ({ day, items }));
};

const fmtDayLabel = (dayKey) => {
  if (!dayKey || dayKey === 'unknown') return 'Fecha desconocida';
  const d = new Date(dayKey + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayKey = today.toISOString().split('T')[0];
  const yestKey = yesterday.toISOString().split('T')[0];
  if (dayKey === todayKey) return 'Hoy';
  if (dayKey === yestKey) return 'Ayer';
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d).replace(/^\w/, c => c.toUpperCase());
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function StatusToast({ config, onDone }) {
  const { message, type = 'success' } = config;
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  const isError = type === 'error';
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${isError ? 'bg-red-600 shadow-red-600/30' : 'bg-emerald-600 shadow-emerald-600/30'}`}>
      {isError ? <MdErrorOutline className="text-2xl flex-none" /> : <MdCheckCircle className="text-2xl flex-none" />}
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

// ─── Modal de Movimiento (Ingreso / Gasto) ────────────────────────────────────
function MovementModal({ type, isLoading, onConfirm, onCancel, maxAmount }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const isIn = type === 'in';
  const Icon = isIn ? MdArrowUpward : MdArrowDownward;
  const title = isIn ? 'Registrar Ingreso' : 'Registrar Gasto / Salida';

  // Para gastos, el importe no puede superar el saldo físico en caja
  const effectiveMax = !isIn && maxAmount !== undefined ? maxAmount : Infinity;
  const parsedAmount = parseFloat(amount) || 0;
  const exceedsMax = !isIn && parsedAmount > effectiveMax;

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
  };

  const handleSubmit = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    if (!reason.trim()) return;
    if (exceedsMax) return;
    onConfirm({ amount: parsed, reason: reason.trim(), type });
  };

  return (
    <Modal onClose={onCancel}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isIn ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <Icon className={`text-xl ${isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
            <h3 className="font-bold text-neutral-800 dark:text-neutral-100 text-base">{title}</h3>
          </div>
          <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
            <MdClose className="text-xl" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
            Importe (€) <span className="text-red-400">*</span>
          </label>
          <input
            type="number" min="0" step="0.01" placeholder="0,00" value={amount}
            onChange={handleAmountChange} autoFocus
            className={`w-full px-4 py-3 text-lg font-bold rounded-xl border bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 outline-none transition-all ${
              exceedsMax
                ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400'
                : 'border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-emerald-500'
            }`}
          />
          {/* Aviso de saldo insuficiente */}
          {exceedsMax && (
            <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
              <MdWarningAmber className="text-red-500 text-base flex-none" />
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                El gasto no puede superar el saldo en caja ({fmt(effectiveMax)})
              </p>
            </div>
          )}
          {/* Ayuda: saldo disponible */}
          {!isIn && effectiveMax !== Infinity && !exceedsMax && (
            <p className="text-xs text-neutral-400 mt-1.5 ml-1">
              Disponible en caja: <span className="font-semibold text-neutral-600 dark:text-neutral-300">{fmt(effectiveMax)}</span>
            </p>
          )}
        </div>

        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
            Motivo / Concepto <span className="text-red-400">*</span>
          </label>
          <input
            type="text" placeholder="Ej: Pago a proveedor en mano, apertura de caja..."
            value={reason} onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-neutral-400"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm border-2 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isLoading || !amount || !reason.trim() || exceedsMax}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isIn ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25' : 'bg-red-600 hover:bg-red-700 shadow-red-600/25'}`}>
            {isLoading ? <><Spinner /> Guardando...</> : <><Icon className="text-lg" /> Confirmar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal de Cierre / Arqueo ─────────────────────────────────────────────────
function ArqueoModal({ currentBalance, isLoading, onConfirm, onCancel }) {
  const [counted, setCounted] = useState('');
  const parsedCounted = parseFloat(counted) || 0;
  const diff = parsedCounted - (currentBalance || 0);
  const hasDiff = Math.abs(diff) >= 0.01;

  return (
    <Modal onClose={onCancel}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <MdLock className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-800 dark:text-neutral-100 text-base">Realizar Cierre</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Compara el efectivo real con el sistema</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <MdClose className="text-xl" />
          </button>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 p-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Saldo según sistema</p>
          <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{fmt(currentBalance)}</p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
            Efectivo contado físicamente (€) <span className="text-red-400">*</span>
          </label>
          <input type="number" min="0" step="0.01" placeholder="0,00" value={counted}
            onChange={(e) => setCounted(e.target.value)} autoFocus
            className="w-full px-4 py-3 text-lg font-bold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {counted !== '' && (
          <div className={`rounded-xl p-4 mb-5 border ${hasDiff ? 'bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800/50' : 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800/50'}`}>
            {hasDiff ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <MdWarningAmber className="text-red-500 text-lg flex-none" />
                  <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">¡Discrepancia detectada!</p>
                </div>
                <p className={`text-xl font-bold ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{diff > 0 ? '+' : ''}{fmt(diff)}</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{diff > 0 ? 'Hay más efectivo del esperado' : 'Falta efectivo respecto al sistema'}</p>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <MdCheckCircle className="text-emerald-500 text-lg flex-none" />
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">¡Cuadra perfectamente! El efectivo coincide con el sistema.</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel} disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm border-2 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={() => onConfirm({ counted: parsedCounted, diff })} disabled={isLoading || counted === ''}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <><Spinner /> Procesando...</> : <><MdLock className="text-lg" /> Confirmar Arqueo</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Panel fullscreen del Historial ─────────────────────────────────────────
function HistoryPanel({ groups, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-neutral-50 dark:bg-caixeta-dark animate-in slide-in-from-bottom-8 duration-300">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-5 py-4 bg-white dark:bg-caixeta-card border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <MdHistory className="text-neutral-600 dark:text-neutral-300 text-xl" />
          </div>
          <div>
            <h2 className="font-bold text-neutral-800 dark:text-neutral-100 text-base">Historial de Caja</h2>
            <p className="text-xs text-neutral-500">Todos los movimientos registrados</p>
          </div>
        </div>
        <button onClick={onClose}
          className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
          <MdClose className="text-2xl" />
        </button>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-8 py-6 max-w-3xl w-full mx-auto">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
            <MdHistory className="text-6xl mb-4 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm">No hay movimientos registrados aún</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(({ day, items }) => {
              const dayTotal = items.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);
              return (
                <div key={day}>
                  {/* Cabecera del día */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        {fmtDayLabel(day)}
                      </span>
                      <span className="text-[10px] text-neutral-400">{items.length} movimiento{items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <span className={`text-xs font-bold ${dayTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {dayTotal >= 0 ? '+' : ''}{fmt(dayTotal)}
                    </span>
                  </div>
                  {/* Items del día */}
                  <div className="bg-white dark:bg-caixeta-card rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                    {items.map((item, i) => {
                      const amount = parseFloat(item.amount);
                      const isPos = amount > 0;
                      return (
                        <div key={i} className="flex items-center gap-4 px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <div className={`flex-none w-8 h-8 rounded-full flex items-center justify-center ${isPos ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                            {isPos
                              ? <MdArrowUpward className="text-emerald-600 dark:text-emerald-400" />
                              : <MdArrowDownward className="text-red-600 dark:text-red-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100 truncate">{item.reason || '—'}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1 text-xs text-neutral-400">
                                <MdAccessTime className="text-xs" />
                                {item.created_at ? new Date(item.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                              {item.user_name && (
                                <span className="flex items-center gap-1 text-xs text-neutral-400">
                                  <MdPerson className="text-xs" />{item.user_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className={`flex-none text-sm font-bold ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isPos ? '+' : ''}{fmt(amount)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Custom Tooltip del Gráfico ───────────────────────────────────────────────
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-3 text-sm min-w-[180px]">
        <p className="font-bold text-neutral-700 dark:text-neutral-200 mb-2 border-b border-neutral-100 dark:border-neutral-700 pb-1.5">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
              <span className="inline-block w-2 h-2 rounded-full flex-none" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="font-bold" style={{ color: entry.color }}>{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Skeleton del Gráfico ─────────────────────────────────────────────────────
const ChartSkeleton = () => (
  <div className="h-72 w-full animate-pulse flex flex-col justify-end gap-2 pt-8">
    <div className="flex items-end gap-2 h-full">
      {[60, 40, 75, 50, 90, 65, 45, 80, 55, 70, 35, 85].map((h, i) => (
        <div key={i} className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-t-lg" style={{ height: `${h}%` }} />
      ))}
    </div>
    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
  </div>
);

// ─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══
//   COMPONENTE PRINCIPAL: CAJA
// ─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══─══
export default function Caja() {
  const [cashBalance, setCashBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [rawChartData, setRawChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  // null | 'up' | 'down' — para la animación flash del saldo
  const [balanceFlash, setBalanceFlash] = useState(null);

  // Modales y Panel
  const [movementModal, setMovementModal] = useState(null);
  const [showArqueoModal, setShowArqueoModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [toast, setToast] = useState(null);

  // Número de días del historial visibles en modo resumido
  const PREVIEW_DAYS = 2;

  // ── Selector de fechas (igual que en Bancos) ──
  const [filter, setFilter] = useState('month'); // 'week' | 'month' | 'year' | 'custom'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customRange, setCustomRange] = useState({
    start: subDays(new Date(), 29),
    end: new Date(),
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(getYear(new Date()));
  const pickerRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Cerrar picker al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Calcular rango de fechas según filtro ──
  const dateRange = useMemo(() => {
    const today = new Date();
    if (filter === 'custom') return { start: customRange.start, end: customRange.end };
    if (filter === 'week') return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
    if (filter === 'year') return { start: startOfYear(selectedDate), end: endOfYear(selectedDate) };
    return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) }; // month
  }, [filter, selectedDate, customRange]);

  // ── Labels para la navegación ──
  const displayPeriodText = useMemo(() => {
    if (filter === 'year') return format(selectedDate, 'yyyy');
    if (filter === 'month') return format(selectedDate, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase());
    if (filter === 'custom') return 'Rango personalizado';
    const s = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const e = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return `${format(s, 'd MMM', { locale: es })} – ${format(e, 'd MMM', { locale: es })}`;
  }, [filter, selectedDate]);

  const today = new Date();
  const disablePrev = useMemo(() => {
    if (filter === 'year') return false;
    if (filter === 'month') return startOfMonth(selectedDate) <= startOfMonth(new Date(2020, 0, 1));
    return startOfWeek(selectedDate, { weekStartsOn: 1 }) <= startOfWeek(new Date(2020, 0, 1), { weekStartsOn: 1 });
  }, [filter, selectedDate]);

  const disableNext = useMemo(() => {
    if (filter === 'year') return startOfYear(selectedDate) >= startOfYear(today);
    if (filter === 'month') return startOfMonth(selectedDate) >= startOfMonth(today);
    return startOfWeek(selectedDate, { weekStartsOn: 1 }) >= startOfWeek(today, { weekStartsOn: 1 });
  }, [filter, selectedDate, today]);

  const handlePrev = () => {
    if (filter === 'year') setSelectedDate(d => subYears(d, 1));
    else if (filter === 'month') setSelectedDate(d => subMonths(d, 1));
    else setSelectedDate(d => subWeeks(d, 1));
  };
  const handleNext = () => {
    if (filter === 'year') setSelectedDate(d => addYears(d, 1));
    else if (filter === 'month') setSelectedDate(d => addMonths(d, 1));
    else setSelectedDate(d => addWeeks(d, 1));
  };

  // ─── Fetch de datos ────────────────────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/cash/status`);
      if (res.ok) {
        const data = await res.json();
        setCashBalance(parseFloat(data?.current_cash_balance ?? 0));
      }
    } catch (err) { console.error('Error cash status:', err); }
  }, [apiUrl]);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/cash/history`);
      if (res.ok) setHistory(await res.json());
    } catch (err) { console.error('Error cash history:', err); }
  }, [apiUrl]);

  const refreshChart = useCallback(async (start, end) => {
    try {
      setIsChartLoading(true);
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      const res = await fetch(`${apiUrl}/api/cash/chart?startDate=${startStr}&endDate=${endStr}`);
      if (res.ok) {
        const raw = await res.json();
        setRawChartData(raw);
      }
    } catch (err) { console.error('Error cash chart:', err); }
    finally { setIsChartLoading(false); }
  }, [apiUrl]);

  // Carga inicial
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([refreshStatus(), refreshHistory(), refreshChart(dateRange.start, dateRange.end)]);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refrescar gráfico al cambiar rango
  useEffect(() => {
    refreshChart(dateRange.start, dateRange.end);
  }, [dateRange, refreshChart]);

  // ── Construir datos del gráfico con días sin datos = 0 ──
  const chartData = useMemo(() => {
    const byDate = {};
    rawChartData.forEach(r => {
      const key = r.fecha ? r.fecha.split('T')[0] : null;
      if (key) byDate[key] = {
        efectivo: parseFloat(r.efectivo) || 0,
        tarjeta: parseFloat(r.tarjeta) || 0,
      };
    });

    const { start, end } = dateRange;
    const cappedEnd = end > today ? today : end;
    const todayKey = format(today, 'yyyy-MM-dd');
    // cashBalance nunca puede ser negativo (mínimo 0)
    const safeCashBalance = Math.max(0, cashBalance ?? 0);

    if (filter === 'year') {
      const months = eachMonthOfInterval({ start, end: cappedEnd > end ? end : cappedEnd });
      const currentMonthKey = format(today, 'yyyy-MM');
      return months.map(monthDate => {
        const monthKey = format(monthDate, 'yyyy-MM');
        const isCurrentMonth = monthKey === currentMonthKey;
        const daysInM = eachDayOfInterval({
          start: startOfMonth(monthDate),
          end: endOfMonth(monthDate) > cappedEnd ? cappedEnd : endOfMonth(monthDate),
        });
        let cajaFisica = 0, tarjeta = 0;
        daysInM.forEach(d => {
          const key = format(d, 'yyyy-MM-dd');
          const src = byDate[key];
          if (src) {
            cajaFisica += (key === todayKey ? safeCashBalance : src.efectivo);
            tarjeta += src.tarjeta;
          } else if (key === todayKey) {
            cajaFisica += safeCashBalance;
          }
        });
        return {
          fecha: format(monthDate, 'MMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase()),
          'Caja Física': cajaFisica,
          Tarjeta: tarjeta,
          Total: cajaFisica + tarjeta,
        };
      });
    }

    const days = eachDayOfInterval({
      start: startOfDay(start),
      end: startOfDay(cappedEnd) > startOfDay(end) ? startOfDay(end) : startOfDay(cappedEnd),
    });
    return days.map(dayDate => {
      const key = format(dayDate, 'yyyy-MM-dd');
      const isToday = key === todayKey;
      const src = byDate[key] || { efectivo: 0, tarjeta: 0 };
      const cajaFisica = isToday ? safeCashBalance : src.efectivo;
      const tarjeta = src.tarjeta;
      return {
        fecha: format(dayDate, 'dd MMM', { locale: es }),
        'Caja Física': cajaFisica,
        Tarjeta: tarjeta,
        Total: cajaFisica + tarjeta,
      };
    });
  }, [rawChartData, dateRange, filter, today, cashBalance]);

  // ─── API: Registrar movimiento ─────────────────────────────────────────────
  const handleMovement = async ({ amount, reason, type }) => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setIsActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/cash/movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason, type, userId: userData.id }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Error ${res.status}`); }
      setMovementModal(null);
      setToast({ message: `✓ ${type === 'in' ? 'Ingreso' : 'Gasto'} de ${fmt(amount)} registrado.`, type: 'success' });
      // Flash visual en el saldo + refresh completo incluyendo gráfico
      setBalanceFlash(type === 'in' ? 'up' : 'down');
      setTimeout(() => setBalanceFlash(null), 900);
      await Promise.all([refreshStatus(), refreshHistory(), refreshChart(dateRange.start, dateRange.end)]);
    } catch (err) {
      setToast({ message: `⚠️ ${err.message}`, type: 'error' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // ─── API: Cierre / Arqueo ──────────────────────────────────────────────────
  const handleArqueo = async ({ counted, diff }) => {
    setIsActionLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      // Snapshot del cierre: guardamos el estado actual como registro del día
      // El saldo físico al cierre + ventas con tarjeta de Factusol de hoy
      const todayFactusol = rawChartData.find(r => r.fecha && r.fecha.split('T')[0] === format(today, 'yyyy-MM-dd'));
      const todayCard = parseFloat(todayFactusol?.tarjeta) || 0;
      await fetch(`${apiUrl}/api/cash/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalCash: Math.max(0, cashBalance ?? 0),
          totalCard: todayCard,
          countedAmount: counted,
          userId: userData.id,
        }),
      }).catch(() => {}); // Si el endpoint aún no existe, ignoramos silenciosamente

      // Si hay discrepancia, la registramos como movimiento de ajuste
      if (Math.abs(diff) >= 0.01) {
        await fetch(`${apiUrl}/api/cash/movement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.abs(diff),
            reason: `Ajuste por cierre (discrepancia ${diff > 0 ? 'sobrante' : 'faltante'})`,
            type: diff > 0 ? 'in' : 'out',
            userId: userData.id,
          }),
        });
      }
      setShowArqueoModal(false);
      setToast({
        message: Math.abs(diff) < 0.01
          ? '✓ Cierre realizado. Caja cuadrada perfectamente.'
          : `⚠️ Cierre registrado con discrepancia de ${fmt(Math.abs(diff))}.`,
        type: Math.abs(diff) < 0.01 ? 'success' : 'error',
      });
      // Refresh completo incluyendo gráfico tras el cierre
      await Promise.all([refreshStatus(), refreshHistory(), refreshChart(dateRange.start, dateRange.end)]);
    } catch (err) {
      setToast({ message: `⚠️ ${err.message}`, type: 'error' });
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="w-12 h-12 border-4 border-neutral-200 dark:border-neutral-800 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-neutral-600 dark:text-neutral-300 font-medium">Cargando datos de caja...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0 gap-5 animate-in fade-in duration-500 overflow-y-auto scrollbar-thin pb-6">

      {toast && <StatusToast config={toast} onDone={() => setToast(null)} />}
      {movementModal && (
        <MovementModal
          type={movementModal}
          isLoading={isActionLoading}
          maxAmount={movementModal === 'out' ? (cashBalance ?? 0) : undefined}
          onConfirm={handleMovement}
          onCancel={() => !isActionLoading && setMovementModal(null)}
        />
      )}
      {showArqueoModal && (
        <ArqueoModal currentBalance={cashBalance} isLoading={isActionLoading}
          onConfirm={handleArqueo} onCancel={() => !isActionLoading && setShowArqueoModal(false)} />
      )}

      {/* ── Card principal: Efectivo en Caja ── */}
      <div className="relative flex-none rounded-2xl overflow-hidden shadow-xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl" />
        </div>
        <div className="relative p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MdAccountBalanceWallet className="text-emerald-400 text-2xl" />
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Efectivo Físico en Caja</p>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-emerald-400">Caja Abierta</span>
              </div>
            </div>
            <button onClick={() => setShowArqueoModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition-all backdrop-blur-sm">
              <MdLock className="text-lg" /> Realizar Cierre
            </button>
          </div>
          <div className="mb-8">
            <p className={`text-5xl md:text-6xl font-black tracking-tight transition-colors duration-300 ${balanceFlash === 'up' ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]' : balanceFlash === 'down' ? 'text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]' : 'text-white'}`}>
              {cashBalance === null ? '—' : fmt(cashBalance)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button id="btn-ingreso-caja" onClick={() => setMovementModal('in')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all active:scale-95">
              <MdAdd className="text-xl" /> Ingreso
            </button>
            <button id="btn-gasto-caja" onClick={() => setMovementModal('out')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all active:scale-95">
              <MdRemove className="text-xl" /> Gasto / Salida
            </button>
          </div>
        </div>
      </div>

      {/* ── Gráfico: Rentabilidad ── */}
      <div className="flex-none bg-white dark:bg-caixeta-card rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 md:p-6">
        {/* Header del gráfico con selector de fechas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <MdOutlinePointOfSale className="text-blue-500 text-xl" />
              <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">Rentabilidad / Ventas en Caja</h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Ventas en efectivo y tarjeta por período (Factusol)</p>
          </div>

          {/* Controles de rango — idénticos a Bancos */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Navegador de período */}
            <div className="relative flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 px-2 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700" ref={pickerRef}>
              {filter === 'custom' ? (
                <div className="flex flex-col gap-1 px-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 font-medium w-10">Desde:</span>
                    <input type="date"
                      value={format(customRange.start, 'yyyy-MM-dd')}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => { if (e.target.value) setCustomRange(p => ({ ...p, start: parseISO(e.target.value) })); }}
                      className="bg-transparent border-none text-neutral-800 dark:text-white focus:ring-0 cursor-pointer font-semibold outline-none text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 font-medium w-10">Hasta:</span>
                    <input type="date"
                      value={format(customRange.end, 'yyyy-MM-dd')}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => { if (e.target.value) setCustomRange(p => ({ ...p, end: parseISO(e.target.value) })); }}
                      className="bg-transparent border-none text-neutral-800 dark:text-white focus:ring-0 cursor-pointer font-semibold outline-none text-xs"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <button onClick={handlePrev} disabled={disablePrev}
                    className={`p-1 rounded-lg transition-colors ${disablePrev ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>
                    <MdChevronLeft className="text-xl" />
                  </button>
                  <button
                    onClick={() => { setPickerOpen(!pickerOpen); setPickerYear(getYear(selectedDate)); }}
                    className="px-2 py-1 text-xs font-semibold text-neutral-800 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors min-w-[110px] text-center">
                    {displayPeriodText}
                  </button>
                  <button onClick={handleNext} disabled={disableNext}
                    className={`p-1 rounded-lg transition-colors ${disableNext ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>
                    <MdChevronRight className="text-xl" />
                  </button>
                </>
              )}

              {/* Popup Picker */}
              {pickerOpen && filter !== 'custom' && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-4 z-50 min-w-[260px] animate-in fade-in slide-in-from-top-2 duration-200">
                  {filter === 'year' && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Seleccionar Año</p>
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 6 }, (_, i) => getYear(today) - 5 + i).map(y => (
                          <button key={y}
                            onClick={() => { setSelectedDate(setYear(selectedDate, y)); setPickerOpen(false); }}
                            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${getYear(selectedDate) === y ? 'bg-neutral-800 dark:bg-white text-white dark:text-neutral-800 shadow-md' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                            {y}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {filter === 'month' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <button onClick={() => setPickerYear(y => y - 1)}
                          className="p-1 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                          <MdChevronLeft className="text-lg" />
                        </button>
                        <span className="text-sm font-bold text-neutral-800 dark:text-white">{pickerYear}</span>
                        <button onClick={() => setPickerYear(y => y + 1)} disabled={pickerYear >= getYear(today)}
                          className={`p-1 rounded-lg transition-colors ${pickerYear >= getYear(today) ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                          <MdChevronRight className="text-lg" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 12 }, (_, i) => {
                          const md = new Date(pickerYear, i, 1);
                          const isFuture = md > today;
                          const isSel = getYear(selectedDate) === pickerYear && getMonth(selectedDate) === i;
                          return (
                            <button key={i} disabled={isFuture}
                              onClick={() => { setSelectedDate(new Date(pickerYear, i, 1)); setPickerOpen(false); }}
                              className={`px-2 py-2 rounded-xl text-xs font-semibold transition-all ${isSel ? 'bg-neutral-800 dark:bg-white text-white dark:text-neutral-800 shadow-md' : isFuture ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                              {format(md, 'MMM', { locale: es }).toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {filter === 'week' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <button onClick={() => {
                          const prev = pickerYear * 12 + getMonth(selectedDate) - 1;
                          setPickerYear(Math.floor(prev / 12));
                          setSelectedDate(new Date(Math.floor(prev / 12), prev % 12, 1));
                        }} className="p-1 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                          <MdChevronLeft className="text-lg" />
                        </button>
                        <span className="text-sm font-bold text-neutral-800 dark:text-white">
                          {format(new Date(pickerYear, getMonth(selectedDate), 1), 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                        </span>
                        <button onClick={() => {
                          const next = pickerYear * 12 + getMonth(selectedDate) + 1;
                          setPickerYear(Math.floor(next / 12));
                          setSelectedDate(new Date(Math.floor(next / 12), next % 12, 1));
                        }} className="p-1 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                          <MdChevronRight className="text-lg" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-0.5 text-center">
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                          <div key={d} className="text-[10px] font-bold text-neutral-400 py-1">{d}</div>
                        ))}
                        {(() => {
                          const viewMonth = getMonth(selectedDate);
                          const viewYear = pickerYear;
                          const firstDay = new Date(viewYear, viewMonth, 1);
                          const daysInM = getDaysInMonth(firstDay);
                          const offset = (getDay(firstDay) + 6) % 7;
                          const selWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
                          const selWeekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
                          const cells = [];
                          for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
                          for (let day = 1; day <= daysInM; day++) {
                            const dd = new Date(viewYear, viewMonth, day);
                            const inWeek = dd >= selWeekStart && dd <= selWeekEnd;
                            const isToday = format(dd, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                            cells.push(
                              <button key={day} onClick={() => { setSelectedDate(dd); setPickerOpen(false); }}
                                className={`py-1.5 rounded-lg text-xs font-medium transition-all ${inWeek ? 'bg-neutral-800 dark:bg-white text-white dark:text-neutral-800 shadow-sm' : isToday ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 font-bold' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                                {day}
                              </button>
                            );
                          }
                          return cells;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botones de filtro (Semana / Mes / Año / Personalizado) */}
            <div className="flex bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700">
              {[
                { key: 'week', label: 'Semana' },
                { key: 'month', label: 'Mes' },
                { key: 'year', label: 'Año' },
                { key: 'custom', label: 'Personalizado' },
              ].map(({ key, label }) => (
                <button key={key}
                  onClick={() => { setFilter(key); if (key !== 'custom') setSelectedDate(new Date()); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === key ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-800 dark:text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico */}
        {isChartLoading ? (
          <ChartSkeleton />
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <MdOutlinePointOfSale className="text-5xl mb-3 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm">Sin datos de ventas para este período</p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEfectivo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradTarjeta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} dy={6} />
                <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={38} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="Caja Física" stroke="#10b981" strokeWidth={2} fill="url(#gradEfectivo)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="Tarjeta" stroke="#3b82f6" strokeWidth={2} fill="url(#gradTarjeta)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="Total" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gradTotal)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Historial de Caja ── */}
      {(() => {
        const allGroups = groupByDay(history);
        const previewGroups = allGroups.slice(0, PREVIEW_DAYS);
        const hasMore = allGroups.length > PREVIEW_DAYS;

        return (
          <div className="flex-none bg-white dark:bg-caixeta-card rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            {/* Cabecera */}
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <MdHistory className="text-neutral-500 text-xl" />
                  <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">Historial de Caja</h2>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {history.length > 0 ? `${history.length} movimiento${history.length !== 1 ? 's' : ''} registrado${history.length !== 1 ? 's' : ''}` : 'Sin movimientos aún'}
                </p>
              </div>
              {history.length > 0 && (
                <button
                  onClick={() => setShowHistoryPanel(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-all">
                  <MdOpenInFull className="text-sm" /> Ver todo
                </button>
              )}
            </div>

            {/* Contenido resumido: últimos PREVIEW_DAYS días */}
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-neutral-400">
                <MdHistory className="text-5xl mb-3 text-neutral-300 dark:text-neutral-600" />
                <p className="text-sm">No hay movimientos registrados aún</p>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {previewGroups.map(({ day, items }) => {
                    const dayTotal = items.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);
                    return (
                      <div key={day}>
                        {/* Separador de día */}
                        <div className="flex items-center justify-between px-5 py-2 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-100 dark:border-neutral-800">
                          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                            {fmtDayLabel(day)}
                          </span>
                          <span className={`text-xs font-bold ${dayTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {dayTotal >= 0 ? '+' : ''}{fmt(dayTotal)}
                          </span>
                        </div>
                        {/* Movimientos del día */}
                        {items.map((item, i) => {
                          const amount = parseFloat(item.amount);
                          const isPos = amount > 0;
                          return (
                            <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
                              <div className={`flex-none w-8 h-8 rounded-full flex items-center justify-center ${isPos ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                {isPos
                                  ? <MdArrowUpward className="text-emerald-600 dark:text-emerald-400" />
                                  : <MdArrowDownward className="text-red-600 dark:text-red-400" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100 truncate">{item.reason || '—'}</p>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="flex items-center gap-1 text-xs text-neutral-400">
                                    <MdAccessTime className="text-xs" />
                                    {item.created_at ? new Date(item.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                  </span>
                                  {item.user_name && (
                                    <span className="flex items-center gap-1 text-xs text-neutral-400">
                                      <MdPerson className="text-xs" />{item.user_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className={`flex-none text-sm font-bold ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {isPos ? '+' : ''}{fmt(amount)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Botón Ver más */}
                {hasMore && (
                  <button
                    onClick={() => setShowHistoryPanel(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border-t border-neutral-200 dark:border-neutral-800">
                    <MdExpandMore className="text-lg" />
                    Ver {allGroups.length - PREVIEW_DAYS} día{allGroups.length - PREVIEW_DAYS !== 1 ? 's' : ''} más
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Panel fullscreen del Historial ── */}
      {showHistoryPanel && (
        <HistoryPanel
          groups={groupByDay(history)}
          onClose={() => setShowHistoryPanel(false)}
        />
      )}
    </div>
  );
}
