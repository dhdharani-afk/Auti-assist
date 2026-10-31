import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatApiError } from '../utils/apiError';
import useBuddyPreference from '../hooks/useBuddyPreference';

export default function Settings() {
  const { user, logout, setUser } = useAuth();
  const [buddyAnimation, setBuddyAnimation] = useBuddyPreference();
  const [settings, setSettings] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    theme: 'Light',
    sound: true,
    animations: true,
    notifications: true,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/api/settings');
        setSettings({
          name: response.data.name || user?.full_name || '',
          email: response.data.email || user?.email || '',
          theme: response.data.theme || 'Light',
          sound: response.data.sound ?? true,
          animations: response.data.animations ?? true,
          notifications: response.data.notifications ?? true,
        });
      } catch (error) {
        console.error('Settings fetch failed:', error);
      }
    };

    fetchSettings();
  }, [user]);

  const updateSetting = async (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    if (key === 'name' || key === 'email') return;
    try {
      await api.put('/api/settings', { [key]: value });
    } catch (error) {
      console.error('Settings update failed:', error);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="subtle">Personalise your friendly learning space.</p>
        </div>
      </div>

      <div className="card">
        <div className="field-group">
          <label>Name</label>
          <input className="input" value={settings.name} onChange={(event) => setSettings((current) => ({ ...current, name: event.target.value }))} onBlur={async () => {
            const fullName = settings.name.trim();
            if (!fullName || fullName === user?.full_name) return;
            try {
              const response = await api.put('/api/settings', { full_name: fullName });
              setSettings((current) => ({ ...current, name: response.data.name || fullName }));
              setUser((current) => ({ ...current, full_name: response.data.name || fullName }));
              setMessage('Name saved.');
            } catch (error) {
              setMessage(formatApiError(error, 'Name could not be saved.'));
            }
          }} />
        </div>
        <div className="field-group">
          <label>Email</label>
          <input className="input" value={settings.email} readOnly />
        </div>
        <div className="field-group">
          <label>Theme</label>
          <select className="select" value={settings.theme} onChange={(event) => updateSetting('theme', event.target.value)}>
            <option>Light</option>
            <option>Dark</option>
          </select>
        </div>
        <div className="field-group">
          <label>Sound</label>
          <select className="select" value={settings.sound ? 'On' : 'Off'} onChange={(event) => updateSetting('sound', event.target.value === 'On')}>
            <option>On</option>
            <option>Off</option>
          </select>
        </div>
        <div className="field-group">
          <label>Animations</label>
          <select className="select" value={settings.animations ? 'On' : 'Off'} onChange={(event) => updateSetting('animations', event.target.value === 'On')}>
            <option>On</option>
            <option>Off</option>
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="buddy-animation-setting">Buddy Animation</label>
          <select
            id="buddy-animation-setting"
            className="select"
            value={buddyAnimation ? 'On' : 'Off'}
            onChange={(event) => setBuddyAnimation(event.target.value === 'On')}
          >
            <option value="On">On</option>
            <option value="Off">Off</option>
          </select>
          <small className="settings-help-text">Turn AutiAssist Buddy’s movement on or off on this device.</small>
        </div>
        <div className="field-group">
          <label>Notifications</label>
          <select className="select" value={settings.notifications ? 'On' : 'Off'} onChange={(event) => updateSetting('notifications', event.target.value === 'On')}>
            <option>On</option>
            <option>Off</option>
          </select>
        </div>

        <button type="button" className="primary-btn" onClick={logout}>Logout</button>
        {message && <p role="status">{message}</p>}
      </div>
    </div>
  );
}
