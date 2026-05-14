import { useState, useEffect } from 'react';
import { socket } from '../services/api';

export default function PublicView({ data }) {
  const [alerts, setAlerts] = useState([]);
  const [nearbyAmb, setNearbyAmb] = useState([]);

  useEffect(() => {
    const handler = (alert) => {
      setAlerts(p => [{ ...alert, id: Date.now() }, ...p].slice(0, 10));
    };
    socket.on('civilian:alert', handler);
    socket.on('emergency:new', (em) => {
      setAlerts(p => [{ id: Date.now(), message: `🚑 Emergency dispatched! An ambulance is en route. ETA: ${em.totalETA} min. Please clear the way.`, type: 'emergency' }, ...p].slice(0, 10));
    });
    return () => { socket.off('civilian:alert', handler); socket.off('emergency:new'); };
  }, []);

  useEffect(() => {
    const dispatched = (data.ambulances || []).filter(a => a.status === 'dispatched');
    setNearbyAmb(dispatched);
  }, [data.ambulances]);

  const activeEmergencies = (data.emergencies || []).filter(e => e.status === 'active');

  return (
    <div>
      <div className="panel" style={{background:'linear-gradient(135deg,rgba(229,57,53,0.08),rgba(30,136,229,0.05))',borderColor:'rgba(229,57,53,0.2)'}}>
        <h3 style={{fontSize:'1.2rem',marginBottom:8}}>👤 Public Safety Information</h3>
        <p style={{color:'var(--text-secondary)',fontSize:'0.9rem'}}>
          Stay informed about nearby emergency vehicles. When alerted, please pull over and clear the way immediately.
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card emergency">
          <span className="stat-icon">🚨</span>
          <span className="stat-value">{activeEmergencies.length}</span>
          <span className="stat-label">Active Emergencies</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-icon">🚑</span>
          <span className="stat-value">{nearbyAmb.length}</span>
          <span className="stat-label">Ambulances En Route</span>
        </div>
        <div className="stat-card success">
          <span className="stat-icon">🟢</span>
          <span className="stat-value">{(data.signals || []).filter(s => s.corridor).length}</span>
          <span className="stat-label">Green Corridors Active</span>
        </div>
        <div className="stat-card info">
          <span className="stat-icon">📢</span>
          <span className="stat-value">{alerts.length}</span>
          <span className="stat-label">Alerts Received</span>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="panel" style={{borderColor: alerts.length > 0 ? 'rgba(229,57,53,0.3)' : 'var(--border-color)'}}>
        <div className="panel-header"><h3>📢 Emergency Alerts</h3></div>
        {alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>No active alerts. The roads are clear.</p>
          </div>
        ) : (
          alerts.map(a => (
            <div key={a.id} className="alert-item alert-emergency" style={{marginBottom:8}}>
              <span>{a.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Guidance */}
      <div className="panel">
        <div className="panel-header"><h3>📋 Clear Path Guidance</h3></div>
        <div className="cards-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))'}}>
          {[
            { icon: '🔊', title: 'Hear a Siren?', desc: 'Slow down, check your mirrors, and move to the left side of the road.' },
            { icon: '🚗', title: 'At an Intersection?', desc: 'Do NOT enter the intersection. Wait for the ambulance to pass.' },
            { icon: '🛣️', title: 'On a Highway?', desc: 'Move to the rightmost lane and reduce speed gradually.' },
            { icon: '⛔', title: 'Red Signal Override?', desc: 'Stay stopped. Green corridors are automated for ambulance passage.' },
          ].map((g, i) => (
            <div key={i} className="info-card">
              <div style={{fontSize:'1.8rem',marginBottom:8}}>{g.icon}</div>
              <h4>{g.title}</h4>
              <p className="meta">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
