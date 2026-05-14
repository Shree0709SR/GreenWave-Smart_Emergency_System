import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { socket } from '../services/api';
import useVoiceAssistant from '../hooks/useVoiceAssistant';
import DriverRouteMap from '../components/DriverRouteMap';

export default function DriverDashboard({ data }) {
  const { user } = useAuth();
  const voice = useVoiceAssistant();
  const [step, setStep] = useState('idle'); // idle | loading | selectHospital | dispatched
  const [hospitals, setHospitals] = useState([]);
  const [gpsPos, setGpsPos] = useState(null);
  const [patientInfo, setPatientInfo] = useState('');
  const [emergencyType, setEmergencyType] = useState('general');
  const [severity, setSeverity] = useState('high');
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [voiceMsg, setVoiceMsg] = useState('');
  const [msgTarget, setMsgTarget] = useState(['traffic', 'hospital']);
  const [sendingMsg, setSendingMsg] = useState(false);

  const myAmbulance = (data.ambulances || []).find(a => a.id === user?.ambulanceId) || {};
  const myEmergency = (data.emergencies || []).filter(e => e.status === 'active' && e.ambulanceId === user?.ambulanceId);

  // Check if already dispatched
  useEffect(() => {
    if (myEmergency.length > 0 && step === 'idle') {
      setStep('dispatched');
    }
  }, [myEmergency.length]);

  // Listen for GPS updates
  useEffect(() => {
    const handler = (pos) => {
      if (pos.ambulanceId === user?.ambulanceId) setGpsPos(pos);
    };
    socket.on('gps:update', handler);
    return () => socket.off('gps:update', handler);
  }, [user]);

  // ─── Emergency Activation ────────────────────────
  const handleActivateEmergency = async () => {
    setStep('loading');
    try {
      const ambLat = gpsPos?.lat || myAmbulance.lat;
      const ambLng = gpsPos?.lng || myAmbulance.lng;

      const res = await api.getNearbyHospitals({
        ambulanceId: user?.ambulanceId,
        lat: ambLat,
        lng: ambLng,
        emergencyType,
        severity,
      });

      if (res.success) {
        setHospitals(res.data);
        setStep('selectHospital');
      } else {
        setFeedback('Failed to load hospitals. Try again.');
        setStep('idle');
      }
    } catch (e) {
      setFeedback('Connection error. Check backend.');
      setStep('idle');
    }
  };

  // ─── Hospital Selection & Dispatch ───────────────
  const handleConfirmDispatch = async () => {
    if (!selectedHospital) {
      setFeedback('Please select a hospital first.');
      return;
    }

    setStep('loading');
    try {
      const ambLat = gpsPos?.lat || myAmbulance.lat;
      const ambLng = gpsPos?.lng || myAmbulance.lng;

      const res = await api.driverDispatch({
        ambulanceId: user?.ambulanceId,
        hospitalId: selectedHospital.id,
        patientInfo: patientInfo || 'Not specified',
        emergencyType,
        severity,
        lat: ambLat,
        lng: ambLng,
      });

      if (res.success) {
        setDispatchResult(res);
        setStep('dispatched');
        setFeedback(`✅ ${res.message}`);
      } else {
        setFeedback(`❌ ${res.message}`);
        setStep('selectHospital');
      }
    } catch (e) {
      setFeedback('❌ Failed to dispatch. Try again.');
      setStep('selectHospital');
    }
  };

  const handleCancel = () => {
    setStep('idle');
    setHospitals([]);
    setSelectedHospital(null);
    setPatientInfo('');
    setFeedback('');
  };

  // ─── Deactivate Emergency ────────────────────────
  const [deactivating, setDeactivating] = useState(false);

  const handleDeactivate = async (emergencyId) => {
    if (!window.confirm('⚠️ Are you sure you want to deactivate this emergency?\n\nThis will:\n• Release the green corridor\n• Reset your ambulance status\n• Notify traffic authority & hospital')) {
      return;
    }

    setDeactivating(true);
    try {
      const res = await api.resolveEmergency(emergencyId);
      if (res.success) {
        setStep('idle');
        setDispatchResult(null);
        setFeedback('✅ Emergency deactivated. Ambulance back to standby.');
      } else {
        setFeedback(`❌ ${res.message || 'Failed to deactivate'}`);
      }
    } catch (e) {
      setFeedback('❌ Connection error. Try again.');
    }
    setDeactivating(false);
  };

  // ─── Voice Functions ─────────────────────────────
  const dictatePatientInfo = async () => {
    voice.speak('Please describe the patient condition.');
    try {
      const result = await voice.startListening();
      if (result) {
        setPatientInfo(result);
        voice.speak(`Got it. Patient info set to: ${result}`);
      }
    } catch (e) { setFeedback('🎤 Microphone error. Check permissions.'); }
  };

  const dictateMessage = async () => {
    voice.speak('Speak your message now.');
    try {
      const result = await voice.startListening();
      if (result) {
        setVoiceMsg(result);
        voice.speak(`Message recorded: ${result}`);
      }
    } catch (e) { setFeedback('🎤 Microphone error.'); }
  };

  const sendVoiceMessage = async () => {
    if (!voiceMsg.trim()) { setFeedback('Dictate a message first.'); return; }
    setSendingMsg(true);
    try {
      const res = await api.driverMessage({
        ambulanceId: user?.ambulanceId,
        message: voiceMsg,
        targets: msgTarget,
      });
      if (res.success) {
        voice.speak(`Message sent to ${msgTarget.join(' and ')}.`);
        setFeedback(`✅ ${res.message}`);
        setVoiceMsg('');
      } else { setFeedback(`❌ ${res.message}`); }
    } catch (e) { setFeedback('❌ Failed to send.'); }
    setSendingMsg(false);
  };

  const currentLat = gpsPos?.lat || myAmbulance.lat;
  const currentLng = gpsPos?.lng || myAmbulance.lng;

  return (
    <div>
      {/* Feedback Toast */}
      {feedback && (
        <div style={styles.toast}>
          {feedback}
          <button onClick={() => setFeedback('')} style={styles.toastClose}>✕</button>
        </div>
      )}

      {/* Driver Identity Card */}
      <div className="panel" style={{borderColor:'rgba(229,57,53,0.3)',background:'linear-gradient(135deg,rgba(229,57,53,0.05),rgba(30,136,229,0.03))'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
          <div>
            <h3 style={{fontSize:'1.2rem'}}>🚑 {user?.name} — {user?.vehicleNumber}</h3>
            <p style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>Ambulance Driver | {myAmbulance.type || 'ALS'}</p>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <span className={`badge ${myAmbulance.status === 'available' ? 'badge-green' : 'badge-red'}`} style={{fontSize:'0.8rem',padding:'6px 14px'}}>
              {myAmbulance.status || 'offline'}
            </span>
            {step === 'idle' && myAmbulance.status === 'available' && (
              <button className="btn btn-danger" onClick={handleActivateEmergency}
                style={{animation:'pulse-glow 2s infinite',fontSize:'1rem',padding:'10px 24px'}}>
                🚨 EMERGENCY
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        <div className="stat-card info">
          <span className="stat-icon">📍</span>
          <span className="stat-value" style={{fontSize:'1rem',fontFamily:'var(--font-mono)'}}>
            {currentLat?.toFixed(4) || '—'}, {currentLng?.toFixed(4) || '—'}
          </span>
          <span className="stat-label">Current GPS</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-icon">🏎️</span>
          <span className="stat-value">{gpsPos ? Math.round(gpsPos.speed) : myAmbulance.speed || 0} <small style={{fontSize:'0.4em'}}>km/h</small></span>
          <span className="stat-label">Speed</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⛽</span>
          <span className="stat-value">{myAmbulance.fuelLevel || 0}%</span>
          <span className="stat-label">Fuel</span>
        </div>
        <div className="stat-card emergency">
          <span className="stat-icon">🚨</span>
          <span className="stat-value">{myEmergency.length}</span>
          <span className="stat-label">Active Missions</span>
        </div>
      </div>

      {/* ─── Step: Loading ─────────────────────────── */}
      {step === 'loading' && (
        <div className="panel" style={{textAlign:'center',padding:40}}>
          <div style={{fontSize:'2rem',marginBottom:12}}>⏳</div>
          <p style={{color:'var(--text-muted)'}}>Finding nearby hospitals...</p>
        </div>
      )}

      {/* ─── Step: Select Hospital ─────────────────── */}
      {step === 'selectHospital' && (
        <>
          {/* Patient Info & Emergency Type */}
          <div className="panel" style={{borderColor:'rgba(229,57,53,0.4)',background:'rgba(229,57,53,0.03)'}}>
            <div className="panel-header">
              <h3>🚨 Emergency Details</h3>
              <button className="btn btn-outline btn-sm" onClick={handleCancel}>✕ Cancel</button>
            </div>

            <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
              <div style={{flex:'2 1 200px'}}>
                <label style={styles.label}>Patient Info</label>
                <div style={{display:'flex',gap:6}}>
                  <input type="text" value={patientInfo} onChange={e => setPatientInfo(e.target.value)}
                    placeholder="e.g. Male, 45, Chest Pain" style={{...styles.input, flex:1}} />
                  <button type="button" onClick={dictatePatientInfo} disabled={voice.isListening}
                    style={{...styles.micBtn, ...(voice.isListening ? styles.micBtnActive : {})}}>
                    {voice.isListening ? '⏺️' : '🎤'}
                  </button>
                </div>
                {voice.isListening && <span style={{fontSize:'0.7rem',color:'#ef4444',marginTop:4,display:'block'}}>🔴 Listening...</span>}
              </div>
              <div style={{flex:'1 1 140px'}}>
                <label style={styles.label}>Type</label>
                <select value={emergencyType} onChange={e => setEmergencyType(e.target.value)} style={styles.input}>
                  <option value="general">General</option>
                  <option value="cardiac">Cardiac</option>
                  <option value="trauma">Trauma</option>
                  <option value="respiratory">Respiratory</option>
                  <option value="burn">Burn</option>
                  <option value="neurological">Neurological</option>
                </select>
              </div>
              <div style={{flex:'1 1 120px'}}>
                <label style={styles.label}>Severity</label>
                <select value={severity} onChange={e => setSeverity(e.target.value)} style={styles.input}>
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                </select>
              </div>
            </div>
          </div>

          {/* Hospital List */}
          <div className="panel" style={{borderColor:'rgba(30,136,229,0.3)'}}>
            <div className="panel-header">
              <h3>🏥 Select Destination Hospital ({hospitals.length} available)</h3>
            </div>
            <p style={{fontSize:'0.8rem',color:'var(--text-muted)',marginBottom:16}}>
              Hospitals sorted by distance from your location. Select one and confirm dispatch.
            </p>

            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {hospitals.map((h, idx) => (
                <div key={h.id}
                  onClick={() => setSelectedHospital(h)}
                  style={{
                    ...styles.hospitalCard,
                    borderColor: selectedHospital?.id === h.id ? 'rgba(34,197,94,0.6)' : 'var(--border-color)',
                    background: selectedHospital?.id === h.id ? 'rgba(34,197,94,0.08)' : 'var(--bg-card)',
                    cursor: 'pointer',
                  }}>

                  {/* Rank badge */}
                  <div style={styles.rankBadge}>#{idx + 1}</div>

                  {/* Hospital Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                      <div>
                        <h4 style={{fontSize:'0.95rem',marginBottom:4}}>{h.name}</h4>
                        <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{h.type} • {h.address} • ⭐ {h.rating}</span>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'1.2rem',fontWeight:800,color:'var(--accent-blue)'}}>{h.distance} km</div>
                        <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>~{h.eta} min ETA</div>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div style={{display:'flex',gap:16,marginTop:10,flexWrap:'wrap'}}>
                      <div style={styles.miniStat}>
                        <span style={{color:'#22c55e'}}>🛏️</span>
                        <strong>{h.availableBeds}</strong>/<span style={{color:'var(--text-muted)'}}>{h.totalBeds}</span>
                        <span style={styles.miniLabel}>Beds</span>
                      </div>
                      <div style={styles.miniStat}>
                        <span style={{color:'#3b82f6'}}>🏨</span>
                        <strong>{h.icuAvailable}</strong>/<span style={{color:'var(--text-muted)'}}>{h.icuBeds}</span>
                        <span style={styles.miniLabel}>ICU</span>
                      </div>
                      <div style={styles.miniStat}>
                        <span style={{color:'#f59e0b'}}>🚦</span>
                        <strong>{h.signalsOnRoute}</strong>
                        <span style={styles.miniLabel}>Signals</span>
                      </div>
                      <div style={styles.miniStat}>
                        <span>🚗</span>
                        <strong>{h.routeDistance}</strong> km
                        <span style={styles.miniLabel}>Route</span>
                      </div>
                      <div style={styles.miniStat}>
                        <span>{h.trafficLevel === 'heavy' ? '🔴' : h.trafficLevel === 'moderate' ? '🟡' : '🟢'}</span>
                        <strong>{h.trafficLevel}</strong>
                        <span style={styles.miniLabel}>Traffic</span>
                      </div>
                    </div>

                    {/* Specialties */}
                    <div style={{marginTop:8,display:'flex',gap:4,flexWrap:'wrap'}}>
                      {h.specialties.map(s => (
                        <span key={s} className="badge badge-blue" style={{fontSize:'0.65rem',padding:'2px 8px'}}>{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {selectedHospital?.id === h.id && (
                    <div style={styles.checkmark}>✓</div>
                  )}
                </div>
              ))}
            </div>

            {/* Confirm Button */}
            <div style={{marginTop:20,display:'flex',gap:12}}>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDispatch}
                disabled={!selectedHospital}
                style={{flex:1,fontSize:'1rem',padding:'14px 24px',opacity:selectedHospital ? 1 : 0.5}}>
                🚑 CONFIRM DISPATCH → {selectedHospital?.name || 'Select a hospital'}
              </button>
              <button className="btn btn-outline" onClick={handleCancel} style={{padding:'14px 24px'}}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Step: Active Mission ──────────────────── */}
      {(step === 'dispatched' || myEmergency.length > 0) && myEmergency.map(em => (
        <div key={em.id} className="panel" style={{borderColor:'rgba(229,57,53,0.4)',animation:'pulse-glow 3s infinite'}}>
          <div className="panel-header"><h3>🚨 Active Mission</h3></div>
          <div className="info-card" style={{borderColor:'rgba(229,57,53,0.3)'}}>
            <h4>{em.type?.toUpperCase()} — <span className={`badge ${em.severity === 'critical' ? 'badge-red' : 'badge-amber'}`}>{em.severity}</span></h4>
            <div className="meta" style={{marginTop:12}}>
              <div>📋 Patient: {em.patientInfo}</div>
              <div>🏥 Destination: <strong>{em.hospital?.name}</strong></div>
              <div>⏱️ ETA: <strong style={{color:'var(--accent-red)',fontSize:'1.1rem'}}>{em.totalETA} min</strong> | 📏 {em.totalDistance} km</div>
              <div>🚦 {em.signalsCleared} signals cleared (Green Corridor {em.corridor ? 'active' : 'pending'})</div>
              <div className="progress-bar" style={{marginTop:8}}>
                <div className="progress-fill red" style={{width:'60%'}}></div>
              </div>
            </div>
            <div style={{marginTop:12,padding:12,background:'rgba(30,136,229,0.08)',borderRadius:8,fontSize:'0.8rem',color:'var(--accent-blue)'}}>
              📍 Route: {em.routeToHospital?.trafficLevel || 'moderate'} traffic | {em.routeToHospital?.waypoints?.length || 0} waypoints
            </div>

            {/* Live Route Map */}
            <DriverRouteMap
              emergency={em}
              ambulancePos={gpsPos || { lat: myAmbulance.lat, lng: myAmbulance.lng }}
              signals={data.signals || []}
              hospitals={data.hospitals || []}
            />

            {/* Deactivate Button */}
            <div style={{marginTop:16,display:'flex',gap:12,justifyContent:'flex-end'}}>
              <button
                className="btn btn-outline"
                onClick={() => handleDeactivate(em.id)}
                disabled={deactivating}
                style={{
                  borderColor:'rgba(239,68,68,0.5)',color:'#ef4444',
                  padding:'10px 24px',fontSize:'0.9rem',
                }}
              >
                {deactivating ? '⏳ Deactivating...' : '⛔ Deactivate Emergency'}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* No active missions (idle) */}
      {step === 'idle' && myEmergency.length === 0 && (
        <div className="panel">
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>No active missions. Standing by for dispatch.</p>
            <p style={{fontSize:'0.8rem',color:'var(--text-muted)',marginTop:8}}>Press the 🚨 EMERGENCY button to activate</p>
          </div>
        </div>
      )}

      {/* ─── Voice Assistant Panel (shown during mission) ─── */}
      {myEmergency.length > 0 && (
        <div className="panel" style={{borderColor:'rgba(99,102,241,0.3)',background:'rgba(99,102,241,0.03)'}}>
          <div className="panel-header">
            <h3>🎙️ Voice Assistant</h3>
            {voice.isSpeaking && <span className="badge badge-blue" style={{animation:'pulse-glow 1s infinite'}}>🔊 Speaking...</span>}
          </div>

          {/* Dictate Message */}
          <div style={{marginBottom:14}}>
            <label style={styles.label}>Dictate Message</label>
            <div style={{display:'flex',gap:8}}>
              <input type="text" value={voiceMsg} onChange={e => setVoiceMsg(e.target.value)}
                placeholder="Tap 🎤 or type your message..." style={{...styles.input, flex:1}} />
              <button onClick={dictateMessage} disabled={voice.isListening}
                style={{...styles.micBtn, ...(voice.isListening ? styles.micBtnActive : {})}}>
                {voice.isListening ? '⏺️' : '🎤'}
              </button>
            </div>
            {voice.isListening && <span style={{fontSize:'0.7rem',color:'#ef4444',marginTop:4,display:'block'}}>🔴 Listening... speak now</span>}
          </div>

          {/* Target Selection */}
          <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontSize:'0.75rem',color:'var(--text-muted)',fontWeight:600}}>SEND TO:</span>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.85rem',cursor:'pointer'}}>
              <input type="checkbox" checked={msgTarget.includes('traffic')}
                onChange={e => setMsgTarget(prev => e.target.checked ? [...prev,'traffic'] : prev.filter(t=>t!=='traffic'))} />
              🚦 Traffic Authority
            </label>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.85rem',cursor:'pointer'}}>
              <input type="checkbox" checked={msgTarget.includes('hospital')}
                onChange={e => setMsgTarget(prev => e.target.checked ? [...prev,'hospital'] : prev.filter(t=>t!=='hospital'))} />
              🏥 Hospital
            </label>
          </div>

          {/* Send Button */}
          <button className="btn btn-primary" onClick={sendVoiceMessage}
            disabled={sendingMsg || !voiceMsg.trim()}
            style={{width:'100%',padding:'12px',fontSize:'0.9rem',opacity:voiceMsg.trim()?1:0.5}}>
            {sendingMsg ? '⏳ Sending...' : `📤 Send Message to ${msgTarget.join(' & ')}`}
          </button>
        </div>
      )}

      {/* Equipment */}
      <div className="panel">
        <div className="panel-header"><h3>🧰 Equipment on Board</h3></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {(myAmbulance.equipment || []).map(eq => (
            <span key={eq} className="badge badge-blue" style={{padding:'6px 14px',fontSize:'0.8rem'}}>{eq}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────
const styles = {
  toast: {
    position: 'fixed', top: 20, right: 20, zIndex: 9999, maxWidth: 400,
    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
    borderRadius: 10, padding: '12px 40px 12px 16px', fontSize: '0.85rem',
    color: 'var(--text-primary)', backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  toastClose: {
    position: 'absolute', top: 8, right: 12, background: 'none', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem',
  },
  label: {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  input: {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
  },
  hospitalCard: {
    display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px',
    borderRadius: 12, border: '1px solid var(--border-color)',
    transition: 'all 0.2s ease', position: 'relative',
  },
  rankBadge: {
    width: 36, height: 36, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontWeight: 800,
    fontSize: '0.8rem', background: 'rgba(99,102,241,0.15)',
    color: '#6366f1', flexShrink: 0,
  },
  miniStat: {
    display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem',
    color: 'var(--text-primary)',
  },
  miniLabel: {
    color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: 2,
  },
  checkmark: {
    width: 32, height: 32, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontWeight: 800,
    fontSize: '1rem', background: 'rgba(34,197,94,0.2)',
    color: '#22c55e', flexShrink: 0,
  },
  micBtn: {
    width: 42, height: 42, borderRadius: 10, border: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '1.1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s ease', flexShrink: 0,
  },
  micBtnActive: {
    background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.5)',
    animation: 'pulse-glow 1s infinite',
  },
};
