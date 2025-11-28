import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, AlertTriangle, Activity, Users, TrendingUp } from 'lucide-react';
import RoomDetector from '../components/RoomDetector';
import DoorAccess from '../components/DoorAccess';
import PendingFaces from '../components/PendingFaces';
import './Dashboard.css';

function Dashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/system/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleArm = async () => {
    try {
      await api.post('/system/arm', { armed: !status.armed });
      fetchStatus();
    } catch (error) {
      console.error('Failed to toggle arm:', error);
    }
  };

  const simulateIntruder = async () => {
    try {
      await api.post('/system/simulate-intruder');
      fetchStatus();
    } catch (error) {
      console.error('Failed to simulate:', error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const riskLevel = status.riskScore > 70 ? 'high' : status.riskScore > 40 ? 'medium' : 'low';

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Security Dashboard</h1>
        <div className="header-actions">
          <button 
            onClick={toggleArm}
            className={`btn ${status.armed ? 'btn-danger' : 'btn-success'}`}
          >
            {status.armed ? '🔴 Disarm System' : '🟢 Arm System'}
          </button>
          <button onClick={simulateIntruder} className="btn btn-primary">
            🚨 Simulate Intruder
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <Shield size={24} color="#2563eb" />
          </div>
          <div className="stat-content">
            <div className="stat-label">System Status</div>
            <div className="stat-value">{status.armed ? 'Armed' : 'Disarmed'}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: riskLevel === 'high' ? '#fee2e2' : riskLevel === 'medium' ? '#fef3c7' : '#dcfce7' }}>
            <AlertTriangle size={24} color={riskLevel === 'high' ? '#dc2626' : riskLevel === 'medium' ? '#f59e0b' : '#16a34a'} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Risk Score</div>
            <div className="stat-value">{status.riskScore}/100</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f3e8ff' }}>
            <Activity size={24} color="#9333ea" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Alert Mode</div>
            <div className="stat-value">{status.alertMode}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>
            <TrendingUp size={24} color="#f59e0b" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Recent Events</div>
            <div className="stat-value">{status.recentEvents?.length || 0}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h2>📋 Recent Activity</h2>
          <div className="events-list">
            {status.recentEvents?.length > 0 ? (
              status.recentEvents.map(event => (
                <div key={event._id || event.id} className="event-item">
                  <span className={`badge badge-${event.riskLevel || event.risk_level}`}>
                    {event.riskLevel || event.risk_level}
                  </span>
                  <span className="event-description">{event.description}</span>
                  <span className="event-time">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="no-data">No recent events</p>
            )}
          </div>
        </div>

        <PendingFaces />
      </div>

      <div className="dashboard-grid">
        <RoomDetector />
        <DoorAccess />
      </div>
    </div>
  );
}

export default Dashboard;
