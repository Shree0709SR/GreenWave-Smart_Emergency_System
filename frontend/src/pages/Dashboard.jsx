import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Dashboard({ data, onRefresh }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.getAnalytics().then(r => r.success && setAnalytics(r.data)).catch(() => {});
  }, [data]);

  const stats = data.stats || {};
  const activeEm = (data.emergencies || []).filter(e => e.status === 'active');

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card info">
          <span className="stat-icon">🚑</span>
          <span className="stat-value">{stats.ambulances?.available || 0}</span>
          <span className="stat-label">Ambulances Available</span>
          <span className="stat-sub">{stats.ambulances?.total || 0} total fleet</span>
        </div>
        <div className="stat-card emergency">
          <span className="stat-icon">🚨</span>
          <span className="stat-value">{activeEm.length}</span>
          <span className="stat-label">Active Emergencies</span>
          <span className="stat-sub">{(data.emergencies||[]).length} total dispatches</span>
        </div>
        <div className="stat-card success">
          <span className="stat-icon">🏥</span>
          <span className="stat-value">{stats.hospitals?.availableBeds || 0}</span>
          <span className="stat-label">Beds Available</span>
          <span className="stat-sub">{stats.hospitals?.total || 0} hospitals online</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-icon">🚦</span>
          <span className="stat-value">{stats.signals?.inCorridor || 0}</span>
          <span className="stat-label">Signals in Corridor</span>
          <span className="stat-sub">{stats.signals?.green || 0} green / {stats.signals?.red || 0} red</span>
        </div>
      </div>

      {analytics && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">⏱️</span>
            <span className="stat-value">{analytics.avgResponseTime || 0}<small style={{fontSize:'0.5em'}}>min</small></span>
            <span className="stat-label">Avg Response Time</span>
          </div>
          <div className="stat-card success">
            <span className="stat-icon">✅</span>
            <span className="stat-value">{analytics.successRate || 0}%</span>
            <span className="stat-label">Success Rate</span>
          </div>
          <div className="stat-card info">
            <span className="stat-icon">📡</span>
            <span className="stat-value">{analytics.signalsControlled || 0}</span>
            <span className="stat-label">Signals Controlled</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🏨</span>
            <span className="stat-value">{analytics.hospitalCapacity || 0}%</span>
            <span className="stat-label">Hospital Capacity</span>
          </div>
        </div>
      )}

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>🚑 Fleet Status</h3>
            <button className="btn btn-outline btn-sm" onClick={onRefresh}>Refresh</button>
          </div>
          <table className="data-table">
            <thead><tr><th>Vehicle</th><th>Driver</th><th>Type</th><th>Status</th><th>Fuel</th></tr></thead>
            <tbody>
              {(data.ambulances || []).map(a => (
                <tr key={a.id}>
                  <td style={{fontFamily:'var(--font-mono)', fontSize:'0.8rem'}}>{a.vehicleNumber}</td>
                  <td>{a.driverName}</td>
                  <td><span className="badge badge-blue">{a.type}</span></td>
                  <td>
                    <span className={`badge ${a.status === 'available' ? 'badge-green' : a.status === 'dispatched' ? 'badge-red' : 'badge-amber'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="progress-bar" style={{width:60}}>
                        <div className={`progress-fill ${a.fuelLevel > 50 ? 'green' : 'red'}`} style={{width:`${a.fuelLevel}%`}}></div>
                      </div>
                      <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{a.fuelLevel}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>🚨 Active Emergencies</h3>
          </div>
          {activeEm.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <p>No active emergencies</p>
            </div>
          ) : (
            activeEm.map(em => (
              <div key={em.id} className="info-card" style={{marginBottom:12, borderColor:'rgba(239,68,68,0.3)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <h4>🚨 {em.type?.toUpperCase()} Emergency</h4>
                  <span className={`badge ${em.severity === 'critical' ? 'badge-red' : 'badge-amber'}`}>{em.severity}</span>
                </div>
                <div className="meta" style={{marginTop:8}}>
                  <div>🚑 Ambulance: {em.ambulanceId} → 🏥 {em.hospital?.name}</div>
                  <div>⏱️ ETA: {em.totalETA} min | 📏 {em.totalDistance} km | 🚦 {em.signalsCleared} signals cleared</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><h3>🏥 Hospital Overview</h3></div>
        <table className="data-table">
          <thead><tr><th>Hospital</th><th>Type</th><th>Beds</th><th>ICU</th><th>Rating</th><th>Status</th></tr></thead>
          <tbody>
            {(data.hospitals || []).map(h => (
              <tr key={h.id}>
                <td><strong>{h.name}</strong><br/><span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{h.address}</span></td>
                <td><span className="badge badge-purple">{h.type}</span></td>
                <td>
                  <span>{h.availableBeds}/{h.totalBeds}</span>
                  <div className="progress-bar"><div className="progress-fill green" style={{width:`${(h.availableBeds/h.totalBeds)*100}%`}}></div></div>
                </td>
                <td>{h.icuAvailable}/{h.icuBeds}</td>
                <td>⭐ {h.rating}</td>
                <td><span className={`badge ${h.emergencyReady ? 'badge-green' : 'badge-red'}`}>{h.emergencyReady ? 'Ready' : 'Busy'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
