import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Analytics.css';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea'];

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="analytics-page">
      <h1>Analytics Dashboard</h1>
      <p className="subtitle">Security insights and trends</p>

      <div className="analytics-grid">
        <div className="card">
          <h2>Events by Day (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.eventsByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Events by Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.eventsByType}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {analytics.eventsByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Risk Score Trend (24 Hours)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.riskTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="avg_risk" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Detection Statistics</h2>
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-number">{analytics.detectionStats.known || 0}</div>
              <div className="stat-label">Known Faces</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">{analytics.detectionStats.unknown || 0}</div>
              <div className="stat-label">Unknown Faces</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Current Risk Assessment</h2>
          <div className="risk-display">
            <div className={`risk-score risk-${analytics.currentRisk.level}`}>
              {analytics.currentRisk.score}
            </div>
            <div className="risk-level">{analytics.currentRisk.level.toUpperCase()}</div>
            <div className="risk-factors">
              <h3>Risk Factors:</h3>
              <ul>
                <li>High Risk Events: {analytics.currentRisk.factors.highRiskEvents || 0}</li>
                <li>Medium Risk Events: {analytics.currentRisk.factors.mediumRiskEvents || 0}</li>
                <li>Unknown Faces: {analytics.currentRisk.factors.unknownFaces || 0}</li>
                <li>Night Time: {analytics.currentRisk.factors.nightTime ? 'Yes' : 'No'}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Frequent Visitors</h2>
          <div className="visitors-list">
            {analytics.frequentVisitors.map((visitor, index) => (
              <div key={index} className="visitor-item">
                <div className="visitor-rank">#{index + 1}</div>
                <div className="visitor-info">
                  <div className="visitor-name">{visitor.name}</div>
                  <div className="visitor-category">{visitor.category}</div>
                </div>
                <div className="visitor-count">{visitor.visit_count} visits</div>
              </div>
            ))}
          </div>
          {analytics.frequentVisitors.length === 0 && (
            <p className="no-data">No visitor data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analytics;
