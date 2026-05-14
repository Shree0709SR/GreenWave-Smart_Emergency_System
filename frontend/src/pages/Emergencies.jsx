import { useState } from 'react';
import api from '../services/api';

export default function Emergencies({ data, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    patientLat: '12.965', patientLng: '77.590', patientInfo: '',
    emergencyType: 'general', severity: 'medium', ambulanceId: '', hospitalId: ''
  });

  const handleDispatch = async () => {
    setLoading(true);
    try {
      const res = await api.dispatch({
        patientLat: parseFloat(form.patientLat),
        patientLng: parseFloat(form.patientLng),
        patientInfo: form.patientInfo || 'Emergency Patient',
        emergencyType: form.emergencyType,
        severity: form.severity,
        ambulanceId: form.ambulanceId,
        hospitalId: form.hospitalId || undefined
      });
      setResult(res);
      if (res.success) { onRefresh(); setTimeout(() => { setShowModal(false); setResult(null); }, 3000); }
    } catch (e) { setResult({ success: false, message: 'Network error' }); }
    setLoading(false);
  };

  const handleResolve = async (id) => {
    await api.resolveEmergency(id);
    onRefresh();
  };

  const emergencies = data.emergencies || [];
  const active = emergencies.filter(e => e.status === 'active');
  const resolved = emergencies.filter(e => e.status === 'resolved');
  const available = (data.ambulances || []).filter(a => a.status === 'available');

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <span className="badge badge-red" style={{marginRight:8}}>Active: {active.length}</span>
          <span className="badge badge-green">Resolved: {resolved.length}</span>
        </div>
        <button className="btn btn-danger" onClick={() => setShowModal(true)}>🚨 New Emergency Dispatch</button>
      </div>

      {/* Active Emergencies */}
      {active.length > 0 && (
        <div className="panel" style={{borderColor:'rgba(239,68,68,0.3)'}}>
          <div className="panel-header"><h3>🔴 Active Emergencies</h3></div>
          <div className="cards-grid">
            {active.map(em => (
              <div key={em.id} className="info-card" style={{borderColor:'rgba(239,68,68,0.3)',animation:'pulse-glow 3s infinite'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <h4>🚨 {em.type?.toUpperCase()}</h4>
                  <span className={`badge ${em.severity === 'critical' ? 'badge-red' : 'badge-amber'}`}>{em.severity}</span>
                </div>
                <div className="meta" style={{marginTop:12}}>
                  <div>📋 {em.patientInfo}</div>
                  <div>🚑 {em.ambulanceId} → 🏥 {em.hospital?.name}</div>
                  <div>⏱️ ETA: <strong>{em.totalETA} min</strong> | 📏 {em.totalDistance} km</div>
                  <div>🚦 {em.signalsCleared} signals cleared for green corridor</div>
                  <div style={{fontSize:'0.7rem',color:'var(--text-muted)',marginTop:4}}>Started: {new Date(em.createdAt).toLocaleTimeString()}</div>
                </div>
                <div style={{marginTop:12}}>
                  <button className="btn btn-success btn-sm" onClick={() => handleResolve(em.id)}>✅ Mark Resolved</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Emergencies */}
      <div className="panel">
        <div className="panel-header"><h3>✅ Resolved ({resolved.length})</h3></div>
        {resolved.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📋</div><p>No resolved emergencies yet</p></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>ID</th><th>Type</th><th>Severity</th><th>Hospital</th><th>Distance</th><th>Response Time</th></tr></thead>
            <tbody>
              {resolved.map(em => (
                <tr key={em.id}>
                  <td style={{fontFamily:'var(--font-mono)',fontSize:'0.75rem'}}>{em.id}</td>
                  <td><span className="badge badge-blue">{em.type}</span></td>
                  <td><span className={`badge ${em.severity === 'critical' ? 'badge-red' : 'badge-amber'}`}>{em.severity}</span></td>
                  <td>{em.hospital?.name}</td>
                  <td>{em.totalDistance} km</td>
                  <td>{em.responseTime || '—'} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dispatch Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🚨 Emergency Dispatch</h3>
            
            {result && (
              <div className={`alert-item ${result.success ? 'alert-success' : 'alert-emergency'}`} style={{marginBottom:16}}>
                <span>{result.message || (result.success ? 'Dispatched!' : 'Failed')}</span>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Patient Latitude</label>
                <input type="number" step="0.0001" value={form.patientLat} onChange={e => setForm({...form, patientLat: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Patient Longitude</label>
                <input type="number" step="0.0001" value={form.patientLng} onChange={e => setForm({...form, patientLng: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Patient Info</label>
              <input type="text" placeholder="Name / description" value={form.patientInfo} onChange={e => setForm({...form, patientInfo: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Emergency Type</label>
                <select value={form.emergencyType} onChange={e => setForm({...form, emergencyType: e.target.value})}>
                  <option value="general">General</option>
                  <option value="cardiac">Cardiac</option>
                  <option value="trauma">Trauma</option>
                  <option value="burns">Burns</option>
                  <option value="neonatal">Neonatal</option>
                </select>
              </div>
              <div className="form-group">
                <label>Severity</label>
                <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Assign Ambulance</label>
              <select value={form.ambulanceId} onChange={e => setForm({...form, ambulanceId: e.target.value})}>
                <option value="">Select ambulance...</option>
                {available.map(a => <option key={a.id} value={a.id}>{a.vehicleNumber} — {a.driverName} ({a.type})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Target Hospital (optional, auto-selected if empty)</label>
              <select value={form.hospitalId} onChange={e => setForm({...form, hospitalId: e.target.value})}>
                <option value="">Auto-select best hospital</option>
                {(data.hospitals || []).map(h => <option key={h.id} value={h.id}>{h.name} — {h.availableBeds} beds</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDispatch} disabled={loading || !form.ambulanceId}>
                {loading ? '⏳ Dispatching...' : '🚨 Dispatch Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
