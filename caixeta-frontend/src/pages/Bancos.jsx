import { useEffect, useState, useMemo, useRef } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    format, parseISO, startOfYear, startOfMonth, startOfWeek,
    endOfYear, endOfMonth, endOfWeek,
    eachDayOfInterval, eachMonthOfInterval,
    subDays, startOfDay, addYears, addMonths, addWeeks, subYears, subMonths, subWeeks,
    getYear, getMonth, getDaysInMonth, getDay, setYear, setMonth as setDateMonth
} from 'date-fns';
import { es } from 'date-fns/locale';
import { MdChevronLeft, MdChevronRight, MdPictureAsPdf, MdTableView } from 'react-icons/md';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Bancos() {
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('month'); // 'year', 'month', 'week', 'custom'
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [customRange, setCustomRange] = useState({
        start: subDays(new Date(), 14),
        end: new Date()
    });
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerYear, setPickerYear] = useState(getYear(new Date()));
    const pickerRef = useRef(null);
    const hiddenPrintRef = useRef(null); // Reference for the hidden official layout

    const [isExporting, setIsExporting] = useState(false);
    const [exportType, setExportType] = useState(null); // 'pdf' or 'csv'
    
    // Read global export settings from localStorage
    const exportSettings = useMemo(() => {
        const saved = localStorage.getItem('caixeta_export_settings') || localStorage.getItem('caixeta_pdf_settings');
        return saved ? JSON.parse(saved) : { orientation: 'l', format: 'a4', csvSeparator: ';' };
    }, []);

    // Close picker on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/banks-history`);
                if (!response.ok) throw new Error('Error al obtener historial de bancos');
                const data = await response.json();
                setHistoryData(data);
            } catch (error) {
                console.error("Error cargando historial de bancos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    // 1. Process data: Group all snapshots by date
    const dailyTotals = useMemo(() => {
        if (!historyData.length) return {};

        // Group by day (YYYY-MM-DD)
        const byDate = {};
        historyData.forEach(item => {
            const dateStr = item.fecha_registro.split('T')[0];
            if (!byDate[dateStr]) {
                byDate[dateStr] = {
                    date: dateStr,
                    total: 0,
                    banks: {}
                };
            }
            const saldo = Number(item.saldo) || 0;
            byDate[dateStr].total += saldo;
            byDate[dateStr].banks[item.banco] = {
                saldo: saldo,
                moneda: item.moneda || 'EUR'
            };
        });

        // To handle missing days, we carry over the previous day's balance
        const sortedDates = Object.keys(byDate).sort();
        if (sortedDates.length === 0) return {};

        const minDate = parseISO(sortedDates[0]);
        const maxDate = new Date(); // Or parseISO(sortedDates[sortedDates.length - 1]) 

        const allDaysObj = {};
        let lastKnownBanks = {};
        let lastKnownTotal = 0;

        const allDays = eachDayOfInterval({ start: minDate, end: maxDate });
        allDays.forEach(dayDate => {
            const dateStr = format(dayDate, 'yyyy-MM-dd');
            if (byDate[dateStr]) {
                lastKnownBanks = { ...lastKnownBanks, ...byDate[dateStr].banks };
                lastKnownTotal = Object.values(lastKnownBanks).reduce((sum, b) => sum + b.saldo, 0);
            }
            allDaysObj[dateStr] = {
                date: dateStr,
                total: lastKnownTotal,
                banks: { ...lastKnownBanks }
            };
        });

        return allDaysObj;
    }, [historyData]);

    // Calcular límites de fechas basados en los datos
    const dateBounds = useMemo(() => {
        const dates = Object.keys(dailyTotals).sort();
        if (dates.length === 0) return { min: new Date(), max: new Date() };
        return {
            min: parseISO(dates[0]),
            max: new Date()
        };
    }, [dailyTotals]);

    // Available years from data
    const availableYears = useMemo(() => {
        const minYear = getYear(dateBounds.min);
        const maxYear = getYear(dateBounds.max);
        const years = [];
        for (let y = minYear; y <= maxYear; y++) years.push(y);
        return years;
    }, [dateBounds]);

    // Controladores para navegar fechas
    const handlePrev = () => {
        let newDate;
        if (filter === 'year') newDate = subYears(selectedDate, 1);
        else if (filter === 'month') newDate = subMonths(selectedDate, 1);
        else newDate = subWeeks(selectedDate, 1);

        // Ensure we don't go completely before our minDate's period
        setSelectedDate(newDate);
    };

    const handleNext = () => {
        let newDate;
        if (filter === 'year') newDate = addYears(selectedDate, 1);
        else if (filter === 'month') newDate = addMonths(selectedDate, 1);
        else newDate = addWeeks(selectedDate, 1);

        setSelectedDate(newDate);
    };

    const disablePrev = useMemo(() => {
        if (filter === 'year') return startOfYear(selectedDate) <= startOfYear(dateBounds.min);
        if (filter === 'month') return startOfMonth(selectedDate) <= startOfMonth(dateBounds.min);
        return startOfWeek(selectedDate, { weekStartsOn: 1 }) <= startOfWeek(dateBounds.min, { weekStartsOn: 1 });
    }, [selectedDate, filter, dateBounds]);

    const disableNext = useMemo(() => {
        if (filter === 'year') return startOfYear(selectedDate) >= startOfYear(dateBounds.max);
        if (filter === 'month') return startOfMonth(selectedDate) >= startOfMonth(dateBounds.max);
        return startOfWeek(selectedDate, { weekStartsOn: 1 }) >= startOfWeek(dateBounds.max, { weekStartsOn: 1 });
    }, [selectedDate, filter, dateBounds]);

    const displayPeriodText = useMemo(() => {
        if (filter === 'year') return format(selectedDate, 'yyyy');
        if (filter === 'month') return format(selectedDate, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase());
        if (filter === 'custom') return 'Rango Personalizado';
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(start, 'd MMM')} - ${format(end, 'd MMM', { locale: es })}`;
    }, [selectedDate, filter]);

    // 2. Filter data for Chart
    const chartData = useMemo(() => {
        if (Object.keys(dailyTotals).length === 0) return [];

        let interval;
        let groupFn;
        let formatStr;

        if (filter === 'custom') {
            const rangeStart = startOfDay(customRange.start);
            const rangeEnd = startOfDay(customRange.end);
            if (rangeStart > rangeEnd) return [];

            interval = { start: rangeStart, end: rangeEnd };
            const days = eachDayOfInterval(interval);
            const today = new Date();

            return days.map(dayDate => {
                if (startOfDay(dayDate) > startOfDay(today)) {
                    return {
                        name: format(dayDate, 'dd MMM', { locale: es }),
                        rawDate: dayDate,
                        total: null
                    };
                }

                const dStr = format(dayDate, 'yyyy-MM-dd');
                const data = dailyTotals[dStr];
                const row = {
                    name: format(dayDate, 'dd MMM', { locale: es }),
                    rawDate: dayDate,
                    total: data ? data.total : 0
                };
                if (data && data.banks) {
                    Object.entries(data.banks).forEach(([b, bData]) => { row[b] = bData.saldo; });
                }
                return row;
            });
        } else if (filter === 'year') {
            interval = { start: startOfYear(selectedDate), end: endOfYear(selectedDate) };
            const months = eachMonthOfInterval(interval);
            const today = new Date();
            return months.map(monthDate => {
                const start = startOfMonth(monthDate);
                const end = endOfMonth(monthDate);

                if (start > today) {
                    return {
                        name: format(monthDate, 'MMM', { locale: es }).toUpperCase(),
                        rawDate: monthDate,
                        total: null
                    };
                }

                const queryEnd = end > today ? today : end;
                let lastDataForMonth = null;
                const daysInMonth = eachDayOfInterval({ start, end: queryEnd });

                for (let i = daysInMonth.length - 1; i >= 0; i--) {
                    const dStr = format(daysInMonth[i], 'yyyy-MM-dd');
                    if (dailyTotals[dStr]) {
                        lastDataForMonth = dailyTotals[dStr];
                        break;
                    }
                }

                const row = {
                    name: format(monthDate, 'MMM', { locale: es }).toUpperCase(),
                    rawDate: monthDate,
                    total: lastDataForMonth ? lastDataForMonth.total : 0
                };
                if (lastDataForMonth && lastDataForMonth.banks) {
                    Object.entries(lastDataForMonth.banks).forEach(([b, bData]) => { row[b] = bData.saldo; });
                }
                return row;
            });
        } else if (filter === 'month') {
            interval = { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
            const days = eachDayOfInterval(interval);
            const today = new Date();
            return days.map(dayDate => {
                if (startOfDay(dayDate) > startOfDay(today)) {
                    return {
                        name: format(dayDate, 'dd MMM', { locale: es }),
                        rawDate: dayDate,
                        total: null
                    };
                }

                const dStr = format(dayDate, 'yyyy-MM-dd');
                const data = dailyTotals[dStr];
                const row = {
                    name: format(dayDate, 'dd MMM', { locale: es }),
                    rawDate: dayDate,
                    total: data ? data.total : 0
                };
                if (data && data.banks) {
                    Object.entries(data.banks).forEach(([b, bData]) => { row[b] = bData.saldo; });
                }
                return row;
            });
        } else if (filter === 'week') {
            interval = { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
            const days = eachDayOfInterval(interval);
            const today = new Date();
            return days.map(dayDate => {
                if (startOfDay(dayDate) > startOfDay(today)) {
                    return {
                        name: format(dayDate, 'EEE dd', { locale: es }),
                        rawDate: dayDate,
                        total: null
                    };
                }

                const dStr = format(dayDate, 'yyyy-MM-dd');
                const data = dailyTotals[dStr];
                const row = {
                    name: format(dayDate, 'EEE dd', { locale: es }),
                    rawDate: dayDate,
                    total: data ? data.total : 0
                };
                if (data && data.banks) {
                    Object.entries(data.banks).forEach(([b, bData]) => { row[b] = bData.saldo; });
                }
                return row;
            });
        }

        return [];
    }, [dailyTotals, filter, selectedDate, customRange]);


    // 3. Get current display total and banks breakdown
    // Si estamos viendo el periodo actual, mostramos el saldo más reciente (hoy).
    // Si navegamos al pasado, mostramos el saldo del final de ese periodo visto en pantalla.
    const displayData = useMemo(() => {
        const sortedDates = Object.keys(dailyTotals).sort((a, b) => b.localeCompare(a));
        if (sortedDates.length === 0) return { total: 0, banks: {} };

        // Determine the end of the selected period
        let periodEnd;
        const today = new Date();
        if (filter === 'custom') periodEnd = customRange.end;
        else if (filter === 'year') periodEnd = endOfYear(selectedDate);
        else if (filter === 'month') periodEnd = endOfMonth(selectedDate);
        else periodEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

        // Cap at today if period is current/future
        if (periodEnd > today) periodEnd = today;

        // Find closest date strings up to periodEnd
        const periodEndStr = format(periodEnd, 'yyyy-MM-dd');

        // Find the latest record that is <= periodEndStr
        const validDates = sortedDates.filter(d => d <= periodEndStr);
        const latestValidDate = validDates[0] || sortedDates[0];

        return dailyTotals[latestValidDate];
    }, [dailyTotals, selectedDate, filter, customRange]);

    const handleExportPDF = async () => {
        setIsExporting(true);
        setExportType('pdf');
        
        // Artificial delay for the modal to show properly
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            if (!hiddenPrintRef.current) return;
            
            // Render hidden layout to canvas
            const canvas = await html2canvas(hiddenPrintRef.current, {
                scale: 2, // Better quality
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: exportSettings.orientation,
                unit: 'mm',
                format: exportSettings.format
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const ratio = imgProps.width / imgProps.height;
            
            const margin = 10;
            const contentWidth = pdfWidth - (margin * 2);
            const contentHeight = contentWidth / ratio;

            let finalHeight = contentHeight;
            let finalWidth = contentWidth;

            // Optional pagination / scaling logic. Since it's a fixed height hidden layout, we scale it to fit one page.
            if (contentHeight > (pdfHeight - (margin * 2))) {
                finalHeight = pdfHeight - (margin * 2);
                finalWidth = finalHeight * ratio;
            }

            const xOffset = margin + (contentWidth - finalWidth) / 2;

            pdf.addImage(imgData, 'PNG', xOffset, margin, finalWidth, finalHeight);
            
            const filename = `Reporte_Tesoreria_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
            pdf.save(filename);

        } catch (error) {
            console.error("Error al exportar PDF:", error);
            alert("No se pudo generar el documento pdf.");
        } finally {
            setIsExporting(false);
            setExportType(null);
        }
    };

    const handleExportCSV = async () => {
        setIsExporting(true);
        setExportType('csv');

        // Artificial delay for the modal to show properly
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            if (!chartData || chartData.length === 0) {
                alert("No hay datos para exportar.");
                return;
            }

            const separator = exportSettings.csvSeparator || ';';
            
            // Extract unique bank names
            const allKeys = new Set();
            chartData.forEach(day => {
                Object.keys(day).forEach(key => {
                    if (key !== 'name' && key !== 'date' && key !== 'total') {
                        allKeys.add(key);
                    }
                });
            });
            const bankNames = Array.from(allKeys);

            // Create Header
            let csvContent = `Fecha${separator}Total Consolidado`;
            bankNames.forEach(bank => {
                csvContent += `${separator}Banco: ${bank.charAt(0).toUpperCase() + bank.slice(1)}`;
            });
            csvContent += '\r\n';

            // Create Rows
            chartData.forEach(day => {
                const dateKey = day.date || day.name; // Fallback to name if date missing
                let row = `${dateKey}${separator}${day.total || 0}`;
                bankNames.forEach(bank => {
                    row += `${separator}${day[bank] || 0}`;
                });
                csvContent += row + '\r\n';
            });

            // Trigger Download
            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \ufeff is BOM for Excel UTF-8 support
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `Reporte_Tesoreria_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Error al exportar CSV:", error);
            alert("No se pudo generar el documento csv.");
        } finally {
            setIsExporting(false);
            setExportType(null);
        }
    };


    if (loading) {
        return (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white mx-auto mb-4"></div>
                Cargando datos de bancos...
            </div>
        );
    }

    const { total, banks } = displayData || { total: 0, banks: {} };

    return (
        <div className="animate-in fade-in duration-500 flex flex-col gap-6 bg-slate-50 dark:bg-caixeta-dark relative">
            
            <div className="sticky top-0 z-40 dark:bg-caixeta-dark/80 backdrop-blur-md pt-3 pb-3 md:pt-4 md:pb-4 border-b border-transparent flex flex-col xl:flex-row items-center justify-between w-full transition-colors duration-300 md:pr-16 gap-3 md:gap-4 px-1">
                <div className="flex items-center gap-3 z-10 text-center xl:text-left flex-shrink-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
                        Tesorería
                    </h1>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleExportCSV}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-[#2A2A2A] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-xl transition-colors shadow-sm"
                            title="Exportar a CSV"
                        >
                            <MdTableView className="text-xl text-emerald-500" />
                        </button>
                        <button 
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-[#2A2A2A] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            title="Exportar a PDF"
                        >
                            <MdPictureAsPdf className="text-xl text-red-500" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row items-center gap-2 md:gap-3 z-20 w-full xl:w-auto">
                    {/* Selector de periodo (Mes/Año/Semana específico o Custom) */}
                    <div className="relative flex items-center gap-2 bg-white dark:bg-slate-800/80 p-1.5 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl" ref={pickerRef}>
                        {filter === 'custom' ? (
                            <div className="flex flex-col gap-1.5 px-2 md:px-3 py-1.5 text-xs md:text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium w-12">Desde:</span>
                                    <input
                                        type="date"
                                        value={format(customRange.start, 'yyyy-MM-dd')}
                                        max={format(new Date(), 'yyyy-MM-dd')}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                setCustomRange(prev => ({ ...prev, start: parseISO(e.target.value) }));
                                            }
                                        }}
                                        className="bg-transparent border-none text-slate-800 dark:text-white focus:ring-0 cursor-pointer font-semibold outline-none text-xs md:text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium w-12">Hasta:</span>
                                    <input
                                        type="date"
                                        value={format(customRange.end, 'yyyy-MM-dd')}
                                        max={format(new Date(), 'yyyy-MM-dd')}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                setCustomRange(prev => ({ ...prev, end: parseISO(e.target.value) }));
                                            }
                                        }}
                                        className="bg-transparent border-none text-slate-800 dark:text-white focus:ring-0 cursor-pointer font-semibold outline-none text-xs md:text-sm"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={handlePrev}
                                    disabled={disablePrev}
                                    className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${disablePrev ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                >
                                    <MdChevronLeft className="text-xl" />
                                </button>

                                <button
                                    onClick={() => { setPickerOpen(!pickerOpen); setPickerYear(getYear(selectedDate)); }}
                                    className="w-28 md:w-36 text-center text-xs md:text-sm font-semibold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg py-1 transition-colors cursor-pointer"
                                >
                                    {displayPeriodText}
                                </button>

                                <button
                                    onClick={handleNext}
                                    disabled={disableNext}
                                    className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${disableNext ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                >
                                    <MdChevronRight className="text-xl" />
                                </button>
                            </>
                        )}

                        {/* === POPUP PICKER === */}
                        {pickerOpen && filter !== 'custom' && (
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 z-50 min-w-[280px] animate-in fade-in slide-in-from-top-2 duration-200">

                                {/* --- YEAR PICKER --- */}
                                {filter === 'year' && (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Seleccionar Año</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {availableYears.map(y => (
                                                <button
                                                    key={y}
                                                    onClick={() => { setSelectedDate(setYear(selectedDate, y)); setPickerOpen(false); }}
                                                    className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${getYear(selectedDate) === y
                                                        ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-800 shadow-md'
                                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                        }`}
                                                >
                                                    {y}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* --- MONTH PICKER --- */}
                                {filter === 'month' && (
                                    <div className="flex flex-col gap-3">
                                        {/* Year nav */}
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => setPickerYear(y => y - 1)}
                                                disabled={pickerYear <= getYear(dateBounds.min)}
                                                className={`p-1 rounded-lg transition-colors ${pickerYear <= getYear(dateBounds.min) ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                            >
                                                <MdChevronLeft className="text-lg" />
                                            </button>
                                            <span className="text-sm font-bold text-slate-800 dark:text-white">{pickerYear}</span>
                                            <button
                                                onClick={() => setPickerYear(y => y + 1)}
                                                disabled={pickerYear >= getYear(dateBounds.max)}
                                                className={`p-1 rounded-lg transition-colors ${pickerYear >= getYear(dateBounds.max) ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                            >
                                                <MdChevronRight className="text-lg" />
                                            </button>
                                        </div>
                                        {/* Month grid */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {Array.from({ length: 12 }, (_, i) => {
                                                const monthDate = new Date(pickerYear, i, 1);
                                                const isFuture = monthDate > new Date();
                                                const isBeforeData = monthDate < startOfMonth(dateBounds.min);
                                                const isSelected = getYear(selectedDate) === pickerYear && getMonth(selectedDate) === i;
                                                const label = format(monthDate, 'MMM', { locale: es }).toUpperCase();
                                                return (
                                                    <button
                                                        key={i}
                                                        disabled={isFuture || isBeforeData}
                                                        onClick={() => { setSelectedDate(new Date(pickerYear, i, 1)); setPickerOpen(false); }}
                                                        className={`px-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${isSelected
                                                            ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-800 shadow-md'
                                                            : isFuture || isBeforeData
                                                                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                            }`}
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* --- WEEK PICKER (Mini Calendar) --- */}
                                {filter === 'week' && (
                                    <div className="flex flex-col gap-3">
                                        {/* Month/Year nav */}
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => {
                                                    const prev = pickerYear * 12 + getMonth(selectedDate) - 1;
                                                    setPickerYear(Math.floor(prev / 12));
                                                    setSelectedDate(new Date(Math.floor(prev / 12), prev % 12, 1));
                                                }}
                                                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <MdChevronLeft className="text-lg" />
                                            </button>
                                            <span className="text-sm font-bold text-slate-800 dark:text-white">
                                                {format(new Date(pickerYear, getMonth(selectedDate), 1), 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    const next = pickerYear * 12 + getMonth(selectedDate) + 1;
                                                    setPickerYear(Math.floor(next / 12));
                                                    setSelectedDate(new Date(Math.floor(next / 12), next % 12, 1));
                                                }}
                                                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <MdChevronRight className="text-lg" />
                                            </button>
                                        </div>
                                        {/* Day headers */}
                                        <div className="grid grid-cols-7 gap-0.5 text-center">
                                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                                                <div key={d} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1">{d}</div>
                                            ))}
                                            {(() => {
                                                const viewMonth = getMonth(selectedDate);
                                                const viewYear = pickerYear;
                                                const firstDay = new Date(viewYear, viewMonth, 1);
                                                const daysInMonth = getDaysInMonth(firstDay);
                                                // getDay: 0=Sun. We want Mon=0. So (getDay(d)+6)%7
                                                const startOffset = (getDay(firstDay) + 6) % 7;
                                                const selectedWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
                                                const selectedWeekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

                                                const cells = [];
                                                for (let i = 0; i < startOffset; i++) {
                                                    cells.push(<div key={`empty-${i}`} />);
                                                }
                                                for (let day = 1; day <= daysInMonth; day++) {
                                                    const dayDate = new Date(viewYear, viewMonth, day);
                                                    const isInSelectedWeek = dayDate >= selectedWeekStart && dayDate <= selectedWeekEnd;
                                                    const isToday = format(dayDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                                    cells.push(
                                                        <button
                                                            key={day}
                                                            onClick={() => { setSelectedDate(dayDate); setPickerOpen(false); }}
                                                            className={`py-1.5 rounded-lg text-xs font-medium transition-all ${isInSelectedWeek
                                                                ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-800 shadow-sm'
                                                                : isToday
                                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                                }`}
                                                        >
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

                    {/* Filtros de resolución (Semana/Mes/Año/Custom) */}
                    <div className="flex flex-wrap justify-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shrink-0 max-w-full">
                        <button
                            onClick={() => { setFilter('week'); setSelectedDate(new Date()); }}
                            className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${filter === 'week' ? 'bg-white dark:bg-[#333] shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                        >
                            Semana
                        </button>
                        <button
                            onClick={() => { setFilter('month'); setSelectedDate(new Date()); }}
                            className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${filter === 'month' ? 'bg-white dark:bg-[#333] shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                        >
                            Mes
                        </button>
                        <button
                            onClick={() => { setFilter('year'); setSelectedDate(new Date()); }}
                            className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${filter === 'year' ? 'bg-white dark:bg-[#333] shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                        >
                            Año
                        </button>
                        <button
                            onClick={() => { setFilter('custom'); }}
                            className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${filter === 'custom' ? 'bg-white dark:bg-[#333] shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                        >
                            Personalizado
                        </button>
                    </div>
                </div>
            </div>

            {/* SUPERIOR: Total general y Gráfico */}
            <div className="bg-white dark:bg-caixeta-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                <div className="p-4 md:p-6 lg:p-8 border-b border-slate-100 dark:border-slate-800/50">
                    <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-xs md:text-sm mb-1">
                        Saldo Total Consolidado
                    </p>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 dark:text-white">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total)}
                    </h2>
                </div>

                <div className="p-4 md:p-6 lg:p-8 pt-4 md:pt-6 h-[300px] md:h-[400px] w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k €`} // Simple formatter
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#10B981', fontWeight: 'bold' }}
                                    formatter={(value) => [new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value), "Total"]}
                                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#10B981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            No hay suficientes datos para mostrar el gráfico.
                        </div>
                    )}
                </div>
            </div>

            {/* INFERIOR: Cards individuales por Banco */}
            <div className="mt-2 md:mt-4">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 md:mb-4 z-10 text-center md:text-left">Desglose por Banco</h3>
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                    {Object.entries(banks).map(([bankName, bankData], index) => {
                        const bankColors = {
                            'bbva': '#001390',
                            'santander': '#EC0000',
                            'sabadell': '#006DFF',
                            'la caixa': '#009AD8',
                            'bankinter': '#F76900'
                        };
                        const color = bankColors[bankName.toLowerCase()] || ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#14b8a6'][index % 5];
                        return (
                            <div key={index} className="bg-white dark:bg-caixeta-card px-4 md:px-6 pt-4 md:pt-6 pb-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md flex flex-col justify-between overflow-hidden">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm uppercase font-semibold mb-1 md:mb-2">
                                        {bankName}
                                    </p>
                                    <p className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: bankData.moneda || 'EUR' }).format(bankData.saldo)}
                                    </p>
                                </div>
                                <div className="h-[180px] md:h-[220px] w-full mt-4 md:mt-6 -ml-4 -mr-4">
                                    {chartData.length > 0 && chartData.some(d => d[bankName] !== undefined) ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800/60" />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                    dy={8}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                    tickFormatter={(val) => {
                                                        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                                                        return val;
                                                    }}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '8px' }}
                                                    itemStyle={{ color: color, fontWeight: 'bold' }}
                                                    formatter={(value) => [new Intl.NumberFormat('es-ES', { style: 'currency', currency: bankData.moneda || 'EUR' }).format(value), bankName]}
                                                    labelStyle={{ color: '#64748b', marginBottom: '2px', fontSize: '12px' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey={bankName}
                                                    stroke={color}
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill={`url(#grad-${index})`}
                                                    isAnimationActive={false}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                                            Sin datos históricos
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {Object.keys(banks).length === 0 && (
                        <p className="text-slate-500 dark:text-slate-400 col-span-full">
                            No hay datos de bancos registrados para mostrar hoy.
                        </p>
                    )}
                </div>
            </div>

            {/* Hidden Official PDF Layout Template */}
            <div className="absolute top-0 left-[-9999px] z-[-1]">
                <div 
                    ref={hiddenPrintRef} 
                    className="bg-white text-slate-900 mx-auto"
                    style={{ 
                        width: exportSettings.orientation === 'l' ? 
                            (exportSettings.format === 'letter' ? '1397px' : '1448px') : 
                            (exportSettings.format === 'letter' ? '1080px' : '1024px'), 
                        padding: '40px', 
                        minHeight: exportSettings.orientation === 'l' ? 
                            (exportSettings.format === 'letter' ? '1080px' : '1024px') : 
                            (exportSettings.format === 'letter' ? '1397px' : '1448px')
                    }} // Standardized internal dimensions for high-res render based on settings
                >
                    {/* Official Header */}
                    <div className="flex justify-between items-end border-b-2 border-slate-200 pb-6 mb-8">
                        <div className="flex flex-col">
                            <img src="/logo.png" alt="Caixeta Logo" className="h-[70px] w-auto object-contain mb-2" />
                            <p className="text-slate-500 font-medium tracking-widest uppercase text-sm mt-1">Informe de gestión</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <h1 className="text-2xl font-bold text-slate-800">Reporte de Tesorería</h1>
                            <p className="text-slate-500 mt-1 max-w-[200px]">
                                Periodo: {displayPeriodText} <br/>
                                Emisión: {format(new Date(), 'dd/MM/yyyy HH:mm')}
                            </p>
                        </div>
                    </div>

                    {/* Consolidado */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden mb-8">
                        <div className="p-8 border-b border-slate-200 bg-white">
                            <p className="text-slate-500 font-bold uppercase tracking-wider text-sm mb-2">
                                Saldo Total Consolidado
                            </p>
                            <h2 className="text-5xl font-bold text-slate-900">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total)}
                            </h2>
                        </div>
                        <div className="p-8 h-[350px] w-full bg-white">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k €`} />
                                        <Area type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} fillOpacity={0.1} fill="#10B981" isAnimationActive={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">Sin suficientes datos.</div>
                            )}
                        </div>
                    </div>

                    {/* Desglose de bancos */}
                    <h3 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-2">Desglose por Entidad</h3>
                    <div className={`grid ${exportSettings.orientation === 'l' ? 'grid-cols-3' : 'grid-cols-2'} gap-6`}>
                        {Object.entries(banks).map(([bankName, bankData], index) => {
                            const bankColors = {
                                'bbva': '#001390', 'santander': '#EC0000', 'sabadell': '#006DFF', 'la caixa': '#009AD8', 'bankinter': '#F76900'
                            };
                            const color = bankColors[bankName.toLowerCase()] || '#3B82F6';
                            return (
                                <div key={index} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                    <p className="text-slate-500 text-sm uppercase font-bold mb-1">{bankName}</p>
                                    <p className="text-3xl font-bold text-slate-900 mb-4">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: bankData.moneda || 'EUR' }).format(bankData.saldo)}
                                    </p>
                                    <div className="h-[150px] w-full -ml-4 -mr-4">
                                        {chartData.length > 0 && chartData.some(d => d[bankName] !== undefined) ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} dy={8} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                                                    <Area type="monotone" dataKey={bankName} stroke={color} strokeWidth={2} fillOpacity={0.1} fill={color} isAnimationActive={false} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Sin datos</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* End Hidden Template */}
            
            {/* Exporting Modal Overlay */}
            {isExporting && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center animate-in zoom-in-95 duration-200">
                        {/* Spinner Animation */}
                        <div className="relative mb-6 w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-[3px] border-slate-100 dark:border-slate-800"></div>
                            <div className="absolute inset-0 rounded-full border-[3px] border-caixeta-red border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                {exportType === 'pdf' ? (
                                    <MdPictureAsPdf className="text-caixeta-red text-xl" />
                                ) : (
                                    <MdTableView className="text-emerald-500 text-xl" />
                                )}
                            </div>
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white text-center mb-2">
                            {exportType === 'pdf' ? 'Generando PDF Oficial' : 'Generando Reporte CSV'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
                            {exportType === 'pdf' 
                                ? 'Preparando el documento, aplicando configuraciones y calculando proporciones. Por favor, espera unos segundos.' 
                                : 'Extrayendo datos de la tabla y formateando el documento para excel. Esto tomará solo un momento.'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
