import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import Login from './pages/Login';
import Layout from './components/Layout';
import Bancos from './pages/Bancos';
import AdminSettings from './pages/AdminSettings';
import ProtectedRoute from './components/ProtectedRoute';

// Componente para proteger rutas según el rol
const RoleRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!user || !user.role) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ThemeToggle />
        <Routes>
          {/* Ruta pública */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          
          {/* Rutas protegidas (dentro del Layout) */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={
              <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in duration-500">
                <div className="bg-caixeta-red text-white w-16 h-16 rounded-2xl flex items-center justify-center text-4xl font-bold shadow-lg shadow-caixeta-red/30 mb-6">
                  C
                </div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Bienvenido al Panel</h1>
                <p className="text-slate-500 dark:text-slate-400">Selecciona una opción del menú lateral para comenzar.</p>
              </div>
            } />
            
            {/* Rutas para admin y accountant */}
            <Route path="bancos" element={<RoleRoute allowedRoles={['admin', 'accountant']}><Bancos /></RoleRoute>} />
            <Route path="cobros" element={<RoleRoute allowedRoles={['admin', 'accountant']}><div className="text-slate-800 dark:text-white"><h1 className="text-3xl font-bold mb-6">Cobros</h1><p>Vista de cobros en construcción...</p></div></RoleRoute>} />
            <Route path="pagos" element={<RoleRoute allowedRoles={['admin', 'accountant']}><div className="text-slate-800 dark:text-white"><h1 className="text-3xl font-bold mb-6">Pagos</h1><p>Vista de pagos en construcción...</p></div></RoleRoute>} />
            
            {/* Ruta para todos los roles (Caja) */}
            <Route path="caja" element={<RoleRoute allowedRoles={['admin', 'accountant', 'cashier']}><div className="text-slate-800 dark:text-white"><h1 className="text-3xl font-bold mb-6">Caja</h1><p>Vista de caja en construcción...</p></div></RoleRoute>} />

            {/* Ruta exclusiva para admin */}
            <Route path="settings" element={<RoleRoute allowedRoles={['admin']}><AdminSettings /></RoleRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
