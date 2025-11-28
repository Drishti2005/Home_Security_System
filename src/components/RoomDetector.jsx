import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { MapPin, User, AlertTriangle } from 'lucide-react';
import './RoomDetector.css';

function RoomDetector() {
  const [selectedRoom, setSelectedRoom] = useState('');
  const [personName, setPersonName] = useState('');
  const [isKnown, setIsKnown] = useState(false);
  const [knownFaces, setKnownFaces] = useState([]);
  const [detecting, setDetecting] = useState(false);

  const rooms = [
    { id: 'hall', name: 'Hall', icon: '🚪' },
    { id: 'kitchen', name: 'Kitchen', icon: '🍳' },
    { id: 'bedroom', name: 'Bedroom', icon: '🛏️' },
    { id: 'living_room', name: 'Living Room', icon: '🛋️' },
    { id: 'garden', name: 'Garden', icon: '🌳' }
  ];

  useEffect(() => {
    fetchKnownFaces();
  }, []);

  const fetchKnownFaces = async () => {
    try {
      const response = await api.get('/faces');
      setKnownFaces(response.data);
    } catch (error) {
      console.error('Failed to fetch known faces:', error);
    }
  };

  const handleDetect = async () => {
    if (!selectedRoom || !personName) {
      alert('Please select a room and enter a person name');
      return;
    }

    setDetecting(true);

    try {
      const response = await api.post('/detection/detect', {
        room: selectedRoom,
        personName,
        isKnown
      });

      if (response.data.alert) {
        alert(`🚨 ALERT: Unknown person "${personName}" detected in ${selectedRoom}!\nTelegram notification sent!`);
      } else {
        alert(`✅ ${personName} detected in ${selectedRoom}`);
      }

      // Reset form
      setPersonName('');
      setSelectedRoom('');
      setIsKnown(false);
    } catch (error) {
      console.error('Detection failed:', error);
      alert('Failed to log detection');
    } finally {
      setDetecting(false);
    }
  };

  const handleKnownPersonSelect = (face) => {
    setPersonName(face.name);
    setIsKnown(true);
  };

  return (
    <div className="room-detector">
      <div className="detector-header">
        <MapPin size={24} />
        <h3>Room Detection Simulator</h3>
      </div>

      <div className="detector-content">
        <div className="detector-section">
          <label>Select Room</label>
          <div className="room-grid">
            {rooms.map(room => (
              <button
                key={room.id}
                className={`room-button ${selectedRoom === room.id ? 'selected' : ''}`}
                onClick={() => setSelectedRoom(room.id)}
              >
                <span className="room-icon">{room.icon}</span>
                <span>{room.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="detector-section">
          <label>Person Detection</label>
          
          <div className="person-type-toggle">
            <button
              className={`toggle-btn ${!isKnown ? 'active' : ''}`}
              onClick={() => setIsKnown(false)}
            >
              <AlertTriangle size={16} />
              Unknown Person
            </button>
            <button
              className={`toggle-btn ${isKnown ? 'active' : ''}`}
              onClick={() => setIsKnown(true)}
            >
              <User size={16} />
              Known Person
            </button>
          </div>

          {isKnown ? (
            <div className="known-faces-selector">
              <p>Select from known faces:</p>
              <div className="faces-list">
                {knownFaces.map(face => (
                  <button
                    key={face._id}
                    className={`face-button ${personName === face.name ? 'selected' : ''}`}
                    onClick={() => handleKnownPersonSelect(face)}
                  >
                    <div className="face-avatar-tiny">
                      {face.imagePath ? (
                        <img src={face.imagePath} alt={face.name} />
                      ) : (
                        face.name[0]
                      )}
                    </div>
                    <span>{face.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <input
              type="text"
              placeholder="Enter unknown person name (e.g., Stranger 1)"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="person-input"
            />
          )}
        </div>

        <button
          onClick={handleDetect}
          disabled={detecting || !selectedRoom || !personName}
          className="btn btn-primary btn-detect"
        >
          {detecting ? 'Detecting...' : '🎯 Detect Person in Room'}
        </button>
      </div>
    </div>
  );
}

export default RoomDetector;
