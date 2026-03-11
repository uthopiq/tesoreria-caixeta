import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');

  if (!user) {
    // Si no hay usuario, redirigir al login
    return <Navigate to="/" replace />;
  }

  // Si hay usuario, renderizar los componentes hijos (el Layout/Dashboard)
  return children;
};

export default ProtectedRoute;
