import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdOutlineLock, MdAlternateEmail } from 'react-icons/md';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        // TODO: Conectar con autenticación real. Por ahora, 'demo' y 'demo' funciona.
        if (email === 'demo' && password === 'demo') {
            navigate('/dashboard/bancos');
        } else {
            alert('Credenciales incorrectas (Usa demo/demo)');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white dark:bg-caixeta-card rounded-3xl shadow-xl p-10 transition-colors duration-300">
                <div className="text-center mb-10">
                    {/* User's Red "C" Logo concept */}
                    <div className="bg-caixeta-red text-white w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg shadow-caixeta-red/30">
                        C
                    </div>
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Caixeta</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Sistema Integral Automatizado de Tesorería</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {/* Input Email/Usuario */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Usuario</label>
                        <div className="relative">
                            <MdAlternateEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xl" />
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ej. admin, conta, caja"
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-caixeta-red focus:border-caixeta-red outline-none transition-colors dark:text-white dark:placeholder-slate-500"
                            />
                        </div>
                    </div>

                    {/* Input Password */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Contraseña</label>
                        <div className="relative">
                            <MdOutlineLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xl" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-caixeta-red focus:border-caixeta-red outline-none transition-colors dark:text-white dark:placeholder-slate-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-caixeta-red text-white py-3 mt-4 rounded-xl font-semibold hover:bg-red-700 transition duration-300 shadow-md shadow-caixeta-red/20"
                    >
                        Iniciar Sesión
                    </button>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Credenciales de prueba:</p>
                        <div className="flex justify-center gap-2 text-xs">
                            <span className="px-3 py-1 bg-slate-100 dark:bg-[#2A2A2A] rounded-full text-slate-600 dark:text-slate-400">admin / admin</span>
                            <span className="px-3 py-1 bg-slate-100 dark:bg-[#2A2A2A] rounded-full text-slate-600 dark:text-slate-400">conta / conta</span>
                            <span className="px-3 py-1 bg-slate-100 dark:bg-[#2A2A2A] rounded-full text-slate-600 dark:text-slate-400">caja / caja</span>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;