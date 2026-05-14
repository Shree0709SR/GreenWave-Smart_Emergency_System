import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const SIGNAL_LABELS = ['A', 'B', 'C'];
const COLORS = ['red', 'yellow', 'green'];
const POLL_INTERVAL = 2000;

// Color map for LED glow effects
const LED_COLORS = {
  red: { active: '#ef4444', glow: 'rgba(239,68,68,0.6)', bg: 'rgba(239,68,68,0.15)' },
  yellow: { active: '#f59e0b', glow: 'rgba(245,158,11,0.6)', bg: 'rgba(245,158,11,0.15)' },
  green: { active: '#22c55e', glow: 'rgba(34,197,94,0.6)', bg: 'rgba(34,197,94,0.15)' },
  off: { active: '#2a2a2a', glow: 'transparent', bg: 'transparent' },
};

export default function HardwareControl() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualSignal, setManualSignal] = useState('A');
  const [manualColor, setManualColor] = useState('green');
  const [priorityIndex, setPriorityIndex] = useState(0);
  const [mappingA, setMappingA] = useState('s1');
  const [mappingB, setMappingB] = useState('s2');
  const [mappingC, setMappingC] = useState('s3');
  const [actionFeedback, setActionFeedback] = useState('');
  const intervalRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await api.getHardwareStatus();
      if (res.success) {
        setStatus(res.data);
        setMappingA(res.data.mappings.A);
        setMappingB(res.data.mappings.B);
        setMappingC(res.data.mappings.C);
      }
    } catch (e) {
      console.error('Failed to fetch hardware status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  const showFeedback = (msg) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(''), 3000);
  };

  const handleSetManual = async () => {
    try {
      const res = await api.setHardwareManual(manualSignal, manualColor);
      if (res.success) showFeedback(`✅ Signal ${manualSignal} → ${manualColor.toUpperCase()}`);
      fetchStatus();
    } catch (e) { showFeedback('❌ Failed to set manual mode'); }
  };

  const handleClearManual = async () => {
    try {
      const res = await api.clearHardwareManual();
      if (res.success) showFeedback('✅ Manual mode disabled');
      fetchStatus();
    } catch (e) { showFeedback('❌ Failed to clear manual mode'); }
  };

  const handleSetPriority = async () => {
    try {
      const res = await api.setHardwarePriority(priorityIndex);
      if (res.success) showFeedback(`✅ Priority: Signal ${SIGNAL_LABELS[priorityIndex]} → GREEN`);
      fetchStatus();
    } catch (e) { showFeedback('❌ Failed to set priority'); }
  };

  const handleClearPriority = async () => {
    try {
      const res = await api.clearHardwarePriority();
      if (res.success) showFeedback('✅ Priority mode cleared');
      fetchStatus();
    } catch (e) { showFeedback('❌ Failed to clear priority'); }
  };

  const handleUpdateMappings = async () => {
    try {
      const res = await api.updateHardwareMappings({ A: mappingA, B: mappingB, C: mappingC });
      if (res.success) showFeedback('✅ Signal mappings updated');
      fetchStatus();
    } catch (e) { showFeedback('❌ Failed to update mappings'); }
  };

  // Determine what each physical signal should show
  const getSignalState = (label) => {
    if (!status) return 'off';
    const { state } = status;
    const idx = SIGNAL_LABELS.indexOf(label);

    if (state.manual && state.signal === label) {
      return state.color;
    }
    if (state.priority && state.prioritySignal === idx) {
      return 'green';
    }
    // In normal cycle mode, ESP32 handles internally — show "cycling"
    return 'cycle';
  };

  const getCurrentMode = () => {
    if (!status) return 'unknown';
    if (status.state.manual) return 'manual';
    if (status.state.priority) return 'priority';
    return 'normal';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Connecting to ESP32 hardware...</p>
      </div>
    );
  }

  const mode = getCurrentMode();
  const connected = status?.connected || false;

  return (
    <div>
      {/* Feedback Toast */}
      {actionFeedback && (
        <div style={styles.toast}>
          {actionFeedback}
        </div>
      )}

      {/* Connection + Mode Status */}
      <div className="stats-grid">
        <div className={`stat-card ${connected ? 'success' : 'emergency'}`}>
          <span className="stat-icon" style={{ position: 'relative' }}>
            🔌
            <span style={{
              ...styles.statusDot,
              background: connected ? '#22c55e' : '#ef4444',
              boxShadow: connected ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
            }}></span>
          </span>
          <span className="stat-value">{connected ? 'Online' : 'Offline'}</span>
          <span className="stat-label">ESP32 Connection</span>
        </div>

        <div className={`stat-card ${mode === 'manual' ? 'warning' : mode === 'priority' ? 'emergency' : 'info'}`}>
          <span className="stat-icon">
            {mode === 'manual' ? '🎛️' : mode === 'priority' ? '🚨' : '🔄'}
          </span>
          <span className="stat-value" style={{ textTransform: 'capitalize' }}>{mode}</span>
          <span className="stat-label">Current Mode</span>
        </div>

        <div className="stat-card info">
          <span className="stat-icon">📡</span>
          <span className="stat-value">{status?.pollCount || 0}</span>
          <span className="stat-label">Total Polls</span>
        </div>

        <div className="stat-card info">
          <span className="stat-icon">🕐</span>
          <span className="stat-value" style={{ fontSize: '0.9rem' }}>
            {status?.lastPollTime ? new Date(status.lastPollTime).toLocaleTimeString() : 'Never'}
          </span>
          <span className="stat-label">Last Poll</span>
        </div>
      </div>

      <div className="panel-grid">
        {/* Physical Signal Visualizer */}
        <div className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-header">
            <h3>🚦 Physical Traffic Signals</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge ${mode === 'normal' ? 'badge-blue' : mode === 'manual' ? 'badge-amber' : 'badge-red'}`}>
                {mode === 'normal' ? '🔄 Normal Cycle' : mode === 'manual' ? '🎛️ Manual Override' : '🚨 Emergency Priority'}
              </span>
            </div>
          </div>

          <div style={styles.signalRow}>
            {SIGNAL_LABELS.map((label, idx) => {
              const signalState = getSignalState(label);
              const mapping = status?.enrichedMappings?.[label];
              const isCycling = signalState === 'cycle';
              const isActive = (status?.state.manual && status?.state.signal === label) ||
                               (status?.state.priority && status?.state.prioritySignal === idx);

              return (
                <div key={label} style={{
                  ...styles.signalColumn,
                  borderColor: isActive ? 'rgba(99,102,241,0.5)' : 'var(--border-color)',
                  background: isActive ? 'rgba(99,102,241,0.05)' : 'var(--bg-card)',
                }}>
                  {/* Signal label */}
                  <div style={styles.signalLabel}>
                    <span style={styles.signalLetter}>{label}</span>
                    <span style={styles.signalName}>{mapping?.name || 'Unmapped'}</span>
                  </div>

                  {/* Traffic Light Housing */}
                  <div style={styles.trafficLightHousing}>
                    {COLORS.map(color => {
                      const isOn = !isCycling && signalState === color;
                      const ledColor = LED_COLORS[isOn ? color : 'off'];
                      return (
                        <div key={color} style={{
                          ...styles.led,
                          background: isOn
                            ? `radial-gradient(circle at 35% 35%, ${ledColor.active}, ${ledColor.active}aa)`
                            : 'radial-gradient(circle at 35% 35%, #3a3a3a, #1a1a1a)',
                          boxShadow: isOn
                            ? `0 0 15px ${ledColor.glow}, 0 0 30px ${ledColor.glow}, inset 0 -3px 6px rgba(0,0,0,0.3)`
                            : 'inset 0 -3px 6px rgba(0,0,0,0.3)',
                        }}></div>
                      );
                    })}
                  </div>

                  {/* Status text */}
                  <div style={styles.signalStatus}>
                    {isCycling ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>⟳ Auto Cycling</span>
                    ) : (
                      <span className={`badge ${signalState === 'green' ? 'badge-green' : signalState === 'yellow' ? 'badge-amber' : 'badge-red'}`}>
                        {signalState.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* DB sync status */}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    DB: {mapping?.dbStatus || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manual Control Panel */}
        <div className="panel">
          <div className="panel-header">
            <h3>🎛️ Manual Control</h3>
          </div>
          <div style={styles.controlSection}>
            <p style={styles.controlDesc}>Override ESP32 signal control manually. The selected signal will display the chosen color until cleared.</p>

            <div style={styles.controlGroup}>
              <label style={styles.label}>Signal</label>
              <div style={styles.buttonGroup}>
                {SIGNAL_LABELS.map(l => (
                  <button key={l} className={`btn btn-sm ${manualSignal === l ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setManualSignal(l)} style={{ minWidth: 50 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.label}>Color</label>
              <div style={styles.buttonGroup}>
                {COLORS.map(c => (
                  <button key={c} className={`btn btn-sm ${manualColor === c ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setManualColor(c)}
                    style={{
                      minWidth: 70,
                      borderColor: manualColor === c ? LED_COLORS[c].active : undefined,
                      color: manualColor === c ? LED_COLORS[c].active : undefined,
                    }}>
                    <span style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                      background: LED_COLORS[c].active, marginRight: 6,
                    }}></span>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-success btn-sm" onClick={handleSetManual} style={{ flex: 1 }}>
                ⚡ Apply Manual
              </button>
              <button className="btn btn-outline btn-sm" onClick={handleClearManual}
                style={{ flex: 1, opacity: mode === 'manual' ? 1 : 0.5 }}
                disabled={mode !== 'manual'}>
                ✕ Clear Manual
              </button>
            </div>
          </div>
        </div>

        {/* Priority Control */}
        <div className="panel">
          <div className="panel-header">
            <h3>🚨 Emergency Priority</h3>
          </div>
          <div style={styles.controlSection}>
            <p style={styles.controlDesc}>Force a signal GREEN for emergency vehicle passage. This is automatically triggered when an ambulance is dispatched.</p>

            <div style={styles.controlGroup}>
              <label style={styles.label}>Priority Signal</label>
              <div style={styles.buttonGroup}>
                {SIGNAL_LABELS.map((l, i) => (
                  <button key={l} className={`btn btn-sm ${priorityIndex === i ? 'btn-danger' : 'btn-outline'}`}
                    onClick={() => setPriorityIndex(i)} style={{ minWidth: 50 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-danger btn-sm" onClick={handleSetPriority} style={{ flex: 1 }}>
                🚨 Activate Priority
              </button>
              <button className="btn btn-outline btn-sm" onClick={handleClearPriority}
                style={{ flex: 1, opacity: mode === 'priority' ? 1 : 0.5 }}
                disabled={mode !== 'priority'}>
                ✕ Clear Priority
              </button>
            </div>

            {mode === 'priority' && (
              <div style={styles.activeAlert}>
                ⚠️ Priority active — Signal {SIGNAL_LABELS[status?.state.prioritySignal || 0]} is forced GREEN
              </div>
            )}
          </div>
        </div>

        {/* Signal Mappings */}
        <div className="panel">
          <div className="panel-header">
            <h3>🔗 Signal Mappings</h3>
          </div>
          <div style={styles.controlSection}>
            <p style={styles.controlDesc}>Map each physical ESP32 signal (A, B, C) to a database traffic signal.</p>

            {SIGNAL_LABELS.map((label, idx) => {
              const value = [mappingA, mappingB, mappingC][idx];
              const setter = [setMappingA, setMappingB, setMappingC][idx];

              return (
                <div key={label} style={styles.mappingRow}>
                  <span style={styles.mappingLabel}>Signal {label}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>→</span>
                  <select
                    value={value}
                    onChange={e => setter(e.target.value)}
                    style={styles.select}
                  >
                    {(status?.allSignals || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                    ))}
                  </select>
                </div>
              );
            })}

            <button className="btn btn-primary btn-sm" onClick={handleUpdateMappings} style={{ marginTop: 12, width: '100%' }}>
              💾 Save Mappings
            </button>
          </div>
        </div>

        {/* Activity Log */}
        <div className="panel">
          <div className="panel-header">
            <h3>📜 Hardware Activity Log</h3>
          </div>
          {(!status?.activityLog || status.activityLog.length === 0) ? (
            <div className="empty-state">
              <div className="empty-icon">📜</div>
              <p>No hardware activity yet</p>
            </div>
          ) : (
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              {status.activityLog.map((entry, i) => (
                <div key={i} style={styles.logEntry}>
                  <div style={styles.logAction}>
                    <span style={{
                      ...styles.logBadge,
                      background: entry.action.includes('PRIORITY') ? 'rgba(239,68,68,0.15)' : 
                                   entry.action.includes('MANUAL') ? 'rgba(245,158,11,0.15)' :
                                   'rgba(99,102,241,0.15)',
                      color: entry.action.includes('PRIORITY') ? '#ef4444' :
                             entry.action.includes('MANUAL') ? '#f59e0b' :
                             '#6366f1',
                    }}>
                      {entry.action}
                    </span>
                  </div>
                  <div style={styles.logMessage}>{entry.message}</div>
                  <div style={styles.logTime}>{new Date(entry.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Arduino Code Reference */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header">
          <h3>📋 ESP32 Configuration</h3>
        </div>
        <div style={styles.controlSection}>
          <p style={styles.controlDesc}>
            Ensure your ESP32 Arduino code points to this server. Update the <code>serverUrl</code> in your Arduino sketch:
          </p>
          <div style={styles.codeBlock}>
            <code>String serverUrl = "http://&lt;YOUR_PC_IP&gt;:5000/api/signals/state";</code>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={styles.pinCard}>
              <strong>Signal A (MG Road)</strong>
              <span>GPIO 25/26/27</span>
            </div>
            <div style={styles.pinCard}>
              <strong>Signal B (Brigade Rd)</strong>
              <span>GPIO 14/12/13</span>
            </div>
            <div style={styles.pinCard}>
              <strong>Signal C (Residency Rd)</strong>
              <span>GPIO 33/32/35</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Styles ─────────────────────────────────

const styles = {
  loadingContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: 400,
  },
  spinner: {
    width: 40, height: 40, border: '3px solid var(--border-color)',
    borderTopColor: 'var(--accent-blue)', borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  toast: {
    position: 'fixed', top: 20, right: 20, zIndex: 9999,
    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
    borderRadius: 10, padding: '12px 20px', fontSize: '0.85rem',
    color: 'var(--text-primary)', backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    animation: 'slideIn 0.3s ease',
  },
  statusDot: {
    position: 'absolute', bottom: -2, right: -2, width: 10, height: 10,
    borderRadius: '50%', border: '2px solid var(--bg-card)',
  },
  signalRow: {
    display: 'flex', justifyContent: 'center', gap: 24, padding: '20px 0',
    flexWrap: 'wrap',
  },
  signalColumn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: 20, borderRadius: 16, border: '1px solid var(--border-color)',
    minWidth: 140, transition: 'all 0.3s ease',
  },
  signalLabel: {
    textAlign: 'center', marginBottom: 12,
  },
  signalLetter: {
    display: 'block', fontSize: '1.5rem', fontWeight: 800,
    color: 'var(--text-primary)', letterSpacing: 2,
  },
  signalName: {
    display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)',
    marginTop: 2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  trafficLightHousing: {
    background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
    borderRadius: 16, padding: '12px 10px', display: 'flex',
    flexDirection: 'column', gap: 8, border: '2px solid #333',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  led: {
    width: 36, height: 36, borderRadius: '50%',
    transition: 'all 0.4s ease',
  },
  signalStatus: {
    marginTop: 12, textAlign: 'center',
  },
  controlSection: {
    padding: '8px 0',
  },
  controlDesc: {
    fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16,
    lineHeight: 1.5,
  },
  controlGroup: {
    marginBottom: 12,
  },
  label: {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  buttonGroup: {
    display: 'flex', gap: 6,
  },
  activeAlert: {
    marginTop: 12, padding: '10px 14px', borderRadius: 8,
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444', fontSize: '0.8rem', fontWeight: 500,
    animation: 'pulse 2s infinite',
  },
  mappingRow: {
    display: 'flex', alignItems: 'center', marginBottom: 10, padding: '8px 0',
    borderBottom: '1px solid var(--border-color)',
  },
  mappingLabel: {
    fontWeight: 600, fontSize: '0.85rem', minWidth: 80,
    color: 'var(--text-primary)',
  },
  select: {
    flex: 1, padding: '6px 10px', borderRadius: 8,
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none',
  },
  logEntry: {
    padding: '8px 12px', borderBottom: '1px solid var(--border-color)',
    fontSize: '0.8rem',
  },
  logAction: {
    marginBottom: 4,
  },
  logBadge: {
    padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem',
    fontWeight: 600, fontFamily: 'var(--font-mono)',
  },
  logMessage: {
    color: 'var(--text-secondary)', fontSize: '0.78rem',
  },
  logTime: {
    color: 'var(--text-muted)', fontSize: '0.7rem',
    fontFamily: 'var(--font-mono)', marginTop: 2,
  },
  codeBlock: {
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem', color: '#22c55e', overflowX: 'auto',
  },
  pinCard: {
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    borderRadius: 8, padding: '8px 14px', fontSize: '0.75rem',
    display: 'flex', flexDirection: 'column', gap: 4,
    color: 'var(--text-secondary)', flex: '1 1 150px',
  },
};
