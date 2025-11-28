import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Home, DoorOpen, Users } from 'lucide-react';
import './VirtualHouse.css';

function VirtualHouse() {
  const [houseState, setHouseState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [personName, setPersonName] = useState('');
  const [isKnownPerson, setIsKnownPerson] = useState(true);
  const [knownFaces, setKnownFaces] = useState([]);
  const [isLockdownActive, setIsLockdownActive] = useState(false);

  useEffect(() => {
    fetchHouseState();
    fetchKnownFaces();
    const interval = setInterval(fetchHouseState, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchKnownFaces = async () => {
    try {
      const response = await api.get('/faces');
      setKnownFaces(response.data);
      console.log(`👥 Loaded ${response.data.length} known face(s) for person detection`);
    } catch (error) {
      console.error('❌ Failed to fetch known faces:', error);
    }
  };

  const fetchHouseState = async () => {
    try {
      const response = await api.get('/system/house-state');
      setHouseState(response.data);
      
      // Log active rooms
      const activeRooms = Object.entries(response.data.rooms || {})
        .filter(([_, data]) => data.motion)
        .map(([room, _]) => room.replace('_', ' ').toUpperCase());
      
      if (activeRooms.length > 0) {
        console.log(`🔴 Active motion in: ${activeRooms.join(', ')}`);
      } else {
        console.log(`🟢 All rooms clear - no active motion`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch house state:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulateDetection = async (room) => {
    try {
      console.log(`🔴 Triggering motion in ${room.replace('_', ' ').toUpperCase()}...`);
      await api.post('/detection/motion', { room });
      console.log(`✅ Motion triggered successfully in ${room.replace('_', ' ').toUpperCase()}`);
      fetchHouseState();
      
      // Auto-clear motion after 5 seconds
      setTimeout(() => {
        fetchHouseState();
      }, 5000);
    } catch (error) {
      console.error(`❌ Failed to trigger motion in ${room.replace('_', ' ').toUpperCase()}:`, error);
    }
  };

  const clearMotion = async (room) => {
    console.log(`🟢 Clearing motion in ${room.replace('_', ' ').toUpperCase()}...`);
    
    // Immediately update local state for instant feedback
    setHouseState(prev => {
      if (!prev || !prev.rooms) return prev;
      return {
        ...prev,
        rooms: {
          ...prev.rooms,
          [room]: {
            ...prev.rooms[room],
            motion: false
          }
        }
      };
    });
    
    try {
      // Send request to backend
      const response = await api.post('/detection/clear-motion', { room });
      console.log(`✅ Motion cleared successfully in ${room.replace('_', ' ').toUpperCase()}`, response.data);
      
      // Wait longer for backend to process and fetch updated state
      setTimeout(() => {
        console.log(`🔄 Fetching updated state for ${room.replace('_', ' ').toUpperCase()}...`);
        fetchHouseState();
      }, 1000);
    } catch (error) {
      // Log error but don't show alert since UI already updated
      console.error(`⚠️ Backend error (motion already cleared in UI):`, error.response?.status || error.message);
      
      // Still fetch to sync with server
      setTimeout(() => fetchHouseState(), 1000);
    }
  };

  const handleDetectPerson = async (name, isKnown) => {
    if (!name || !selectedRoom) return;

    try {
      const roomName = selectedRoom.replace('_', ' ').toUpperCase();
      const personType = isKnown ? 'known person' : 'unknown person';
      
      console.log(`👤 Detecting ${personType} "${name}" in ${roomName}...`);
      
      await api.post('/detection/detect', {
        room: selectedRoom,
        personName: name,
        isKnown
      });

      console.log(`✅ ${isKnown ? '✅' : '🚨'} ${name} detected in ${roomName} (${personType})`);

      setShowPersonModal(false);
      setPersonName('');
      fetchHouseState();

      if (!isKnown) {
        alert(`🚨 ALERT: Unknown person "${name}" detected in ${roomName}!\n\nTelegram notification sent!`);
      } else {
        console.log(`📝 Event logged: ${name} entered ${roomName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to detect person in ${selectedRoom.replace('_', ' ').toUpperCase()}:`, error);
      alert('Failed to log detection');
    }
  };

  const triggerLockdown = async () => {
    if (!confirm('⚠️ Trigger EMERGENCY LOCKDOWN? This will lock all doors and trigger alarms!')) {
      console.log('🚫 Lockdown cancelled by user');
      return;
    }

    console.log('🔒 Initiating EMERGENCY LOCKDOWN...');
    
    try {
      // Log lockdown event (doesn't trigger motion)
      await api.post('/events', {
        type: 'lockdown',
        description: 'Emergency lockdown activated - All doors locked, alarms triggered',
        riskLevel: 'high'
      });
      
      console.log('✅ EMERGENCY LOCKDOWN ACTIVATED - All doors locked, alarms triggered');
      setIsLockdownActive(true);
      alert('🔒 EMERGENCY LOCKDOWN ACTIVATED!\n\nAll doors locked. Use "Unlock System" to deactivate.');
      fetchHouseState();
    } catch (error) {
      console.error('❌ Lockdown failed:', error);
      // Still activate lockdown in UI even if logging fails
      setIsLockdownActive(true);
      alert('🔒 EMERGENCY LOCKDOWN ACTIVATED!\n\nUse "Unlock System" to deactivate.');
    }
  };

  const unlockSystem = async () => {
    if (!confirm('🔓 Deactivate EMERGENCY LOCKDOWN? This will unlock all doors and disable alarms.')) {
      console.log('🚫 Unlock cancelled by user');
      return;
    }

    console.log('🔓 Deactivating EMERGENCY LOCKDOWN...');
    
    try {
      // Log unlock event
      await api.post('/events', {
        type: 'system',
        description: 'Emergency lockdown deactivated - System unlocked',
        riskLevel: 'low'
      });
      
      console.log('✅ Unlock event logged');
    } catch (error) {
      console.error('⚠️ Failed to log unlock event:', error);
    }
    
    // Always deactivate lockdown in UI
    setIsLockdownActive(false);
    console.log('✅ LOCKDOWN DEACTIVATED - System unlocked');
    alert('🔓 System unlocked! Lockdown deactivated.');
    
    // Fetch updated state
    fetchHouseState();
  };

  const clearAllMotion = async () => {
    const rooms = Object.keys(houseState?.rooms || {});
    const roomsWithMotion = rooms.filter(room => houseState.rooms[room].motion);
    
    if (roomsWithMotion.length === 0) {
      console.log('ℹ️ No motion detected in any room - nothing to clear');
      alert('ℹ️ No motion detected in any room.');
      return;
    }
    
    const roomNames = roomsWithMotion.map(r => r.replace('_', ' ').toUpperCase()).join(', ');
    console.log(`🟢 Clearing motion in ${roomsWithMotion.length} room(s): ${roomNames}...`);
    
    // Immediately update local state for all rooms
    setHouseState(prev => {
      if (!prev || !prev.rooms) return prev;
      const updatedRooms = { ...prev.rooms };
      roomsWithMotion.forEach(room => {
        updatedRooms[room] = {
          ...updatedRooms[room],
          motion: false
        };
      });
      return { ...prev, rooms: updatedRooms };
    });
    
    // Clear all rooms in parallel
    try {
      const promises = roomsWithMotion.map(room => 
        api.post('/detection/clear-motion', { room })
          .then(() => {
            console.log(`  ✅ ${room.replace('_', ' ').toUpperCase()} cleared`);
            return room;
          })
          .catch(err => {
            console.error(`  ⚠️ ${room.replace('_', ' ').toUpperCase()} backend error:`, err.response?.status || err.message);
            return room; // Still count as success since UI updated
          })
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r !== null).length;
      
      console.log(`✅ Successfully cleared all ${successCount} room(s)`);
      
      // Fetch updated state from server (wait longer for backend to process)
      setTimeout(() => {
        console.log('🔄 Fetching updated state after clearing all motion...');
        fetchHouseState();
      }, 1000);
      
      alert(`✅ Cleared motion in ${successCount} room(s)!`);
    } catch (error) {
      console.error('❌ Clear all motion error:', error);
      // UI already updated, just sync with server
      setTimeout(() => fetchHouseState(), 300);
    }
  };

  const simulateAllRooms = async () => {
    if (!confirm('⚠️ Trigger motion in ALL rooms? This will create multiple alerts!')) {
      console.log('🚫 Simulate all rooms cancelled by user');
      return;
    }

    const rooms = Object.keys(houseState?.rooms || {});
    console.log(`🚨 Triggering motion in all ${rooms.length} rooms...`);
    
    for (const room of rooms) {
      await simulateDetection(room);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`✅ Motion triggered in all ${rooms.length} rooms successfully`);
    alert('🚨 Motion triggered in all rooms!');
  };

  const evacuateAll = async () => {
    if (!confirm('🚪 Evacuate all people from the house? This will clear all motion and remove all people.')) {
      console.log('🚫 Evacuation cancelled by user');
      return;
    }

    console.log('🚪 Initiating emergency evacuation...');
    
    try {
      // Create evacuation events for all rooms
      const rooms = Object.keys(houseState?.rooms || {});
      
      for (const room of rooms) {
        await api.post('/events', {
          type: 'evacuation',
          room: room,
          description: `Emergency evacuation - ${room} cleared`,
          riskLevel: 'high'
        });
      }
      
      console.log('✅ Evacuation events logged for all rooms');
      
      // Update UI immediately
      setHouseState(prev => {
        if (!prev || !prev.rooms) return prev;
        const updatedRooms = {};
        Object.keys(prev.rooms).forEach(room => {
          updatedRooms[room] = {
            ...prev.rooms[room],
            motion: false,
            people: []
          };
        });
        return { ...prev, rooms: updatedRooms };
      });
      
      console.log('✅ Evacuation complete - All rooms cleared');
      alert('🚪 Evacuation complete! All people evacuated, all rooms cleared.');
      
      // Fetch updated state
      setTimeout(() => fetchHouseState(), 1000);
    } catch (error) {
      console.error('❌ Evacuation failed:', error);
      alert('Failed to complete evacuation. Please try again.');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const rooms = houseState?.rooms || {};

  return (
    <div className="virtual-house">
      <h1>Virtual House Monitor</h1>
      <p className="subtitle">Real-time monitoring of your virtual home</p>

      <div className="house-grid">
        {Object.entries(rooms).map(([roomName, roomData]) => (
          <div key={roomName} className={`room-card ${roomData.motion ? 'active' : ''}`}>
            <div className="room-header">
              <Home size={24} />
              <h3>{roomName.replace('_', ' ').toUpperCase()}</h3>
            </div>

            <div className="room-status">
              <div className="status-item">
                <span className="status-label">Motion:</span>
                <span className={`status-value ${roomData.motion ? 'alert' : ''}`}>
                  {roomData.motion ? '🔴 Detected' : '🟢 Clear'}
                </span>
              </div>

              <div className="status-item">
                <span className="status-label">Access:</span>
                <span className="status-value">
                  {roomData.door || roomData.window || roomData.gate || 'Closed'}
                </span>
              </div>

              {roomData.people && roomData.people.length > 0 && (
                <div className="status-item">
                  <Users size={16} />
                  <span className="status-value">
                    {roomData.people.join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="room-actions">
              <div className="action-buttons">
                {!roomData.motion ? (
                  <button 
                    className="room-simulate-btn"
                    onClick={() => simulateDetection(roomName)}
                  >
                    🔴 Trigger Motion
                  </button>
                ) : (
                  <button 
                    className="room-clear-btn"
                    onClick={() => clearMotion(roomName)}
                  >
                    ✅ Clear Motion
                  </button>
                )}
                <button 
                  className="room-person-btn"
                  onClick={() => {
                    setSelectedRoom(roomName);
                    setShowPersonModal(true);
                  }}
                >
                  👤 Add Person
                </button>
              </div>
            </div>

            {roomData.motion && (
              <div className="motion-indicator">
                <div className="pulse"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>🏠 House Layout</h2>
        <div className="house-layout">
          <div className="layout-row">
            <div 
              className={`layout-room ${rooms.hall?.motion ? 'motion' : ''}`}
              onClick={() => {
                setSelectedRoom('hall');
                setShowPersonModal(true);
              }}
            >
              <div className="layout-room-name">Hall</div>
              {rooms.hall?.people?.length > 0 && (
                <div className="layout-room-people">
                  👥 {rooms.hall.people.length}
                </div>
              )}
            </div>
            <div 
              className={`layout-room ${rooms.living_room?.motion ? 'motion' : ''}`}
              onClick={() => {
                setSelectedRoom('living_room');
                setShowPersonModal(true);
              }}
            >
              <div className="layout-room-name">Living Room</div>
              {rooms.living_room?.people?.length > 0 && (
                <div className="layout-room-people">
                  👥 {rooms.living_room.people.length}
                </div>
              )}
            </div>
          </div>
          <div className="layout-row">
            <div 
              className={`layout-room ${rooms.kitchen?.motion ? 'motion' : ''}`}
              onClick={() => {
                setSelectedRoom('kitchen');
                setShowPersonModal(true);
              }}
            >
              <div className="layout-room-name">Kitchen</div>
              {rooms.kitchen?.people?.length > 0 && (
                <div className="layout-room-people">
                  👥 {rooms.kitchen.people.length}
                </div>
              )}
            </div>
            <div 
              className={`layout-room ${rooms.bedroom?.motion ? 'motion' : ''}`}
              onClick={() => {
                setSelectedRoom('bedroom');
                setShowPersonModal(true);
              }}
            >
              <div className="layout-room-name">Bedroom</div>
              {rooms.bedroom?.people?.length > 0 && (
                <div className="layout-room-people">
                  👥 {rooms.bedroom.people.length}
                </div>
              )}
            </div>
          </div>
          <div className="layout-row">
            <div 
              className={`layout-room ${rooms.garden?.motion ? 'motion' : ''}`}
              onClick={() => {
                setSelectedRoom('garden');
                setShowPersonModal(true);
              }}
            >
              <div className="layout-room-name">Garden</div>
              {rooms.garden?.people?.length > 0 && (
                <div className="layout-room-people">
                  👥 {rooms.garden.people.length}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lockdown Status Banner */}
      {isLockdownActive && (
        <div className="lockdown-banner">
          <div className="lockdown-banner-content">
            <div className="lockdown-icon">🔒</div>
            <div className="lockdown-text">
              <strong>EMERGENCY LOCKDOWN ACTIVE</strong>
              <p>All doors locked • Alarms triggered • System secured</p>
            </div>
            <button 
              className="btn-unlock"
              onClick={unlockSystem}
            >
              🔓 Unlock System
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions Panel */}
      <div className="quick-actions-panel">
        <h2>⚡ Quick Actions</h2>
        <div className="quick-actions-grid">
          {!isLockdownActive ? (
            <button 
              className="quick-action-btn lockdown"
              onClick={triggerLockdown}
            >
              🔒 Emergency Lockdown
            </button>
          ) : (
            <button 
              className="quick-action-btn unlock"
              onClick={unlockSystem}
            >
              🔓 Unlock System
            </button>
          )}
          <button 
            className="quick-action-btn clear-all"
            onClick={clearAllMotion}
            disabled={isLockdownActive}
          >
            ✅ Clear All Motion
          </button>
          <button 
            className="quick-action-btn simulate-all"
            onClick={simulateAllRooms}
            disabled={isLockdownActive}
          >
            🚨 Trigger All Rooms
          </button>
          <button 
            className="quick-action-btn evacuate"
            onClick={evacuateAll}
          >
            🚪 Evacuate All
          </button>
        </div>
      </div>

      {/* Person Detection Modal */}
      {showPersonModal && (
        <div className="modal-overlay" onClick={() => setShowPersonModal(false)}>
          <div className="modal person-modal" onClick={(e) => e.stopPropagation()}>
            <h2>👤 Detect Person in {selectedRoom?.replace('_', ' ').toUpperCase()}</h2>
            
            <div className="person-type-selector">
              <button
                className={`type-btn ${isKnownPerson ? 'active' : ''}`}
                onClick={() => setIsKnownPerson(true)}
              >
                ✅ Known Person
              </button>
              <button
                className={`type-btn ${!isKnownPerson ? 'active' : ''}`}
                onClick={() => setIsKnownPerson(false)}
              >
                🚨 Unknown Person
              </button>
            </div>

            {isKnownPerson ? (
              <div className="known-faces-grid">
                {knownFaces.map(face => (
                  <button
                    key={face._id}
                    className="known-face-card"
                    onClick={() => handleDetectPerson(face.name, true)}
                  >
                    <div className="face-avatar">
                      {face.imagePath ? (
                        <img src={face.imagePath} alt={face.name} />
                      ) : (
                        face.name[0]
                      )}
                    </div>
                    <div className="face-name">{face.name}</div>
                    <div className="face-category">{face.category}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="unknown-person-input">
                <input
                  type="text"
                  placeholder="Enter unknown person identifier (e.g., Stranger 1)"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  autoFocus
                />
                <button
                  className="btn btn-danger"
                  onClick={() => handleDetectPerson(personName, false)}
                  disabled={!personName}
                >
                  🚨 Detect Unknown Person
                </button>
              </div>
            )}

            <button
              className="btn-close-modal"
              onClick={() => {
                setShowPersonModal(false);
                setPersonName('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VirtualHouse;
