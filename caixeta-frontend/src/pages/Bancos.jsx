import { useEffect, useState } from 'react';

const Bancos = () => {
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        // Usando variables de entorno dinámicas cargadas desde .env
        fetch(`${import.meta.env.VITE_API_URL}/bancos`, {
            headers: { 'x-api-key': import.meta.env.VITE_API_KEY }
        })
            .then(res => {
                if (!res.ok) throw new Error('Error de conexión a la API');
                return res.json();
            })
            .then(data => {
                setMovimientos(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error:", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    return (
        <div className="animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">Movimientos Bancarios</h1>

            <div className="bg-white dark:bg-caixeta-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-[#2A2A2A] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition-colors duration-300">
                            <tr>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Fecha</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Concepto</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Importe</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 transition-colors duration-300">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        Cargando movimientos...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-caixeta-red">
                                        Actualmente no pudimos conectar con la base de datos de los bancos locales.<br />
                                        <span className="text-sm opacity-80">(Asegúrate de que la API en {import.meta.env.VITE_API_URL} está iniciada)</span>
                                    </td>
                                </tr>
                            ) : movimientos.length > 0 ? (
                                movimientos.map((m) => (
                                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-[#2A2A2A]/40 transition-colors duration-200 group">
                                        <td className="p-4 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">{m.fecha}</td>
                                        <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{m.concepto}</td>
                                        <td className={`p-4 text-right font-bold whitespace-nowrap ${m.importe < 0 ? 'text-caixeta-red' : 'text-emerald-500 dark:text-emerald-400'}`}>
                                            {typeof m.importe === 'number' ? m.importe.toFixed(2) : m.importe} €
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold leading-none ${m.estado === 'Conciliado'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                                }`}>
                                                {m.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        No hay movimientos bancarios registrados en este momento.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Bancos;
