import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Splash from './pages/Splash';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Learning from './pages/Learning';
import Games from './pages/Games';
import Communication from './pages/Communication';
import AIAssistant from './pages/AIAssistant';
import EmotionActivities from './pages/EmotionActivities';
import Routine from './pages/Routine';
import Rewards from './pages/Rewards';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import ColourMatchActivity from './pages/ColourMatchActivity';
import EmotionMatchActivity from './pages/EmotionMatchActivity';
import SayHelloActivity from './pages/SayHelloActivity';
import AppLayout from './components/AppLayout';

const SocialSituationSimulator = lazy(() => import('./pages/SocialSituationSimulator'));

function AppRoutes() {
  const { token, loading } = useAuth();

  if (loading) {
    return <Splash />;
  }

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/auth" element={token ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/games" element={<Games />} />
        <Route path="/communication" element={<Communication />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/emotion" element={<EmotionActivities />} />
        <Route path="/routine" element={<Routine />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/social-simulator" element={<ProtectedRoute requiredRole="child"><Suspense fallback={<div className="card">Loading picture situations…</div>}><SocialSituationSimulator /></Suspense></ProtectedRoute>} />
        <Route path="/activities/colour-match" element={<ColourMatchActivity />} />
        <Route path="/activities/emotion-match" element={<EmotionMatchActivity />} />
        <Route path="/activities/say-hello" element={<SayHelloActivity />} />
      </Route>
      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/auth'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
