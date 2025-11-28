import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import api from '../services/api';
import { Camera, UserPlus, AlertTriangle, CheckCircle, User } from 'lucide-react';
import './LiveCamera.css';

function LiveCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [knownFaces, setKnownFaces] = useState([]);
  const [recognizedPeople, setRecognizedPeople] = useState([]);
  const [labeledDescriptors, setLabeledDescriptors] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonCategory, setNewPersonCategory] = useState('guest');
  const [lastAlertTime, setLastAlertTime] = useState({});

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchKnownFaces();
    }
  }, [isLoading]);

  const loadModels = async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      console.log('✅ Face detection models loaded');
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading models:', error);
      alert('Failed to load face detection models. Using simulation mode.');
      setIsLoading(false);
    }
  };

  const fetchKnownFaces = async () => {
    try {
      const response = await api.get('/faces');
      setKnownFaces(response.data);
      
      // Load face descriptors for recognition
      if (response.data.length > 0) {
        await loadFaceDescriptors(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch known faces:', error);
    }
  };

  const loadFaceDescriptors = async (faces) => {
    try {
      // In a real system, you would load saved face descriptors from the database
      // For demo, we'll create a simple recognition system
      console.log(`📊 Loaded ${faces.length} known faces for recognition`);
    } catch (error) {
      console.error('Failed to load face descriptors:', error);
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 560 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Cannot access camera. Please allow camera permissions.');
    }
  };

  const handleVideoPlay = () => {
    if (isDetecting) {
      detectFaces();
    }
  };

  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const displaySize = {
      width: video.videoWidth,
      height: video.videoHeight
    };

    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      if (!isDetecting) return;

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw detections
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

      // Recognize faces
      if (detections.length > 0) {
        setDetectedFaces(detections);
        await recognizeFaces(detections, ctx, displaySize);
      } else {
        setRecognizedPeople([]);
      }
    }, 1000); // Check every second
  };

  const recognizeFaces = async (detections, ctx, displaySize) => {
    const recognized = [];
    
    for (let i = 0; i < detections.length; i++) {
      const detection = detections[i];
      const box = detection.detection.box;
      
      // Simple recognition: Check if we have this person in known faces
      // In production, you would compare face descriptors
      const matchedPerson = await checkIfKnown(detection);
      
      if (matchedPerson) {
        // Known person - show name and category
        recognized.push({
          name: matchedPerson.name,
          category: matchedPerson.category,
          box: box
        });
        
        // Draw name label
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: `${matchedPerson.name} (${matchedPerson.category})`,
          boxColor: '#16a34a',
          lineWidth: 3
        });
        drawBox.draw(canvasRef.current);
        
        // Log known person detection
        await logKnownPerson(matchedPerson);
      } else {
        // Unknown person - send alert with image
        recognized.push({
          name: 'Unknown Person',
          category: 'unknown',
          box: box
        });
        
        // Draw warning label
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: '⚠️ UNKNOWN PERSON',
          boxColor: '#dc2626',
          lineWidth: 3
        });
        drawBox.draw(canvasRef.current);
        
        // Send alert with image (throttled to avoid spam)
        await sendUnknownAlert(detection);
      }
    }
    
    setRecognizedPeople(recognized);
  };

  const checkIfKnown = async (detection) => {
    try {
      // Get face descriptor from detection
      if (!detection.descriptor) {
        return null;
      }

      const faceDescriptor = Array.from(detection.descriptor);

      // Send to backend for recognition
      const response = await api.post('/faces/recognize', {
        faceDescriptor
      });

      if (response.data.recognized) {
        return response.data.person;
      }

      return null;
    } catch (error) {
      console.error('Recognition error:', error);
      return null;
    }
  };

  const logKnownPerson = async (person) => {
    try {
      // Throttle logging - only log once per minute per person
      const now = Date.now();
      const lastLog = lastAlertTime[person._id] || 0;
      
      if (now - lastLog < 60000) return; // 1 minute throttle
      
      setLastAlertTime(prev => ({ ...prev, [person._id]: now }));
      
      await api.post('/detection/detect', {
        room: 'camera_feed',
        personName: person.name,
        isKnown: true
      });
      
      console.log(`✅ Known person detected: ${person.name} (${person.category})`);
    } catch (error) {
      console.error('Failed to log known person:', error);
    }
  };

  const sendUnknownAlert = async (detection) => {
    try {
      // Capture image of unknown person
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Get face descriptor
      const faceDescriptor = detection.descriptor ? Array.from(detection.descriptor) : null;

      // Send to backend with image and descriptor
      const blob = await fetch(imageData).then(r => r.blob());
      const formData = new FormData();
      formData.append('image', blob, 'unknown_face.jpg');
      formData.append('room', 'camera_feed');
      formData.append('personName', 'Unknown Person');
      
      if (faceDescriptor) {
        formData.append('faceDescriptor', JSON.stringify(faceDescriptor));
      }
      
      const response = await api.post('/detection/unknown-with-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.isNewUnknown) {
        console.log('🚨 NEW unknown person detected! Photo sent to Telegram!');
        alert('🚨 ALERT: NEW unknown person detected!\n\n📸 Photo sent to Telegram!');
      } else {
        console.log(`ℹ️  Same unknown person detected again (${response.data.detectionCount} times)`);
        // No alert for same person
      }
    } catch (error) {
      console.error('Failed to send unknown alert:', error);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageData);
    setShowAddModal(true);
  };

  const handleAddPerson = async () => {
    if (!newPersonName || !capturedImage) return;

    try {
      // Get face descriptor from current detection
      let faceDescriptor = null;
      if (detectedFaces.length > 0 && detectedFaces[0].descriptor) {
        faceDescriptor = Array.from(detectedFaces[0].descriptor);
      }

      // Convert base64 to blob
      const blob = await fetch(capturedImage).then(r => r.blob());
      const formData = new FormData();
      formData.append('image', blob, 'face.jpg');
      formData.append('name', newPersonName);
      formData.append('category', newPersonCategory);
      
      if (faceDescriptor) {
        formData.append('faceDescriptor', JSON.stringify(faceDescriptor));
      }

      await api.post('/faces', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(`✅ ${newPersonName} added to known faces with face recognition!`);
      setShowAddModal(false);
      setCapturedImage(null);
      setNewPersonName('');
      fetchKnownFaces();
    } catch (error) {
      console.error('Failed to add person:', error);
      alert('Failed to add person. Please try again.');
    }
  };

  const toggleDetection = () => {
    if (!isDetecting) {
      startVideo();
      setIsDetecting(true);
    } else {
      setIsDetecting(false);
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    }
  };

  return (
    <div className="live-camera">
      <div className="camera-header">
        <h1>
          <Camera size={32} />
          Live Camera Feed
        </h1>
        <p className="subtitle">Real-time face detection and recognition</p>
      </div>

      <div className="camera-controls">
        <button
          onClick={toggleDetection}
          className={`btn ${isDetecting ? 'btn-danger' : 'btn-success'}`}
          disabled={isLoading}
        >
          {isLoading ? 'Loading Models...' : isDetecting ? '⏹ Stop Camera' : '▶ Start Camera'}
        </button>
        
        {isDetecting && (
          <button onClick={captureImage} className="btn btn-primary">
            <UserPlus size={18} />
            Capture & Add Person
          </button>
        )}
      </div>

      <div className="camera-container">
        <div className="video-wrapper">
          <video
            ref={videoRef}
            autoPlay
            muted
            onPlay={handleVideoPlay}
            className="video-feed"
          />
          <canvas ref={canvasRef} className="detection-canvas" />
        </div>

        <div className="detection-info">
          <div className="info-card">
            <h3>Detection Status</h3>
            <div className="status-indicator">
              {isDetecting ? (
                <>
                  <CheckCircle size={24} color="#16a34a" />
                  <span className="status-active">Active</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={24} color="#f59e0b" />
                  <span className="status-inactive">Inactive</span>
                </>
              )}
            </div>
          </div>

          <div className="info-card">
            <h3>Detected Faces</h3>
            <div className="face-count">
              {detectedFaces.length}
            </div>
          </div>

          <div className="info-card">
            <h3>Currently Detected</h3>
            {recognizedPeople.length > 0 ? (
              <div className="recognized-list">
                {recognizedPeople.map((person, idx) => (
                  <div key={idx} className={`recognized-item ${person.category === 'unknown' ? 'unknown' : 'known'}`}>
                    <div className="recognized-icon">
                      {person.category === 'unknown' ? (
                        <AlertTriangle size={20} color="#dc2626" />
                      ) : (
                        <User size={20} color="#16a34a" />
                      )}
                    </div>
                    <div className="recognized-info">
                      <div className="recognized-name">{person.name}</div>
                      <div className="recognized-category">
                        {person.category === 'unknown' ? '⚠️ ALERT' : person.category}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-detection">No faces detected</p>
            )}
          </div>

          <div className="info-card">
            <h3>Known Faces Database</h3>
            <div className="known-faces-list">
              {knownFaces.slice(0, 5).map(face => (
                <div key={face._id || face.id} className="known-face-item">
                  <div className="face-avatar-small">
                    {face.imagePath ? (
                      <img src={face.imagePath} alt={face.name} />
                    ) : (
                      face.name[0]
                    )}
                  </div>
                  <span>{face.name}</span>
                  <span className="face-category-badge">{face.category}</span>
                </div>
              ))}
            </div>
          </div>

          {detectedFaces.length > 0 && (
            <div className="info-card">
              <h3>Expressions</h3>
              {detectedFaces[0]?.expressions && (
                <div className="expressions">
                  {Object.entries(detectedFaces[0].expressions).map(([emotion, value]) => (
                    <div key={emotion} className="expression-item">
                      <span>{emotion}</span>
                      <div className="expression-bar">
                        <div
                          className="expression-fill"
                          style={{ width: `${value * 100}%` }}
                        />
                      </div>
                      <span>{(value * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Person</h2>
            
            {capturedImage && (
              <div className="captured-preview">
                <img src={capturedImage} alt="Captured face" />
              </div>
            )}

            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Enter person's name"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={newPersonCategory}
                onChange={(e) => setNewPersonCategory(e.target.value)}
              >
                <option value="family">Family</option>
                <option value="guest">Guest</option>
                <option value="frequent">Frequent Visitor</option>
                <option value="rare">Rare Visitor</option>
              </select>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPerson}
                className="btn btn-primary"
                disabled={!newPersonName}
              >
                Add Person
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveCamera;
