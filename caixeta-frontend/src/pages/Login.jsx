import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdOutlineLock, MdAlternateEmail } from 'react-icons/md';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); // Se añade el estado para manejar errores
    const [loading, setLoading] = useState(false); // Opcional: para mostrar estado de carga
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(""); 
        setLoading(true);

        try {
            // Conexión con el Backend de Node.js en Hostinger
            const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Si la validación es correcta, guardamos datos y navegamos
                localStorage.setItem("user", JSON.stringify(data.user));
                navigate("/dashboard");
            } else {
                // Si el backend rechaza, mostramos el motivo
                setError(data.error || "Credenciales incorrectas");
            }
        } catch (err) {
            setError("Error de conexión: Verifica que el servidor esté activo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#1A1A1A]">
            <div className="w-full max-w-md bg-white dark:bg-caixeta-card rounded-3xl shadow-xl p-10 transition-colors duration-300">
                
                <div className="text-center mb-10">
                    <div className="bg-caixeta-red text-white w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg shadow-caixeta-red/30">
                        C
                    </div>
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Caixeta</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Sistema Integral Automatizado de Tesorería</p>
                </div>

                {/* VISUALIZACIÓN DE ERRORES: Importante para evitar el ReferenceError */}
                {error && (
                    <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 text-sm rounded-xl text-center animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Usuario / Email</label>
                        <div className="relative">
                            <MdAlternateEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xl" />
                            <input
                                type="text"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@caixeta.com"
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-caixeta-red outline-none transition-colors dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Contraseña</label>
                        <div className="relative">
                            <MdOutlineLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xl" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-caixeta-red outline-none transition-colors dark:text-white"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-caixeta-red text-white py-3 mt-4 rounded-xl font-semibold transition duration-300 shadow-md shadow-caixeta-red/20 ${
                            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
                        }`}
                    >
                        {loading ? 'Verificando...' : 'Iniciar Sesión'}
                    </button>

                    <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-800 pt-6">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Acceso de Producción:</p>
                        <div className="flex justify-center gap-2 text-xs">
                            <span className="px-3 py-1 bg-slate-100 dark:bg-[#2A2A2A] rounded-full text-slate-600 dark:text-slate-400 font-medium">
                                admin@caixeta.com
                            </span>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;