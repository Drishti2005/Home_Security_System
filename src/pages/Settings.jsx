import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Save, AlertCircle, Zap, Moon, Sun } from 'lucide-react';
import './Settings.css';

function Settings() {
  const [settings, setSettings] = useState({
    alertMode: 'normal',
    theme: 'light'
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/system/status');
      setSettings({
        alertMode: response.data.alertMode,
        theme: response.data.theme
      });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      await api.post('/system/settings', { key: 'alert_mode', value: settings.alertMode });
      await api.post('/system/settings', { key: 'theme', value: settings.theme });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const simulateThreat = async (type) => {
    try {
      await api.post('/system/simulate-threat', { type });
      alert(`${type} simulation triggered!`);
    } catch (error) {
      console.error('Failed to simulate:', error);
    }
  };

  return (
    <div className="settings-page">
      <h1>System Settings</h1>
      <p className="subtitle">Configure your security system</p>

      {saved && (
        <div className="success-message">
          ✅ Settings saved successfully!
        </div>
      )}

      <div className="settings-grid">
        <div className="card">
          <h2>Alert Configuration</h2>
          <div className="setting-item">
            <div className="setting-info">
              <AlertCircle size={20} />
              <div>
                <div className="setting-label">Alert Mode</div>
                <div className="setting-description">
                  Choose how you want to receive alerts
                </div>
              </div>
            </div>
            <select
              value={settings.alertMode}
              onChange={(e) => setSettings({...settings, alertMode: e.target.value})}
            >
              <option value="normal">Normal - All alerts</option>
              <option value="silent">Silent - Critical only</option>
            </select>
          </div>
        </div>

        <div className="card">
          <h2>Appearance</h2>
          <div className="setting-item">
            <div className="setting-info">
              {settings.theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
              <div>
                <div className="setting-label">Theme</div>
                <div className="setting-description">
                  Choose your preferred theme
                </div>
              </div>
            </div>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({...settings, theme: e.target.value})}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <div className="card">
          <h2>Threat Simulation</h2>
          <p className="card-description">Test system responses to different scenarios</p>
          <div className="simulation-buttons">
            <button onClick={() => simulateThreat('intruder')} className="btn btn-danger">
              🚨 Intruder
            </button>
            <button onClick={() => simulateThreat('fire')} className="btn btn-danger">
              🔥 Fire
            </button>
            <button onClick={() => simulateThreat('forced_entry')} className="btn btn-danger">
              🚪 Forced Entry
            </button>
            <button onClick={() => simulateThreat('power_failure')} className="btn">
              ⚡ Power Failure
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Telegram Bot</h2>
          <p className="card-description">
            Control your security system via Telegram bot
          </p>
          <div className="bot-commands">
            <code>/start</code> - Initialize bot<br/>
            <code>/arm</code> - Arm system<br/>
            <code>/disarm</code> - Disarm system<br/>
            <code>/status</code> - Get status<br/>
            <code>/logs</code> - View recent events<br/>
            <code>/risk</code> - Check risk score<br/>
            <code>/who_is_home</code> - See detected people<br/>
            <code>/alertmode [silent|normal]</code> - Change alert mode
          </div>
        </div>
      </div>

      <div className="save-bar">
        <button onClick={handleSave} className="btn btn-primary btn-large">
          <Save size={20} />
          Save Settings
        </button>
      </div>
    </div>
  );
}

export default Settings;
