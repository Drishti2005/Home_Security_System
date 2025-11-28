import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VirtualHouse from './pages/VirtualHouse';
import LiveCamera from './pages/LiveCamera';
import KnownFaces from './pages/KnownFaces';
import Events from './pages/Events';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="house" element={<VirtualHouse />} />
            <Route path="live-camera" element={<LiveCamera />} />
            <Route path="faces" element={<KnownFaces />} />
            <Route path="events" element={<Events />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
