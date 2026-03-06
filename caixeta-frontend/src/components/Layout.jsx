import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { MdAccountBalance, MdLogout, MdPerson } from 'react-icons/md';
import { TbMoneybag } from 'react-icons/tb';
import { HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown } from 'react-icons/hi2';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-caixeta-dark transition-colors duration-300">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-caixeta-card flex flex-col shadow-sm border-r border-slate-200 dark:border-slate-800 transition-colors duration-300">
                {/* Logo Section */}
                <div className="p-6 flex items-center space-x-3 mb-4">
                    <div className="bg-caixeta-red text-white w-8 h-8 rounded flex items-center justify-center font-bold text-lg shadow-sm">
                        C
                    </div>
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
            <main className="flex-1 p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
