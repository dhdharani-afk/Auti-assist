import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { token, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-shell"><div className="form-card"><div className="loading-spinner" style={{ margin: '0 auto' }} /></div></div>;
  }

  if (!token) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
