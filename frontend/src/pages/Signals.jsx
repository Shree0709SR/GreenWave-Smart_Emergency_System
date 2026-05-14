import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Signals({ data, onRefresh }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getSignalHistory().then(r => r.success && setHistory(r.data)).catch(() => {});
    api.getSignalStats().then(r => r.success && setStats(r.data)).catch(() => {});
  }, [data]);

  const signals = data.signals || [];
  const green = signals.filter(s => s.status === 'green');
  const red = signals.filter(s => s.status === 'red');
  const inCorridor = signals.filter(s => s.corridor);

  const handleToggle = async (id, current) => {
    await api.updateSignal(id, current === 'green' ? 'red' : 'green');
    onRefresh();
  };

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card success">
          <span className="stat-icon">🟢</span>
          <span className="stat-value">{green.length}</span>
          <span className="stat-label">Green Signals</span>
        </div>
        <div className="stat-card emergency">
          <span className="stat-icon">🔴</span>
          <span className="stat-value">{red.length}</span>
          <span className="stat-label">Red Signals</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-icon">🚧</span>
          <span className="stat-value">{inCorridor.length}</span>
          <span className="stat-label">In Corridor</span>
        </div>
        <div className="stat-card info">
          <span className="stat-icon">📊</span>
          <span className="stat-value">{stats?.totalChanges || 0}</span>
          <span className="stat-label">Total Changes</span>
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>🚦 All Traffic Signals ({signals.length})</h3>
            <button className="btn btn-outline btn-sm" onClick={onRefresh}>Refresh</button>
          </div>
          <div className="cards-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))'}}>
            {signals.map(s => (
              <div key={s.id} className="info-card" style={{
                borderColor: s.corridor ? 'rgba(245,158,11,0.4)' : s.status === 'green' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                background: s.corridor ? 'rgba(245,158,11,0.05)' : 'var(--bg-card)'
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <h4 style={{fontSize:'0.9rem'}}>{s.name}</h4>
                  <span style={{fontSize:'1.5rem'}}>{s.status === 'green' ? '🟢' : s.status === 'yellow' ? '🟡' : '🔴'}</span>
                </div>
                <div className="meta">
                  <div>📍 {s.lat.toFixed(4)}, {s.lng.toFixed(4)}</div>
                  {s.corridor && <div style={{color:'var(--accent-amber)'}}>🚧 Corridor: {s.corridor}</div>}
                </div>
                <div style={{marginTop:8}}>
                  <button className={`btn btn-sm ${s.status === 'green' ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => handleToggle(s.id, s.status)} disabled={!!s.corridor}>
                    {s.corridor ? '🔒 Locked' : s.status === 'green' ? 'Switch Red' : 'Switch Green'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h3>📜 Signal Change History</h3></div>
          {history.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📜</div><p>No signal changes recorded yet</p></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Signal</th><th>Change</th><th>Reason</th><th>Time</th></tr></thead>
              <tbody>
                {history.slice(0, 20).map((h, i) => (
                  <tr key={i}>
                    <td>{h.signalName}</td>
                    <td>
                      <span className={`badge ${h.previousStatus === 'green' ? 'badge-green' : 'badge-red'}`}>{h.previousStatus}</span>
                      <span style={{margin:'0 6px',color:'var(--text-muted)'}}>→</span>
                      <span className={`badge ${h.newStatus === 'green' ? 'badge-green' : 'badge-red'}`}>{h.newStatus}</span>
                    </td>
                    <td style={{fontSize:'0.8rem',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis'}}>{h.reason}</td>
                    <td style={{fontSize:'0.75rem',fontFamily:'var(--font-mono)'}}>{new Date(h.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
