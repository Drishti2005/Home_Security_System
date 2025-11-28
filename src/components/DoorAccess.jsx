import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DoorOpen, DoorClosed, Lock, Unlock, CheckCircle, XCircle } from 'lucide-react';
import './DoorAccess.css';

function DoorAccess() {
  const [doorStatus, setDoorStatus] = useState('locked'); // locked, unlocked, opening
  const [lastAccess, setLastAccess] = useState(null);
  const [accessLog, setAccessLog] = useState([]);
  const [knownFaces, setKnownFaces] = useState([]);

  useEffect(() => {
    fetchKnownFaces();
    fetchAccessLog();
  }, []);

  const fetchKnownFaces = async () => {
    try {
      const response = await api.get('/faces');
      setKnownFaces(response.data);
    } catch (error) {
      console.error('Failed to fetch faces:', error);
    }
  };

  const fetchAccessLog = async () => {
    try {
      const response = await api.get('/events/type/door_access');
      setAccessLog(response.data.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch access log:', error);
    }
  };

  const toggleAccess = async (faceId, currentStatus) => {
    try {
      await api.patch(`/faces/${faceId}/access`, {
        accessAllowed: !currentStatus
      });
      fetchKnownFaces();
    } catch (error) {
      console.error('Failed to toggle access:', error);
    }
  };

  const simulateDoorAccess = async (person, granted) => {
    try {
      if (granted) {
        setDoorStatus('opening');
        setTimeout(() => {
          setDoorStatus('unlocked');
          setTimeout(() => {
            setDoorStatus('locked');
          }, 3000);
        }, 1000);
      }

      // Log access attempt
      await api.post('/events', {
        type: 'door_access',
        personName: person.name,
        personId: person._id,
        riskLevel: granted ? 'low' : 'high',
        description: granted 
          ? `✅ Door access granted to ${person.name}`
          : `🚫 Door access denied to ${person.name}`
      });

      setLastAccess({
        person: person.name,
        granted,
        time: new Date()
      });

      fetchAccessLog();
    } catch (error) {
      console.error('Failed to log access:', error);
    }
  };

  return (
    <div className="door-access">
      <div className="door-header">
        <h3>
          {doorStatus === 'locked' ? <Lock size={24} /> : <Unlock size={24} />}
          Door Access Control
        </h3>
      </div>

      <div className="door-status-display">
        <div className={`door-icon ${doorStatus}`}>
          {doorStatus === 'locked' ? (
            <DoorClosed size={64} />
          ) : (
            <DoorOpen size={64} />
          )}
        </div>
        <div className="door-status-text">
          <h2>{doorStatus.toUpperCase()}</h2>
          {lastAccess && (
            <p className={lastAccess.granted ? 'access-granted' : 'access-denied'}>
              {lastAccess.granted ? '✅' : '🚫'} {lastAccess.person} - {lastAccess.time.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div className="access-permissions">
        <h4>Access Permissions</h4>
        <div className="permissions-list">
          {knownFaces.map(face => (
            <div key={face._id} className="permission-item">
              <div className="permission-info">
                <div className="permission-avatar">
                  {face.imagePath ? (
                    <img src={face.imagePath} alt={face.name} />
                  ) : (
                    face.name[0]
                  )}
                </div>
                <div>
                  <div className="permission-name">{face.name}</div>
                  <div className="permission-category">{face.category}</div>
                </div>
              </div>
              <div className="permission-actions">
                <button
                  className={`btn-access ${face.accessAllowed ? 'allowed' : 'denied'}`}
                  onClick={() => toggleAccess(face._id, face.accessAllowed)}
                >
                  {face.accessAllowed ? (
                    <>
                      <CheckCircle size={16} />
                      Allowed
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      Denied
                    </>
                  )}
                </button>
                <button
                  className="btn-test"
                  onClick={() => simulateDoorAccess(face, face.accessAllowed)}
                >
                  Test Access
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="access-log">
        <h4>Recent Access Log</h4>
        <div className="log-list">
          {accessLog.map(log => (
            <div key={log._id} className="log-item">
              <span className={`log-icon ${log.riskLevel === 'low' ? 'granted' : 'denied'}`}>
                {log.riskLevel === 'low' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              </span>
              <span className="log-description">{log.description}</span>
              <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DoorAccess;
