import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SUPPORT_LEVELS = [
  { value: 'Basic Life Support', icon: '🩹', desc: 'First Aid, Oxygen, Stretcher' },
  { value: 'Advanced Life Support', icon: '🫀', desc: 'Defibrillator, Ventilator, ECG Monitor' },
  { value: 'Neonatal', icon: '👶', desc: 'Incubator, Neonatal Ventilator, Warmer' },
  { value: 'Cardiac', icon: '❤️', desc: 'Cardiac Monitor, IABP, Pacemaker Kit' },
];

export default function DriverSetup() {
  const { completeProfile, user } = useAuth();
  const navigate = useNavigate();
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [medicalSupportLevel, setMedicalSupportLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleNumber.trim() || !medicalSupportLevel) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await completeProfile({ vehicleNumber, medicalSupportLevel });
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message || 'Profile setup failed');
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
          <div className="auth-logo-icon">🚑</div>
          <h1 className="auth-logo-text">GREEN <span className="auth-accent">WAVE</span></h1>
        </div>

        <div className="auth-card setup-card" style={{ maxWidth: 560 }}>
          <div className="setup-header">
            <div className="setup-badge">One-Time Setup</div>
            <h2>Complete Your Driver Profile</h2>
            <p>Welcome, <strong>{user?.name || 'Driver'}</strong>! Set up your ambulance details to start receiving dispatches.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Vehicle Number *</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🚗</span>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. KA-01-AM-1001"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Level of Medical Support *</label>
              <div className="support-level-grid">
                {SUPPORT_LEVELS.map(lvl => (
                  <button
                    key={lvl.value}
                    type="button"
                    className={`support-level-card ${medicalSupportLevel === lvl.value ? 'selected' : ''}`}
                    onClick={() => setMedicalSupportLevel(lvl.value)}
                  >
                    <span className="support-icon">{lvl.icon}</span>
                    <strong>{lvl.value}</strong>
                    <span className="support-desc">{lvl.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="auth-error"><span>⚠️</span> {error}</div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <><span className="auth-spinner"></span> Saving...</>
              ) : (
                <>Complete Setup & Go to Dashboard <span className="auth-btn-arrow">→</span></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
