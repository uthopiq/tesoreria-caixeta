import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { MdAccountBalance, MdLogout, MdPerson } from 'react-icons/md';
import { TbMoneybag } from 'react-icons/tb';
import { HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown } from 'react-icons/hi2';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-caixeta-dark transition-colors duration-300">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex w-64 bg-white dark:bg-caixeta-card flex-col shadow-sm border-r border-slate-200 dark:border-slate-800 transition-colors duration-300 z-50">
                {/* Logo Section */}
                <div className="p-6 flex items-center space-x-3 mb-4">
                    <img src="/caixeta_favicon.png" alt="Caixeta Logo" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold text-slate-800 dark:text-white">Caixeta</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1">
                    <Link
                        to="/dashboard/bancos"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            location.pathname.includes('/bancos')
                                ? 'bg-red-50 dark:bg-red-900/20 text-caixeta-red font-medium'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2A2A2A]'
                        }`}
                    >
                        <MdAccountBalance className="mr-3 text-xl" /> Bancos
                    </Link>
                    <Link
                        to="/dashboard/cobros"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            location.pathname.includes('/cobros')
                                ? 'bg-red-50 dark:bg-red-900/20 text-caixeta-red font-medium'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2A2A2A]'
                        }`}
                    >
                        <HiOutlineArrowTrendingDown className="mr-3 text-xl" /> Cobros
                    </Link>
                    <Link
                        to="/dashboard/pagos"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            location.pathname.includes('/pagos')
                                ? 'bg-red-50 dark:bg-red-900/20 text-caixeta-red font-medium'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2A2A2A]'
                        }`}
                    >
                        <HiOutlineArrowTrendingUp className="mr-3 text-xl" /> Pagos
                    </Link>
                    <Link
                        to="/dashboard/caja"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            location.pathname.includes('/caja')
                                ? 'bg-red-50 dark:bg-red-900/20 text-caixeta-red font-medium'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2A2A2A]'
                        }`}
                    >
                        <TbMoneybag className="mr-3 text-xl" /> Caja
                    </Link>
                </nav>

                {/* User Section / Logout */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#2A2A2A] flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                <MdPerson className="text-xl" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">Administrador</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Admin</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="p-2 text-slate-400 hover:text-caixeta-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Cerrar sesión"
                        >
                            <MdLogout className="text-xl" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Contenido Principal */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-28 md:pb-8 w-full">
                <Outlet />
            </main>

            {/* Menú Inferior (Móvil & Tablet <=768px) */}
            <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center bg-slate-100 dark:bg-slate-800/90 backdrop-blur-xl p-1.5 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700/80 w-[95%] max-w-[420px]">
                <Link
                    to="/dashboard/bancos"
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-200 ${
                        location.pathname.includes('/bancos')
                            ? 'bg-white dark:bg-[#333] shadow-sm text-slate-800 dark:text-white scale-100'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 scale-95'
                    }`}
                >
                    <MdAccountBalance className={`text-xl mb-1 ${location.pathname.includes('/bancos') ? 'text-caixeta-red' : 'opacity-80'}`} />
                    <span className="text-[10px] font-semibold tracking-wide">Bancos</span>
                </Link>
                <Link
                    to="/dashboard/cobros"
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-200 ${
                        location.pathname.includes('/cobros')
                            ? 'bg-white dark:bg-[#333] shadow-sm text-slate-800 dark:text-white scale-100'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 scale-95'
                    }`}
                >
                    <HiOutlineArrowTrendingDown className={`text-xl mb-1 ${location.pathname.includes('/cobros') ? 'text-caixeta-red' : 'opacity-80'}`} />
                    <span className="text-[10px] font-semibold tracking-wide">Cobros</span>
                </Link>
                <Link
                    to="/dashboard/pagos"
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-200 ${
                        location.pathname.includes('/pagos')
                            ? 'bg-white dark:bg-[#333] shadow-sm text-slate-800 dark:text-white scale-100'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 scale-95'
                    }`}
                >
                    <HiOutlineArrowTrendingUp className={`text-xl mb-1 ${location.pathname.includes('/pagos') ? 'text-caixeta-red' : 'opacity-80'}`} />
                    <span className="text-[10px] font-semibold tracking-wide">Pagos</span>
                </Link>
                <Link
                    to="/dashboard/caja"
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-200 ${
                        location.pathname.includes('/caja')
                            ? 'bg-white dark:bg-[#333] shadow-sm text-slate-800 dark:text-white scale-100'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 scale-95'
                    }`}
                >
                    <TbMoneybag className={`text-xl mb-1 ${location.pathname.includes('/caja') ? 'text-caixeta-red' : 'opacity-80'}`} />
                    <span className="text-[10px] font-semibold tracking-wide">Caja</span>
                </Link>
            </nav>
        </div>
    );
};

export default Layout;
