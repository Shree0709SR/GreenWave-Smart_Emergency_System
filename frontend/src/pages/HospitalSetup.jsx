import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SPECIALTIES = [
  'Trauma', 'Cardiology', 'Neurology', 'Orthopedics', 'Burns',
  'Pediatrics', 'Oncology', 'Transplant', 'Neurosurgery', 'Spinal',
  'General Surgery', 'Vascular', 'Cardiac Surgery', 'Neonatal'
];

export default function HospitalSetup() {
  const { completeProfile, user } = useAuth();
  const navigate = useNavigate();
  const [availableBeds, setAvailableBeds] = useState('');
  const [icuBeds, setIcuBeds] = useState('');
  const [specialties, setSpecialties] = useState([]);
  const [workingTimings, setWorkingTimings] = useState({ open: '00:00', close: '23:59', is24x7: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSpecialty = (s) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!availableBeds || !icuBeds) {
      setError('Please enter bed counts');
      return;
    }
    if (specialties.length === 0) {
      setError('Please select at least one specialty');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const timings = workingTimings.is24x7 ? '24x7' : `${workingTimings.open} - ${workingTimings.close}`;
      const res = await completeProfile({ availableBeds, icuBeds, specialties, workingTimings: timings });
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message || 'Setup failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob blob-1"></div>
        <div className="auth-blob blob-2"></div>
      </div>

      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-logo-icon">🏥</div>
          <h1 className="auth-logo-text">GREEN <span className="auth-accent">WAVE</span></h1>
        </div>

        <div className="auth-card setup-card" style={{ maxWidth: 600 }}>
          <div className="setup-header">
            <div className="setup-badge">Mandatory Setup</div>
            <h2>Hospital Operational Details</h2>
            <p>Welcome, <strong>{user?.hospitalName || user?.name || 'Hospital'}</strong>! Complete your operational setup to join the emergency network.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-row">
              <div className="auth-field">
                <label>Number of Available Beds *</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🛏️</span>
                  <input
                    type="number"
                    value={availableBeds}
                    onChange={e => setAvailableBeds(e.target.value)}
                    placeholder="e.g. 200"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="auth-field">
                <label>ICU Beds *</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🏨</span>
                  <input
                    type="number"
                    value={icuBeds}
                    onChange={e => setIcuBeds(e.target.value)}
                    placeholder="e.g. 20"
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label>Hospital Specialties * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({specialties.length} selected)</span></label>
              <div className="specialty-grid">
                {SPECIALTIES.map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`specialty-tag ${specialties.includes(s) ? 'selected' : ''}`}
                    onClick={() => toggleSpecialty(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="auth-field">
              <label>Working Timings</label>
              <label className="checkbox-label" style={{ marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={workingTimings.is24x7}
                  onChange={e => setWorkingTimings({ ...workingTimings, is24x7: e.target.checked })}
                />
                24×7 Emergency Services
              </label>
              {!workingTimings.is24x7 && (
                <div className="form-row">
                  <div className="auth-field">
                    <label style={{ fontSize: '0.7rem' }}>Opening Time</label>
                    <input type="time" value={workingTimings.open} onChange={e => setWorkingTimings({ ...workingTimings, open: e.target.value })} />
                  </div>
                  <div className="auth-field">
                    <label style={{ fontSize: '0.7rem' }}>Closing Time</label>
                    <input type="time" value={workingTimings.close} onChange={e => setWorkingTimings({ ...workingTimings, close: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="auth-error"><span>⚠️</span> {error}</div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <><span className="auth-spinner"></span> Saving...</>
              ) : (
                <>Complete Setup & Activate Hospital <span className="auth-btn-arrow">→</span></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
