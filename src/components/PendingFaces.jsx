import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { UserPlus, X, Check, AlertCircle } from 'lucide-react';
import './PendingFaces.css';

function PendingFaces() {
  const [pendingFaces, setPendingFaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingFaces();
    const interval = setInterval(fetchPendingFaces, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingFaces = async () => {
    try {
      const response = await api.get('/faces/pending');
      setPendingFaces(response.data || []);
    } catch (error) {
      console.error('Failed to fetch pending faces:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveFace = async (faceId, name) => {
    try {
      await api.post(`/faces/${faceId}/approve`, {
        name,
        category: 'resident',
        accessAllowed: true
      });
      fetchPendingFaces();
    } catch (error) {
      console.error('Failed to approve face:', error);
      alert('Failed to approve face');
    }
  };

  const rejectFace = async (faceId) => {
    try {
      await api.delete(`/faces/${faceId}`);
      fetchPendingFaces();
    } catch (error) {
      console.error('Failed to reject face:', error);
      alert('Failed to reject face');
    }
  };

  if (loading) {
    return (
      <div className="pending-faces loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (pendingFaces.length === 0) {
    return (
      <div className="pending-faces empty">
        <AlertCircle size={48} color="#9ca3af" />
        <p>No pending faces to review</p>
      </div>
    );
  }

  return (
    <div className="pending-faces">
      <div className="pending-header">
        <UserPlus size={24} />
        <h3>⏳ Pending Approvals</h3>
        <span className="pending-count">{pendingFaces.length}</span>
      </div>

      <div className="pending-list">
        {pendingFaces.map(face => (
          <PendingFaceCard
            key={face._id}
            face={face}
            onApprove={approveFace}
            onReject={rejectFace}
          />
        ))}
      </div>
    </div>
  );
}

function PendingFaceCard({ face, onApprove, onReject }) {
  const [name, setName] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleApprove = () => {
    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }
    onApprove(face._id, name);
    setShowInput(false);
    setName('');
  };

  return (
    <div className="pending-card">
      <div className="pending-image">
        {face.imagePath ? (
          <img src={face.imagePath} alt="Unknown" />
        ) : (
          <div className="no-image">?</div>
        )}
      </div>

      <div className="pending-info">
        <div className="pending-label">Unknown Person</div>
        <div className="pending-time">
          Detected {new Date(face.detectedAt || Date.now()).toLocaleString()}
        </div>
        
        {showInput ? (
          <div className="name-input-group">
            <input
              type="text"
              placeholder="Enter name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="name-input"
              autoFocus
            />
          </div>
        ) : null}
      </div>

      <div className="pending-actions">
        {!showInput ? (
          <>
            <button
              className="btn-approve"
              onClick={() => setShowInput(true)}
              title="Approve"
            >
              <Check size={18} />
              Approve
            </button>
            <button
              className="btn-reject"
              onClick={() => onReject(face._id)}
              title="Reject"
            >
              <X size={18} />
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-confirm"
              onClick={handleApprove}
            >
              <Check size={18} />
              Confirm
            </button>
            <button
              className="btn-cancel"
              onClick={() => {
                setShowInput(false);
                setName('');
              }}
            >
              <X size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default PendingFaces;
