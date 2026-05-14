import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { socket } from './services/api';
import api from './services/api';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import DriverSetup from './pages/DriverSetup';
import HospitalSetup from './pages/HospitalSetup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import MapView from './pages/MapView';
import Drivers from './pages/Drivers';
import Emergencies from './pages/Emergencies';
import Hospitals from './pages/Hospitals';
import Signals from './pages/Signals';
import Analytics from './pages/Analytics';
import DriverDashboard from './pages/DriverDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import PublicView from './pages/PublicView';
import HardwareControl from './pages/HardwareControl';
import './App.css';

// Role-based navigation config
const roleNavMap = {
  traffic_authority: [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/map', icon: '🗺️', label: 'Live Map' },
    { path: '/emergencies', icon: '🚨', label: 'Emergencies' },
    { path: '/signals', icon: '🚦', label: 'Signal Control' },
    { path: '/hardware', icon: '🔌', label: 'Hardware' },
    { path: '/drivers', icon: '🧑‍✈️', label: 'Drivers' },
    { path: '/hospitals', icon: '🏥', label: 'Hospitals' },
    { path: '/analytics', icon: '📈', label: 'Analytics' },
  ],
  ambulance_driver: [
    { path: '/dashboard', icon: '🚑', label: 'My Dashboard' },
    { path: '/map', icon: '🗺️', label: 'Live Map' },
  ],
  hospital: [
    { path: '/dashboard', icon: '🏥', label: 'My Hospital' },
    { path: '/map', icon: '🗺️', label: 'Live Map' },
  ],
  system_admin: [
    { path: '/dashboard', icon: '📊', label: 'Admin Dashboard' },
    { path: '/map', icon: '🗺️', label: 'Live Map' },
    { path: '/emergencies', icon: '🚨', label: 'Emergencies' },
    { path: '/hospitals', icon: '🏥', label: 'Hospitals' },
    { path: '/signals', icon: '🚦', label: 'Signals' },
    { path: '/hardware', icon: '🔌', label: 'Hardware' },
    { path: '/drivers', icon: '🧑‍✈️', label: 'Drivers' },
    { path: '/analytics', icon: '📈', label: 'Analytics' },
  ],
  public_user: [
    { path: '/dashboard', icon: '👤', label: 'Safety Info' },
    { path: '/map', icon: '🗺️', label: 'Live Map' },
  ],
};

const roleLabelMap = {
  traffic_authority: 'Traffic Authority',
  ambulance_driver: 'Ambulance Driver',
  hospital: 'Hospital',
  system_admin: 'System Admin',
  public_user: 'Public User',
};

