import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { UserPlus, Trash2, Edit2 } from 'lucide-react';
import './KnownFaces.css';

function KnownFaces() {
  const [faces, setFaces] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: 'guest', notes: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFaces();
  }, []);

  const fetchFaces = async () => {
    try {
      const response = await api.get('/faces');
      setFaces(response.data);
    } catch (error) {
      console.error('Failed to fetch faces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/faces', formData);
      setShowModal(false);
      setFormData({ name: '', category: 'guest', notes: '' });
      fetchFaces();
    } catch (error) {
      console.error('Failed to add face:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this person? This will remove them from all events.')) return;
    try {
      const response = await api.delete(`/faces/${id}`);
      alert(response.data.message || 'Person deleted successfully!');
      fetchFaces();
    } catch (error) {
      console.error('Failed to delete face:', error);
      alert('Failed to delete person. Please try again.');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="known-faces">
      <div className="page-header">
        <div>
          <h1>Known Faces</h1>
          <p className="subtitle">Manage recognized people</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <UserPlus size={18} />
          Add Person
        </button>
      </div>

      <div className="faces-grid">
        {faces.map(face => (
          <div key={face._id || face.id} className="face-card">
            <div className="face-avatar">
              {face.imagePath || face.image_path ? (
                <img src={face.imagePath || face.image_path} alt={face.name} />
              ) : (
                <div className="avatar-placeholder">{face.name[0]}</div>
              )}
            </div>
            <div className="face-info">
              <h3>{face.name}</h3>
              <span className={`badge badge-${face.category === 'family' ? 'low' : 'medium'}`}>
                {face.category}
              </span>
              <div className="face-stats">
                <span>Visits: {face.visitCount || face.visit_count || 0}</span>
                {(face.lastSeen || face.last_seen) && (
                  <span>Last: {new Date(face.lastSeen || face.last_seen).toLocaleDateString()}</span>
                )}
              </div>
              {face.notes && <p className="face-notes">{face.notes}</p>}
            </div>
            <button onClick={() => handleDelete(face._id || face.id)} className="btn-icon-danger">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {faces.length === 0 && (
        <div className="no-data">
          <p>No known faces yet. Add your first person!</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Person</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="family">Family</option>
                  <option value="guest">Guest</option>
                  <option value="frequent">Frequent Visitor</option>
                  <option value="rare">Rare Visitor</option>
                  <option value="suspicious">Suspicious</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Person
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnownFaces;
