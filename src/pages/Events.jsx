import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Clock, Filter, Download } from 'lucide-react';
import './Events.css';

function Events() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events');
      let data = response.data.events;
      
      if (filter !== 'all') {
        data = data.filter(e => e.type === filter);
      }
      
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const response = await api.get('/analytics/export');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-logs-${new Date().toISOString()}.json`;
      a.click();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const clearEvents = async () => {
    if (!confirm('Are you sure you want to clear all events?')) return;
    try {
      await api.delete('/events/clear');
      fetchEvents();
    } catch (error) {
      console.error('Failed to clear events:', error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="events-page">
      <div className="page-header">
        <div>
          <h1>Event Timeline</h1>
          <p className="subtitle">Complete history of security events</p>
        </div>
        <div className="header-actions">
          <button onClick={exportLogs} className="btn btn-primary">
            <Download size={18} />
            Export
          </button>
          <button onClick={clearEvents} className="btn btn-danger">
            Clear All
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <Filter size={18} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Events</option>
            <option value="motion">Motion</option>
            <option value="unknown_face">Unknown Face</option>
            <option value="intruder">Intruder</option>
            <option value="system">System</option>
            <option value="fire">Fire</option>
            <option value="forced_entry">Forced Entry</option>
          </select>
        </div>

        <div className="timeline">
          {events.map(event => (
            <div key={event.id} className="timeline-item">
              <div className="timeline-marker">
                <div className={`marker-dot ${event.risk_level}`}></div>
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className={`badge badge-${event.risk_level}`}>
                    {event.type.replace('_', ' ')}
                  </span>
                  <span className="timeline-time">
                    <Clock size={14} />
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="timeline-description">{event.description}</p>
                {event.room && (
                  <span className="timeline-room">📍 {event.room}</span>
                )}
                {event.person_name && (
                  <span className="timeline-person">👤 {event.person_name}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="no-data">
            <p>No events found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Events;
