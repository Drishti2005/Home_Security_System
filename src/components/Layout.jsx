import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Camera, Video, Users, Activity, BarChart3, Settings, LogOut, Menu, X } from 'lucide-react';
import './Layout.css';

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/house', icon: Camera, label: 'Virtual House' },
    { path: '/live-camera', icon: Video, label: 'Live Camera' },
    { path: '/faces', icon: Users, label: 'Known Faces' },
    { path: '/events', icon: Activity, label: 'Events' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ];

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <h2>🏠 Security</h2>
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2>🏠 Security</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button onClick={logout} className="btn-logout">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