function DashboardLayout({ data, loadData, connected }) {
  const { user, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const location = useLocation();

  const navItems = roleNavMap[user?.role] || [];

  useEffect(() => {
    socket.on('emergency:new', (em) => {
      setAlerts(p => [...p, { id: Date.now(), type: 'emergency', message: `🚑 New emergency dispatched! ETA: ${em.totalETA} min`, time: new Date() }]);
    });
    socket.on('civilian:alert', (alert) => {
      setAlerts(p => [...p, { id: Date.now(), type: 'civilian', message: alert.message, time: new Date() }]);
    });
    socket.on('ambulance:arrived', ({ ambulanceId }) => {
      setAlerts(p => [...p, { id: Date.now(), type: 'success', message: `✅ Ambulance ${ambulanceId} has arrived`, time: new Date() }]);
    });
    socket.on('driver:emergency', (data) => {
      setAlerts(p => [...p, { id: Date.now(), type: 'emergency', message: data.message, time: new Date() }]);
    });
    socket.on('hospital:incoming', (data) => {
      setAlerts(p => [...p, { id: Date.now(), type: 'civilian', message: data.message, time: new Date() }]);
    });
    socket.on('driver:message', (data) => {
      setAlerts(p => [...p, { id: Date.now(), type: 'emergency', message: data.displayMessage, time: new Date() }]);
    });
    return () => { socket.off('emergency:new'); socket.off('civilian:alert'); socket.off('ambulance:arrived'); socket.off('driver:emergency'); socket.off('hospital:incoming'); socket.off('driver:message'); };
  }, []);

  const dismissAlert = (id) => setAlerts(p => p.filter(a => a.id !== id));

  // Determine which dashboard component to render based on role
  const getDashboardComponent = () => {
    switch (user?.role) {
      case 'system_admin': return <AdminDashboard />;
      case 'ambulance_driver': return <DriverDashboard data={data} />;
      case 'hospital': return <HospitalDashboard data={data} onRefresh={loadData} />;
      case 'public_user': return <PublicView data={data} />;
      default: return <Dashboard data={data} onRefresh={loadData} />;
    }
  };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🚑</span>
            {sidebarOpen && <div className="logo-text"><h1>GREEN WAVE</h1><span>Emergency Control</span></div>}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/dashboard'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info in sidebar */}
        {sidebarOpen && user && (
          <div style={{padding:'12px 16px',borderTop:'1px solid var(--border-color)'}}>
            <div style={{fontSize:'0.8rem',fontWeight:600,color:'var(--text-primary)',marginBottom:2}}>{user.name}</div>
            <div style={{fontSize:'0.7rem',color:'var(--text-muted)',marginBottom:8}}>{roleLabelMap[user.role]}</div>
            <button className="btn btn-outline btn-sm" style={{width:'100%',justifyContent:'center',fontSize:'0.75rem'}} onClick={logout}>
              🚪 Sign Out
            </button>
          </div>
        )}

        <div className="sidebar-footer">
          <div className={`connection-status ${connected ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            {sidebarOpen && <span>{connected ? 'Connected' : 'Offline'}</span>}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <h2>{navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}</h2>
            <span className="breadcrumb">GREEN WAVE / {roleLabelMap[user?.role]} / {navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}</span>
          </div>
          <div className="top-bar-actions">
            <NavLink to="/" className="btn btn-outline btn-sm" style={{fontSize:'0.75rem'}}>🏠 Home</NavLink>
            <span className="badge badge-blue" style={{padding:'4px 12px'}}>{roleLabelMap[user?.role]}</span>
            <div className="live-badge"><span className="pulse-dot"></span> LIVE</div>
          </div>
        </header>

        {alerts.length > 0 && (
          <div className="alerts-bar">
            {alerts.slice(-3).map(alert => (
              <div key={alert.id} className={`alert-item alert-${alert.type}`}>
                <span>{alert.message}</span>
                <button onClick={() => dismissAlert(alert.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="page-content">
          <Routes>
            <Route path="/dashboard" element={getDashboardComponent()} />
            <Route path="/map" element={<MapView data={data} />} />
            {/* Only traffic_authority and system_admin get full access */}
            {hasRole('traffic_authority', 'system_admin') && (
              <>
                <Route path="/emergencies" element={<Emergencies data={data} onRefresh={loadData} />} />
                <Route path="/signals" element={<Signals data={data} onRefresh={loadData} />} />
                <Route path="/hardware" element={<HardwareControl />} />
                <Route path="/drivers" element={<Drivers data={data} />} />
                <Route path="/analytics" element={<Analytics data={data} />} />
                <Route path="/hospitals" element={<Hospitals data={data} onRefresh={loadData} />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  const { isAuthenticated, loading, user, needsSetup } = useAuth();
  const [data, setData] = useState({ ambulances: [], hospitals: [], signals: [], emergencies: [] });
  const [connected, setConnected] = useState(false);
  const location = useLocation();

  const loadData = useCallback(async () => {
    try {
      const res = await api.getDashboard();
      if (res.success) {
        setData({
          ambulances: res.data.ambulances.list,
          hospitals: res.data.hospitals.list,
          signals: res.data.signals.list,
          emergencies: res.data.emergencies.list,
          stats: { ambulances: res.data.ambulances, hospitals: res.data.hospitals, signals: res.data.signals, emergencies: res.data.emergencies }
        });
      }
    } catch (e) { console.error('Failed to load:', e); }
  }, []);

  useEffect(() => {
    const authPages = ['/', '/login', '/register', '/setup/driver', '/setup/hospital'];
    if (isAuthenticated && !authPages.includes(location.pathname)) loadData();
  }, [isAuthenticated, location.pathname, loadData]);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('ambulances:update', (ambs) => setData(p => ({ ...p, ambulances: ambs })));
    socket.on('signals:update', (sigs) => setData(p => ({ ...p, signals: sigs })));
    socket.on('emergency:new', (em) => { setData(p => ({ ...p, emergencies: [...(p.emergencies||[]), em] })); });
    socket.on('emergency:resolved', (em) => { setData(p => ({ ...p, emergencies: (p.emergencies||[]).map(e => e.id === em.id ? em : e) })); });
    return () => { socket.off(); };
  }, []);

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#121212',color:'#fff',fontSize:'1.2rem'}}>⏳ Loading...</div>;

  // Landing page — always accessible
  if (location.pathname === '/') return <LandingPage />;

  // Login page — accessible without auth
  if (location.pathname === '/login') return isAuthenticated ? <Navigate to="/dashboard" /> : <Login />;

  // Register page — accessible without auth
  if (location.pathname === '/register') return isAuthenticated ? <Navigate to="/dashboard" /> : <Register />;

  // Setup pages — require auth but incomplete profile
  if (location.pathname === '/setup/driver') {
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (!needsSetup || user?.role !== 'ambulance_driver') return <Navigate to="/dashboard" />;
    return <DriverSetup />;
  }
  if (location.pathname === '/setup/hospital') {
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (!needsSetup || user?.role !== 'hospital') return <Navigate to="/dashboard" />;
    return <HospitalSetup />;
  }

  // All other routes require auth
  if (!isAuthenticated) return <Navigate to="/login" />;

  // Redirect to setup if profile not completed
  if (needsSetup) {
    if (user?.role === 'ambulance_driver') return <Navigate to="/setup/driver" />;
    if (user?.role === 'hospital') return <Navigate to="/setup/hospital" />;
  }

  return <DashboardLayout data={data} loadData={loadData} connected={connected} />;
}

export default App;
