import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { socket } from '../services/api';

export default function HospitalDashboard({ data, onRefresh }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [beds, setBeds] = useState({});
  const [incomingAlerts, setIncomingAlerts] = useState([]);

  const myHospital = (data.hospitals || []).find(h => h.id === user?.hospitalId) || {};
  const incomingEmergencies = (data.emergencies || []).filter(e => e.status === 'active' && e.hospital?.id === user?.hospitalId);

  // Listen for real-time incoming ambulance alerts
  useEffect(() => {
    const handler = (alert) => {
      // Only show alerts for THIS hospital
      if (alert.hospitalId === user?.hospitalId) {
        setIncomingAlerts(prev => [alert, ...prev].slice(0, 10));
        // Play alert sound effect (visual only for now)
        onRefresh?.();
      }
    };
    socket.on('hospital:incoming', handler);
    
    // Listen for driver voice messages
    const msgHandler = (msg) => {
      if (msg.hospitalId === user?.hospitalId) {
        setIncomingAlerts(prev => [{
          ...msg,
          message: msg.displayMessage,
          eta: null, distance: null,
          patientInfo: null, emergencyType: 'message', severity: 'info',
        }, ...prev].slice(0, 10));
      }
    };
    socket.on('hospital:message', msgHandler);

    return () => { socket.off('hospital:incoming', handler); socket.off('hospital:message', msgHandler); };
  }, [user?.hospitalId, onRefresh]);

  const dismissAlert = (idx) => {
    setIncomingAlerts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateBeds = async () => {
    await api.updateHospitalAvailability(user.hospitalId, {
      availableBeds: parseInt(beds.availableBeds ?? myHospital.availableBeds),
      icuAvailable: parseInt(beds.icuAvailable ?? myHospital.icuAvailable),
      emergencyReady: beds.emergencyReady ?? myHospital.emergencyReady
    });
    setEditing(false);
    onRefresh();
  };

  return (
    <div>
      {/* Hospital Identity */}
      <div className="panel" style={{borderColor:'rgba(67,160,71,0.3)',background:'linear-gradient(135deg,rgba(67,160,71,0.05),rgba(30,136,229,0.03))'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
          <div>
            <h3 style={{fontSize:'1.2rem'}}>🏥 {user?.hospitalName || myHospital.name}</h3>
            <p style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>{myHospital.type} | {myHospital.address} | ⭐ {myHospital.rating}</p>
          </div>
          <span className={`badge ${myHospital.emergencyReady ? 'badge-green' : 'badge-red'}`} style={{fontSize:'0.85rem',padding:'6px 16px'}}>
            {myHospital.emergencyReady ? '🟢 Emergency Ready' : '🔴 Not Ready'}
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card success">
          <span className="stat-icon">🛏️</span>
          <span className="stat-value">{myHospital.availableBeds || 0}<small style={{fontSize:'0.4em'}}>/{myHospital.totalBeds || 0}</small></span>
          <span className="stat-label">Beds Available</span>
        </div>
        <div className="stat-card info">
          <span className="stat-icon">🏨</span>
          <span className="stat-value">{myHospital.icuAvailable || 0}<small style={{fontSize:'0.4em'}}>/{myHospital.icuBeds || 0}</small></span>
          <span className="stat-label">ICU Available</span>
        </div>
        <div className="stat-card emergency">
          <span className="stat-icon">🚑</span>
          <span className="stat-value">{incomingEmergencies.length}</span>
          <span className="stat-label">Incoming Ambulances</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-icon">📞</span>
          <span className="stat-value" style={{fontSize:'1rem',fontFamily:'var(--font-mono)'}}>{myHospital.phone || '—'}</span>
          <span className="stat-label">Emergency Line</span>
        </div>
      </div>
      {/* Real-time Incoming Ambulance Alerts */}
      {incomingAlerts.length > 0 && (
        <div style={{marginBottom:16}}>
          {incomingAlerts.map((alert, idx) => (
            <div key={idx} style={{
              background:'rgba(229,57,53,0.1)',border:'1px solid rgba(229,57,53,0.4)',
              borderRadius:12,padding:'14px 16px',marginBottom:8,
              animation:'pulse-glow 2s infinite',position:'relative',
            }}>
              <button onClick={() => dismissAlert(idx)} style={{position:'absolute',top:8,right:12,background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:'1rem'}}>✕</button>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:'2rem'}}>🚨</span>
                <div>
                  <div style={{fontWeight:700,color:'#ef4444',fontSize:'0.95rem'}}>{alert.message}</div>
                  <div style={{fontSize:'0.8rem',color:'var(--text-secondary)',marginTop:4}}>
                    📋 Patient: {alert.patientInfo} | 🏷️ {alert.emergencyType?.toUpperCase()} |{' '}
                    <span className={`badge ${alert.severity === 'critical' ? 'badge-red' : 'badge-amber'}`} style={{marginLeft:6}}>{alert.severity}</span>
                  </div>
                  <div style={{fontSize:'0.8rem',color:'var(--text-muted)',marginTop:4}}>
                    ⏱️ ETA: <strong style={{color:'var(--accent-red)'}}>{alert.eta} min</strong> | 📏 {alert.distance} km | 🕐 {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Incoming Ambulances */}
      {incomingEmergencies.length > 0 && (
        <div className="panel" style={{borderColor:'rgba(229,57,53,0.3)',animation:'pulse-glow 3s infinite'}}>
          <div className="panel-header"><h3>🚨 Incoming Ambulances</h3></div>
          {incomingEmergencies.map(em => (
            <div key={em.id} className="info-card" style={{borderColor:'rgba(229,57,53,0.3)',marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <h4>🚑 Ambulance {em.ambulanceId}</h4>
                <span className={`badge ${em.severity === 'critical' ? 'badge-red' : 'badge-amber'}`}>{em.severity}</span>
              </div>
              <div className="meta" style={{marginTop:8}}>
                <div>📋 Patient: {em.patientInfo}</div>
                <div>🏷️ Type: {em.type?.toUpperCase()}</div>
                <div>⏱️ ETA: <strong style={{color:'var(--accent-red)',fontSize:'1.1rem'}}>{em.totalETA} min</strong></div>
                <div>📏 Distance: {em.totalDistance} km</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Update Bed Availability */}
      <div className="panel">
        <div className="panel-header">
          <h3>🛏️ Update Availability</h3>
          {!editing && <button className="btn btn-primary btn-sm" onClick={() => { setEditing(true); setBeds({ availableBeds: myHospital.availableBeds, icuAvailable: myHospital.icuAvailable, emergencyReady: myHospital.emergencyReady }); }}>✏️ Edit</button>}
        </div>
        {editing ? (
          <div>
            <div className="form-row">
              <div className="form-group">
                <label>Available Beds</label>
                <input type="number" value={beds.availableBeds} onChange={e => setBeds({...beds, availableBeds: e.target.value})} />
              </div>
              <div className="form-group">
                <label>ICU Available</label>
                <input type="number" value={beds.icuAvailable} onChange={e => setBeds({...beds, icuAvailable: e.target.value})} />
              </div>
            </div>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:'0.9rem',cursor:'pointer',marginBottom:16}}>
              <input type="checkbox" checked={beds.emergencyReady} onChange={e => setBeds({...beds, emergencyReady: e.target.checked})} /> Emergency Ready
            </label>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-success" onClick={handleUpdateBeds}>💾 Save</button>
              <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
            <div><span style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>Beds</span><br/><strong>{myHospital.availableBeds}/{myHospital.totalBeds}</strong></div>
            <div><span style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>ICU</span><br/><strong>{myHospital.icuAvailable}/{myHospital.icuBeds}</strong></div>
            <div><span style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>Specialties</span><br/>{(myHospital.specialties||[]).map(s => <span key={s} className="badge badge-blue" style={{marginRight:4}}>{s}</span>)}</div>
          </div>
        )}
      </div>

      {/* Driver Management */}
      <DriverManagement />
    </div>
  );
}

function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [showReg, setShowReg] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', username: '', password: '', email: '', phone: '', licenseNumber: '', govId: '', ambulanceId: '', vehicleNumber: '' });
  
  const loadDrivers = () => {
    api.getDrivers().then(res => { if (res.success) setDrivers(res.data); });
  };
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  import('react').then(r => r.useEffect(() => { loadDrivers(); }, []));

  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await api.registerDriver(newDriver);
    if (res.success) {
      setShowReg(false);
      setNewDriver({ name: '', username: '', password: '', email: '', phone: '', licenseNumber: '', govId: '', ambulanceId: '', vehicleNumber: '' });
      loadDrivers();
    } else {
      alert(res.message);
    }
  };

  const handleApprove = async (id) => {
    await api.approveDriver(id);
    loadDrivers();
  };

  return (
    <div className="panel" style={{marginTop:20}}>
      <div className="panel-header">
        <h3>🧑‍✈️ Driver Management</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowReg(!showReg)}>{showReg ? 'Close' : '➕ Register Driver'}</button>
      </div>

      {showReg && (
        <form onSubmit={handleRegister} style={{background:'#1A1A1A',padding:20,borderRadius:12,marginBottom:20}}>
          <h4>Register New Ambulance Driver</h4>
          <div className="form-row" style={{marginTop:12}}>
            <div className="form-group"><label>Full Name</label><input required value={newDriver.name} onChange={e=>setNewDriver({...newDriver, name: e.target.value})} /></div>
            <div className="form-group"><label>Username</label><input required value={newDriver.username} onChange={e=>setNewDriver({...newDriver, username: e.target.value})} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Password</label><input required type="password" value={newDriver.password} onChange={e=>setNewDriver({...newDriver, password: e.target.value})} /></div>
            <div className="form-group"><label>Email</label><input type="email" value={newDriver.email} onChange={e=>setNewDriver({...newDriver, email: e.target.value})} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Phone Number (OTP Verification)</label><input required value={newDriver.phone} onChange={e=>setNewDriver({...newDriver, phone: e.target.value})} /></div>
            <div className="form-group"><label>Driving License No.</label><input required value={newDriver.licenseNumber} onChange={e=>setNewDriver({...newDriver, licenseNumber: e.target.value})} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Gov ID (Aadhar/SSN)</label><input required value={newDriver.govId} onChange={e=>setNewDriver({...newDriver, govId: e.target.value})} /></div>
            <div className="form-group"><label>Ambulance ID (e.g. a1)</label><input required value={newDriver.ambulanceId} onChange={e=>setNewDriver({...newDriver, ambulanceId: e.target.value})} /></div>
          </div>
          <button type="submit" className="btn btn-success">Submit Registration</button>
        </form>
      )}

      <table className="data-table">
        <thead><tr><th>Driver</th><th>Contact</th><th>Ambulance</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {drivers.map(d => (
            <tr key={d.id}>
              <td><strong>{d.name}</strong><br/><small className="text-muted">@{d.username}</small></td>
              <td>{d.phone}<br/><small className="text-muted">{d.email}</small></td>
              <td>{d.ambulanceId}</td>
              <td>
                {d.status === 'active' ? <span className="badge badge-green">Active</span> :
                  <span className="badge badge-amber">{d.status.replace('_', ' ')}</span>}
                <br/><small style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>Hosp: {d.hospitalApproved?'✅':'❌'} | Traf: {d.trafficAuthorityApproved?'✅':'❌'}</small>
              </td>
              <td>
                {!d.hospitalApproved && <button className="btn btn-success btn-sm" onClick={() => handleApprove(d.id)}>Approve</button>}
              </td>
            </tr>
          ))}
          {drivers.length === 0 && <tr><td colSpan="5" style={{textAlign:'center'}}>No drivers registered yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

