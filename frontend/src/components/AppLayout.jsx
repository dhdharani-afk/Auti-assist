import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '🏠' },
  { label: 'Learning', path: '/learning', icon: '📚' },
  { label: 'Games', path: '/games', icon: '🧩' },
  { label: 'Communication', path: '/communication', icon: '💬' },
  { label: 'AI Assistant', path: '/ai-assistant', icon: '🤖' },
  { label: 'Emotion Activities', path: '/emotion', icon: '😊' },
  { label: 'Social Simulator', path: '/social-simulator', icon: '🤝', childOnly: true },
  { label: 'My Routine', path: '/routine', icon: '📅' },
  { label: 'My Rewards', path: '/rewards', icon: '🏆' },
  { label: 'My Progress', path: '/progress', icon: '📊' },
  { label: 'Settings', path: '/settings', icon: '⚙' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="page-shell">
      <div className="app-layout">
        <aside className="sidebar">
          <div className="logo-block">
            <div className="logo-mark">A</div>
            <div className="logo-text">AUTIASSIST</div>
          </div>
          <nav className="nav-list" aria-label="Main navigation">
            {navItems.filter((item) => !item.childOnly || user?.role === 'child').map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button className="nav-item logout" onClick={handleLogout} type="button">
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </nav>
          <div className="card" style={{ marginTop: '20px', padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginBottom: '4px' }}>Profile</div>
            <strong>{user?.full_name || 'Child'}</strong>
          </div>
        </aside>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
