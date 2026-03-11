import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdEdit, MdDelete, MdClose, MdAdminPanelSettings, MdCheck, MdPeopleAlt, MdAutorenew, MdPalette, MdLightMode, MdDarkMode, MdPictureAsPdf, MdLock, MdLockOpen } from 'react-icons/md';
import { useTheme } from '../context/ThemeContext';

const AdminSettings = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState(['admin', 'accountant', 'cashier']);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [currentUser, setCurrentUser] = useState({ id: '', name: '', email: '', password: '', role_name: 'accountant' });
    const [isSaving, setIsSaving] = useState(false);

    // Delete Confirmation state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Security Lock state
    const [isUsersUnlocked, setIsUsersUnlocked] = useState(false);
    const [unlockPassword, setUnlockPassword] = useState('');
    const [unlockError, setUnlockError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);

    const navigate = useNavigate();
    const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const { theme, toggleTheme } = useTheme();

    // Export Global Settings
    const [exportSettings, setExportSettings] = useState(() => {
        const saved = localStorage.getItem('caixeta_export_settings') || localStorage.getItem('caixeta_pdf_settings');
        return saved ? JSON.parse(saved) : { orientation: 'l', format: 'a4', csvSeparator: ';' };
    });

    useEffect(() => {
        // Redirigir si no es admin, pero por seguridad, el Layout/App.jsx debería evitar que llegue aquí
        if (loggedUser.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        fetchUsers();
    }, [navigate, loggedUser.role]);

    const handleSaveExportSettings = () => {
        localStorage.setItem('caixeta_export_settings', JSON.stringify(exportSettings));
        setSuccessMsg('Ajustes de exportación guardados correctamente');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'X-User-Id': loggedUser.id
    });

    const handleUnlockUsers = async (e) => {
        e.preventDefault();
        setIsUnlocking(true);
        setUnlockError('');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/verify-password`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ password: unlockPassword })
            });

            const data = await response.json();

            if (data.success) {
                setIsUsersUnlocked(true);
                setUnlockPassword('');
                fetchUsers(); // Refresh when unlocking
            } else {
                setUnlockError(data.error || 'Contraseña incorrecta');
            }
        } catch (err) {
            setUnlockError('Error al contactar con el servidor');
        } finally {
            setIsUnlocking(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users`, {
                headers: getHeaders()
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al obtener usuarios');
            }
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (mode, user = null) => {
        setModalMode(mode);
        if (mode === 'edit' && user) {
            setCurrentUser({ ...user, password: '' }); // No mostramos el password al editar
        } else {
            setCurrentUser({ id: '', name: '', email: '', password: '', role_name: 'accountant' });
        }
        setError('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentUser({ id: '', name: '', email: '', password: '', role_name: 'accountant' });
        setError('');
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        setSuccessMsg('');

        try {
            const url = modalMode === 'create' 
                ? `${import.meta.env.VITE_API_URL}/admin/users`
                : `${import.meta.env.VITE_API_URL}/admin/users/${currentUser.id}`;
            
            const method = modalMode === 'create' ? 'POST' : 'PUT';
            
            // Si es edit y el password está vacío, lo eliminamos del payload
            const payload = { ...currentUser };
            if (modalMode === 'edit' && !payload.password) {
                delete payload.password;
            }

            const response = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al guardar usuario');
            }

            setSuccessMsg(data.message);
            fetchUsers();
            handleCloseModal();
            
            // Ocultar mensaje de éxito después de 3 segundos
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenDeleteConfirm = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
        setError('');
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsSaving(true);
        setError('');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al eliminar usuario');
            }

            setSuccessMsg(data.message);
            fetchUsers();
            setIsDeleteModalOpen(false);
            setUserToDelete(null);

            // Ocultar mensaje de éxito después de 3 segundos
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.message);
            setIsDeleteModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
            case 'accountant': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            case 'cashier': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        }
    };

    const roleNamesSpanish = {
        'admin': 'Administrador',
        'accountant': 'Contabilidad',
        'cashier': 'Caja'
    };

    // Funciones de Contraseña
    const checkPasswordStrength = (pass) => {
        let score = 0;
        if (!pass) return 0;
        if (pass.length > 5) score += 1; // Longitud mínima decente
        if (pass.length > 8) score += 1; // Buena longitud
        if (/[A-Z]/.test(pass)) score += 1; // Contiene mayúsculas
        if (/[0-9]/.test(pass)) score += 1; // Contiene números
        if (/[^A-Za-z0-9]/.test(pass)) score += 1; // Contiene símbolos
        
        // Retornamos 0, 1 (Débil), 2 (Media), 3 o más (Fuerte). Maximos a 4 para visualización
        return Math.min(score, 4);
    };

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let newPass = "";
        for (let i = 0; i < 10; i++) {
            newPass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCurrentUser(prev => ({ ...prev, password: newPass }));
    };

    const passwordStrength = checkPasswordStrength(currentUser.password);

    const getStrengthColor = (score) => {
        if (score === 0) return 'bg-slate-200 dark:bg-slate-700';
        if (score <= 1) return 'bg-red-400';
        if (score === 2) return 'bg-yellow-400';
        return 'bg-emerald-500';
    };

    const getStrengthText = (score) => {
        if (!currentUser.password) return '';
        if (score <= 1) return 'Débil';
        if (score === 2) return 'Media';
        if (score >= 3) return 'Fuerte';
        return '';
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <MdAdminPanelSettings className="text-caixeta-red text-4xl" />
                        Ajustes del Sistema
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Configuración global y administración de la plataforma.</p>
                </div>
            </div>

            {/* Notificaciones */}
            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800/50 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError('')}><MdClose /></button>
                </div>
            )}
            
            {successMsg && (
                <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2">
                    <MdCheck className="text-xl" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Sub-sección de Ajustes de Apariencia */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-caixeta-card shadow-sm h-full">
                    <div className="flex flex-col justify-between h-full gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                <MdPalette className="text-caixeta-red" />
                                Apariencia del Sistema
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cambia entre el modo claro y oscuro para toda la interfaz.</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-[#1f1f1f] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
                            <button
                                onClick={() => theme !== 'light' && toggleTheme()}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                                    theme === 'light' 
                                    ? 'bg-white text-slate-800 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                <MdLightMode className={theme === 'light' ? "text-yellow-500" : ""} /> Claro
                            </button>
                            <button
                                onClick={() => theme !== 'dark' && toggleTheme()}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                                    theme === 'dark' 
                                    ? 'bg-[#333] text-white shadow-sm' 
                                    : 'text-slate-600 hover:text-slate-800'
                                }`}
                            >
                                <MdDarkMode className={theme === 'dark' ? "text-slate-300" : ""} /> Oscuro
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-caixeta-card shadow-sm h-full">
                    <div className="flex flex-col justify-between h-full gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                <MdPictureAsPdf className="text-caixeta-red" />
                                Ajustes de Exportación
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Propiedades globales para exportar datos en PDF o CSV.</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 w-[120px]">Orientación PDF:</label>
                                <select 
                                    value={exportSettings.orientation}
                                    onChange={(e) => setExportSettings({...exportSettings, orientation: e.target.value})}
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm dark:text-white"
                                >
                                    <option value="l">Horizontal (Landscape)</option>
                                    <option value="p">Vertical (Portrait)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 w-[120px]">Formato PDF:</label>
                                <select 
                                    value={exportSettings.format}
                                    onChange={(e) => setExportSettings({...exportSettings, format: e.target.value})}
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm dark:text-white"
                                >
                                    <option value="a4">A4</option>
                                    <option value="letter">Carta (Letter)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 w-[120px]">Separador CSV:</label>
                                <select 
                                    value={exportSettings.csvSeparator || ';'}
                                    onChange={(e) => setExportSettings({...exportSettings, csvSeparator: e.target.value})}
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm dark:text-white"
                                >
                                    <option value=";">Punto y coma (;)</option>
                                    <option value=",">Coma (,)</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-end mt-2">
                                <button 
                                    onClick={handleSaveExportSettings}
                                    className="bg-slate-800 hover:bg-slate-900 dark:bg-caixeta-red dark:hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <MdCheck className="text-lg" />
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-sección de Ajustes de Usuarios */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <MdPeopleAlt className="text-slate-400" />
                        Ajustes de Usuarios
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona los accesos y roles (Admin, Contabilidad, Caja).</p>
                </div>
                {isUsersUnlocked && (
                    <button
                        onClick={() => handleOpenModal('create')}
                        className="bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm shadow-md"
                    >
                        <MdAdd className="text-lg" /> Añadir Usuario
                    </button>
                )}
            </div>

            {/* Lock Screen o Tabla de Usuarios */}
            {!isUsersUnlocked ? (
                <div className="bg-white dark:bg-caixeta-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-slate-100 dark:bg-[#1E1E1E] p-5 rounded-full mb-6">
                        <MdLock className="text-5xl text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Sección Bloqueada</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                        Por motivos de seguridad, necesitas confirmar tu identidad como administrador para ver y modificar los datos de acceso del resto de usuarios.
                    </p>
                    
                    <form onSubmit={handleUnlockUsers} className="flex flex-col gap-4 w-full max-w-sm">
                        <div className="flex flex-col text-left">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tu contraseña de administrador</label>
                            <input 
                                type="password" 
                                value={unlockPassword}
                                onChange={(e) => setUnlockPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1f1f1f] border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-caixeta-red/20 focus:border-caixeta-red dark:text-white transition-all text-center tracking-widest"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        {unlockError && <p className="text-red-500 text-sm font-medium">{unlockError}</p>}
                        <button 
                            type="submit"
                            disabled={isUnlocking}
                            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-caixeta-red dark:hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isUnlocking ? (
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                            ) : (
                                <>
                                    <MdLockOpen className="text-xl" />
                                    Desbloquear
                                </>
                            )}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="bg-white dark:bg-caixeta-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-[#1f1f1f] border-b border-slate-200 dark:border-slate-800">
                                <th className="py-4 px-6 text-sm font-semibold text-slate-600 dark:text-slate-400">Nombre</th>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-600 dark:text-slate-400">Email</th>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-600 dark:text-slate-400 mt-2 md:mt-0">Rol</th>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-600 dark:text-slate-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-slate-500">Cargando usuarios...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-slate-500">No hay usuarios registrados.</td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-[#252525] transition-colors">
                                        <td className="py-4 px-6 text-slate-800 dark:text-slate-200 font-medium">
                                            {user.name}
                                            {user.id === loggedUser.id && (
                                                <span className="ml-2 text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">Tú</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400">{user.email}</td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeColor(user.role_name)}`}>
                                                {roleNamesSpanish[user.role_name] || user.role_name}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal('edit', user)}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <MdEdit className="text-lg" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenDeleteConfirm(user)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        user.id === loggedUser.id 
                                                            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                                                            : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                    }`}
                                                    title={user.id === loggedUser.id ? "No puedes eliminarte a ti mismo" : "Eliminar"}
                                                    disabled={user.id === loggedUser.id}
                                                >
                                                    <MdDelete className="text-lg" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* Modal Crear/Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-caixeta-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {modalMode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <MdClose className="text-2xl" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                            {/* Mostrar errores del modal aquí si es necesario, pero ya usamos el superior para notificaciones globales */}
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={currentUser.name}
                                    onChange={(e) => setCurrentUser({...currentUser, name: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-caixeta-red outline-none transition-colors dark:text-white"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={currentUser.email}
                                    onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-caixeta-red outline-none transition-colors dark:text-white"
                                    placeholder="juan@ejemplo.com"
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">
                                    Contraseña {modalMode === 'edit' && <span className="text-xs text-slate-400 font-normal">(Dejar en blanco para no cambiar)</span>}
                                </label>
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        required={modalMode === 'create'}
                                        value={currentUser.password}
                                        onChange={(e) => setCurrentUser({...currentUser, password: e.target.value})}
                                        className="w-full pl-4 pr-12 py-2.5 bg-slate-50 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-caixeta-red outline-none transition-colors dark:text-white"
                                        placeholder={modalMode === 'create' ? "Mínimo 6 caracteres" : "Nueva contraseña"}
                                    />
                                    <button
                                        type="button"
                                        onClick={generatePassword}
                                        className="absolute right-3 text-slate-400 hover:text-caixeta-red transition-colors"
                                        title="Generar contraseña"
                                    >
                                        <MdAutorenew className="text-xl" />
                                    </button>
                                </div>
                                {/* Medidor de Fuerza */}
                                {currentUser.password && (
                                    <div className="mt-2 pl-1">
                                        <div className="flex gap-1 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-300 w-1/4 ${passwordStrength >= 1 ? getStrengthColor(passwordStrength) : 'bg-transparent'}`}></div>
                                            <div className={`h-full transition-all duration-300 w-1/4 ${passwordStrength >= 2 ? getStrengthColor(passwordStrength) : 'bg-transparent'}`}></div>
                                            <div className={`h-full transition-all duration-300 w-1/4 ${passwordStrength >= 3 ? getStrengthColor(passwordStrength) : 'bg-transparent'}`}></div>
                                            <div className={`h-full transition-all duration-300 w-1/4 ${passwordStrength >= 4 ? getStrengthColor(passwordStrength) : 'bg-transparent'}`}></div>
                                        </div>
                                        <p className={`text-[10px] mt-1 font-medium ${
                                            passwordStrength <= 1 ? 'text-red-500' :
                                            passwordStrength === 2 ? 'text-yellow-500' : 'text-emerald-500'
                                        }`}>
                                            Fuerza: {getStrengthText(passwordStrength)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Rol</label>
                                <select
                                    value={currentUser.role_name}
                                    onChange={(e) => setCurrentUser({...currentUser, role_name: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-caixeta-red outline-none transition-colors dark:text-white cursor-pointer"
                                >
                                    {roles.map(role => (
                                        <option key={role} value={role}>{roleNamesSpanish[role]}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#2A2A2A] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2.5 bg-caixeta-red hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Confirmación de Borrado */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-caixeta-card rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MdDelete className="text-3xl" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">¿Eliminar Usuario?</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            Estás a punto de eliminar a <span className="font-semibold text-slate-700 dark:text-slate-300">{userToDelete?.name}</span>. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#2A2A2A] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSettings;
