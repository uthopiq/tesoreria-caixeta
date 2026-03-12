import React, { useState, useMemo, useEffect } from 'react';
import { 
  MdCheckCircle, 
  MdSearch, 
  MdOutlineReceipt, 
  MdArrowBack, 
  MdSmartToy, 
  MdClose,
  MdOutlineAccountBalance,
  MdInfoOutline
} from 'react-icons/md';

// Formateador de moneda
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '';
  return new Intl.NumberFormat('es-ES', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(amount);
};

// Formateador de fecha
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export default function Cobros() {
  const [receipts, setReceipts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  
  // Estado para la búsqueda manual de facturas
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  // Carga inicial de datos desde el backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        const [receiptsRes, invoicesRes] = await Promise.all([
          fetch(`${apiUrl}/api/transactions/pending`),
          fetch(`${apiUrl}/api/invoices/pending`)
        ]);

        if (receiptsRes.ok) {
          const receiptsData = await receiptsRes.json();
          setReceipts(receiptsData);
        }
        
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          setInvoices(invoicesData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Derivados
  const activeReceipt = receipts.find(r => r.id === activeReceiptId);
  const suggestedInvoice = activeReceipt?.status === 'suggested' 
    ? {
        id: activeReceipt.invoice_id,
        client_name: activeReceipt.client_name,
        pending_amount: activeReceipt.pending_amount,
        factusol_number: activeReceipt.factusol_number,
        date: invoices.find(i => i.id === activeReceipt.invoice_id)?.date // Opcional, por si queremos mostrar la fecha
      } 
    : null;

  // Filtrar facturas para el buscador manual
  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices;
    const lower = searchTerm.toLowerCase();
    return invoices.filter(inv => 
      inv.client?.toLowerCase().includes(lower) || 
      inv.factusol_number?.toLowerCase().includes(lower) ||
      inv.id?.toString().includes(lower)
    );
  }, [searchTerm, invoices]);

  // Sugerencias primero
  const sortedReceipts = useMemo(() => {
    return [...receipts].sort((a, b) => {
      if (a.status === 'suggested' && b.status !== 'suggested') return -1;
      if (a.status !== 'suggested' && b.status === 'suggested') return 1;
      return new Date(b.value_date || 0) - new Date(a.value_date || 0);
    });
  }, [receipts]);

  // Al seleccionar un movimiento nuevo
  const handleSelectReceipt = (e, receipt) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!receipt) {
      setActiveReceiptId(null);
      setSelectedInvoiceId(null);
      return;
    }

    setActiveReceiptId(receipt.id);
    setSearchTerm(''); // Reset buscador
    if (receipt.invoice_id) {
      setSelectedInvoiceId(receipt.invoice_id); // Auto-seleccionar sugerida
    } else {
      setSelectedInvoiceId(null);
    }
  };

  const handleBackToList = (e) => {
    if (e) e.stopPropagation();
    setActiveReceiptId(null);
  };

  // Acciones
  const handleConfirmReconciliation = (e) => {
    if (e) e.stopPropagation();
    if (!selectedInvoiceId) return;
    
    // Aquí iría la llamada real POST o PUT a la API
    alert(`¡Conciliado con éxito! Movimiento ${activeReceipt.id} con Factura ${selectedInvoiceId}`);
    
    // Simular que desaparece de la lista
    setReceipts(prev => prev.filter(r => r.id !== activeReceipt.id));
    setActiveReceiptId(null);
  };

  const handleIgnoreReceipt = (e) => {
    if (e) e.stopPropagation();
    
    // Aquí iría la llamada real a la API para ignorarlo
    alert(`Movimiento ${activeReceipt.id} registrado sin factura / ignorado.`);
    
    setReceipts(prev => prev.filter(r => r.id !== activeReceipt.id));
    setActiveReceiptId(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-500 w-full animate-in fade-in duration-300">
        <div className="w-12 h-12 border-4 border-neutral-200 dark:border-neutral-800 border-t-caixeta-red rounded-full animate-spin mb-4"></div>
        <p className="text-lg font-medium text-neutral-700 dark:text-neutral-300">Cargando datos bancarios...</p>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] lg:h-[calc(100vh-2rem)] overflow-hidden bg-neutral-50 dark:bg-caixeta-dark rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 animate-in fade-in duration-500"
      onClick={(e) => handleSelectReceipt(null, null)} // Quitar seleccion si se hace clic fuera
    >
      
      {/* COLUMNA IZQUIERDA: Lista (Master) */}
      <div 
        className={`w-full lg:w-1/3 xl:w-2/5 border-r border-neutral-200 dark:border-neutral-800 flex flex-col ${activeReceiptId ? 'hidden lg:flex' : 'flex'}`}
        onClick={(e) => e.stopPropagation()} // Detener clic para no limpiar seleccion en caso de hacer clic en la columna pero sin tarjeta
      >
        <div 
          className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-caixeta-card"
          onClick={() => handleSelectReceipt(null, null)} // También limpiar si hace clic en la cabecera
        >
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <MdOutlineAccountBalance className="text-caixeta-red" />
            Movimientos Bancarios
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {receipts.length} pendientes de conciliar
          </p>
        </div>

        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50 dark:bg-caixeta-dark"
          onClick={() => handleSelectReceipt(null, null)} // Limpiar al hacer clic en el espacio vacío entre las cards
        >
          {sortedReceipts.length === 0 && (
            <div className="text-center text-neutral-500 dark:text-neutral-400 py-10">
              <MdCheckCircle className="mx-auto text-4xl mb-2 text-green-500" />
              <p>Todo está conciliado</p>
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
                  cursor-pointer transition-all duration-200 relative overflow-hidden rounded-xl p-4 border block text-left
                  ${isSelected ? 'ring-2 ring-caixeta-red shadow-md' : 'hover:shadow-sm'}
                  ${isSuggested 
                    ? (isSelected ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-neutral-800') 
                    : (isSelected ? 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600' : 'bg-white dark:bg-caixeta-card border-neutral-200 dark:border-neutral-800')}
                `}
              >
                {/* Indicador visual de sugerencia en el borde izquierdo */}
                {isSuggested && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500"></div>
                )}
                
                <div className="flex justify-between items-start mb-2 pl-1">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {formatDate(receipt.value_date)}
                  </span>
                  {isSuggested && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      <MdSmartToy /> Sugerencia: {receipt.match_confidence}%
                    </span>
                  )}
                </div>
                
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 pl-1 line-clamp-1" title={receipt.concept}>
                  {receipt.concept}
                </h3>
                
                <div className="mt-2 text-right">
                  <span className={`text-lg font-bold ${receipt.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-neutral-800 dark:text-white'}`}>
                    {receipt.amount > 0 && '+'}{formatCurrency(receipt.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* COLUMNA DERECHA: Detalle (Detail) */}
      <div 
        className={`w-full lg:w-2/3 xl:w-3/5 flex flex-col bg-white dark:bg-caixeta-card relative ${!activeReceiptId ? 'hidden lg:flex' : 'flex'}`}
        onClick={(e) => e.stopPropagation()} // Prevenir que clics dentro del panel limpien la seleccion
      >
        
        {/* Empty State */}
        {!activeReceipt && (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 p-8 text-center bg-neutral-50/50 dark:bg-neutral-900/20">
            <div className="w-24 h-24 mb-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <MdOutlineReceipt className="text-4xl text-neutral-300 dark:text-neutral-600" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Ningún movimiento seleccionado</h3>
            <p className="max-w-md">Selecciona un ingreso de la lista izquierda para comenzar la conciliación con tus facturas o registrarlo suelto.</p>
          </div>
        )}

        {/* Detalle Activo */}
        {activeReceipt && (
          <>
            {/* Header móvil: botón volver */}
            <div className="lg:hidden p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-caixeta-dark">
              <button 
                onClick={handleBackToList}
                className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-caixeta-red transition-colors w-fit"
              >
                <MdArrowBack className="text-lg" /> Volver a los movimientos
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              
              {/* Bloque: Info del Movimiento Bancario */}
              <div className="bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl p-6 mb-8 text-center shadow-inner border border-neutral-200 dark:border-neutral-800">
                <span className="inline-block px-3 py-1 bg-neutral-200 dark:bg-neutral-700/50 rounded-full text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">
                  Movimiento Bancario
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-white mb-2">
                  {formatCurrency(activeReceipt.amount)}
                </h2>
                <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-1">{activeReceipt.concept}</p>
                <p className="text-sm text-neutral-400">{formatDate(activeReceipt.value_date)}</p>
              </div>

              {/* Bloque: Factura Sugerida (si la hay) */}
              {suggestedInvoice && (
                <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-green-600 dark:text-green-500 flex items-center gap-2 mb-3">
                    <MdSmartToy /> Sugerencia de la IA
                  </h3>
                  
                  <div 
                    onClick={() => setSelectedInvoiceId(suggestedInvoice.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedInvoiceId === suggestedInvoice.id 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/10 shadow-sm' 
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-green-500/50 bg-white dark:bg-neutral-800/30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-800 dark:text-neutral-100">{suggestedInvoice.client_name}</span>
                          <span className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-300">
                            {suggestedInvoice.factusol_number || suggestedInvoice.id}
                          </span>
                        </div>
                        {suggestedInvoice.date && (
                          <p className="text-sm text-neutral-500 mt-1">
                            Fecha Factura: {formatDate(suggestedInvoice.date)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="block text-sm text-neutral-500 dark:text-neutral-400">Pte. de cobro</span>
                        <span className="block font-bold text-neutral-800 dark:text-neutral-100">
                          {formatCurrency(suggestedInvoice.pending_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bloque: Buscador manual de otras facturas */}
              <div className="flex flex-col flex-1 h-full min-h-[300px]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3 flex items-center gap-2">
                  <MdOutlineReceipt /> {suggestedInvoice ? 'Otras facturas pendientes' : 'Buscar factura pendiente'}
                </h3>
                
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MdSearch className="text-neutral-400 text-xl" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por cliente o número de factura..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-caixeta-red focus:border-transparent outline-none transition-all placeholder:text-neutral-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-200"
                    >
                      <MdClose />
                    </button>
                  )}
                </div>

                {/* Lista de facturas manuales */}
                <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6">
                  {filteredInvoices.map(invoice => (
                    // Ocultamos la sugerida de la lista general para no duplicar si no estamos buscando
                    (!suggestedInvoice || invoice.id !== suggestedInvoice.id || searchTerm) && (
                      <div 
                        key={invoice.id}
                        onClick={() => setSelectedInvoiceId(invoice.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                          selectedInvoiceId === invoice.id 
                            ? 'border-caixeta-red bg-red-50 dark:bg-caixeta-red/10' 
                            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-neutral-800 dark:text-neutral-200">{invoice.client}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {invoice.factusol_number || invoice.id} {invoice.date ? `• ${formatDate(invoice.date)}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">{formatCurrency(invoice.pending_amount)}</p>
                        </div>
                        {selectedInvoiceId === invoice.id && (
                          <div className="ml-3 text-caixeta-red">
                            <MdCheckCircle className="text-xl" />
                          </div>
                        )}
                      </div>
                    )
                  ))}
                  
                  {filteredInvoices.length === 0 && (
                    <div className="text-center py-6 text-neutral-500">
                      No se encontraron facturas pendientes que coincidan.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bloque: Footer Actions */}
            <div className="p-4 md:p-6 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-caixeta-dark flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirmReconciliation}
                disabled={!selectedInvoiceId}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold transition-all ${
                  selectedInvoiceId
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                }`}
              >
                <MdCheckCircle className="text-xl" /> Confirmar Conciliación
              </button>
              
              <button
                onClick={handleIgnoreReceipt}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium border-2 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Registrar sin Factura / Ignorar
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
