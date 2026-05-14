import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ROLES = [
  { id: 'ambulance_driver', label: 'Ambulance Driver', icon: '🚑', desc: 'Emergency dispatch & GPS navigation', color: '#E53935' },
  { id: 'traffic_authority', label: 'Traffic Authority', icon: '🚦', desc: 'Signal control & traffic monitoring', color: '#1E88E5' },
  { id: 'hospital', label: 'Hospital', icon: '🏥', desc: 'Bed management & emergency alerts', color: '#43A047' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=role select, 2=form, 3=success
  const [selectedRole, setSelectedRole] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [form, setForm] = useState({});

  useEffect(() => {
    api.getDepartments().then(r => { if (r.success) setDepartments(r.data); }).catch(() => {});
  }, []);

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setForm({});
    setError('');
    setStep(2);
  };

  const validateForm = () => {
    if (selectedRole.id === 'ambulance_driver') {
      if (!form.name || !form.phone || !form.email || !form.username || !form.password || !form.confirmPassword) return 'Please fill all required fields';
      if (form.password !== form.confirmPassword) return 'Passwords do not match';
      if (form.password.length < 6) return 'Password must be at least 6 characters';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) return 'Please enter a valid email address';
    } else if (selectedRole.id === 'traffic_authority') {
      if (!form.departmentName || !form.officerName || !form.phone || !form.email || !form.departmentId || !form.username || !form.password || !form.departmentPassword) return 'Please fill all required fields';
      if (form.password.length < 6) return 'Password must be at least 6 characters';
    } else if (selectedRole.id === 'hospital') {
      if (!form.hospitalName || !form.phone || !form.email || !form.username || !form.password) return 'Please fill all required fields';
      if (form.password.length < 6) return 'Password must be at least 6 characters';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');
    try {
      const res = await register({ ...form, role: selectedRole.id });
      if (res.success) {
        setStep(3);
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 1, label: 'Weak', color: '#E53935' };
    if (score <= 3) return { level: 2, label: 'Medium', color: '#FDD835' };
    return { level: 3, label: 'Strong', color: '#43A047' };
  };

  const pwdStrength = getPasswordStrength(form.password);

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob blob-1"></div>
        <div className="auth-blob blob-2"></div>
        <div className="auth-blob blob-3"></div>
      </div>

      <div className="auth-container register-container">
        {/* Branding */}
        <div className="auth-brand">
          <div className="auth-logo-icon">🚑</div>
          <h1 className="auth-logo-text">
            GREEN <span className="auth-accent">WAVE</span>
          </h1>
          <p className="auth-tagline">Create your account</p>
        </div>

        {/* Step Indicator */}
        <div className="auth-steps">
          <div className={`auth-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-circle">1</div>
            <span>Select Role</span>
          </div>
          <div className="step-line"></div>
          <div className={`auth-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-circle">2</div>
            <span>Fill Details</span>
          </div>
          <div className="step-line"></div>
          <div className={`auth-step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-circle">3</div>
            <span>Complete</span>
          </div>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="auth-card register-card" style={{ maxWidth: 720 }}>
            <div className="auth-card-header">
              <h2>Choose Your Role</h2>
              <p>Select how you'll use GREEN WAVE</p>
            </div>
            <div className="role-selection-grid">
              {ROLES.map(role => (
                <button
                  key={role.id}
                  className="role-card"
                  onClick={() => handleRoleSelect(role)}
                  style={{ '--role-color': role.color }}
                >
                  <div className="role-icon">{role.icon}</div>
                  <h3>{role.label}</h3>
                  <p>{role.desc}</p>
                  <div className="role-arrow">→</div>
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" className="auth-home-link">← Back to Login</Link>
            </div>
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === 2 && (
          <div className="auth-card register-card" style={{ maxWidth: 560 }}>
            <button className="auth-back-btn" onClick={() => { setStep(1); setError(''); }}>
              ← Back to roles
            </button>
            <div className="auth-card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '2rem' }}>{selectedRole.icon}</span>
              <div>
                <h2>{selectedRole.label} Registration</h2>
                <p>Fill in your details to create an account</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {/* AMBULANCE DRIVER FIELDS */}
              {selectedRole.id === 'ambulance_driver' && (
                <>
                  <div className="form-row">
                    <div className="auth-field">
                      <label>Full Name *</label>
                      <input type="text" value={form.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder="Enter your full name" required />
                    </div>
                    <div className="auth-field">
                      <label>Phone Number *</label>
                      <input type="tel" value={form.phone || ''} onChange={e => updateForm('phone', e.target.value)} placeholder="+91 98765 43210" required />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Address</label>
                    <input type="text" value={form.address || ''} onChange={e => updateForm('address', e.target.value)} placeholder="Enter your address" />
                  </div>
                  <div className="form-row">
                    <div className="auth-field">
                      <label>Email *</label>
                      <input type="email" value={form.email || ''} onChange={e => updateForm('email', e.target.value)} placeholder="you@example.com" required />
                    </div>
                    <div className="auth-field">
                      <label>Age</label>
                      <input type="number" value={form.age || ''} onChange={e => updateForm('age', e.target.value)} placeholder="25" min="18" max="65" />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Date of Birth</label>
                    <input type="date" value={form.dob || ''} onChange={e => updateForm('dob', e.target.value)} />
                  </div>
                  <div className="auth-field">
                    <label>User ID *</label>
                    <input type="text" value={form.username || ''} onChange={e => updateForm('username', e.target.value)} placeholder="Choose a unique User ID" required />
                  </div>
                  <div className="form-row">
                    <div className="auth-field">
                      <label>Password *</label>
                      <input type="password" value={form.password || ''} onChange={e => updateForm('password', e.target.value)} placeholder="Min. 6 characters" required />
                      {form.password && (
                        <div className="password-strength">
                          <div className="strength-bar">
                            <div className="strength-fill" style={{ width: `${pwdStrength.level * 33.3}%`, background: pwdStrength.color }}></div>
                          </div>
                          <span style={{ color: pwdStrength.color, fontSize: '0.7rem' }}>{pwdStrength.label}</span>
                        </div>
                      )}
                    </div>
                    <div className="auth-field">
                      <label>Confirm Password *</label>
                      <input type="password" value={form.confirmPassword || ''} onChange={e => updateForm('confirmPassword', e.target.value)} placeholder="Re-enter password" required />
                      {form.confirmPassword && form.password !== form.confirmPassword && (
                        <span style={{ color: '#E53935', fontSize: '0.72rem' }}>Passwords don't match</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* TRAFFIC AUTHORITY FIELDS */}
              {selectedRole.id === 'traffic_authority' && (
                <>
                  <div className="form-row">
                    <div className="auth-field">
                      <label>Department Name *</label>
                      <input type="text" value={form.departmentName || ''} onChange={e => updateForm('departmentName', e.target.value)} placeholder="Traffic Department name" required />
                    </div>
                    <div className="auth-field">
                      <label>Officer Name *</label>
                      <input type="text" value={form.officerName || ''} onChange={e => updateForm('officerName', e.target.value)} placeholder="Full name of officer" required />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Address</label>
                    <input type="text" value={form.address || ''} onChange={e => updateForm('address', e.target.value)} placeholder="Office address" />
                  </div>
                  <div className="form-row">
                    <div className="auth-field">
                      <label>Phone Number *</label>
                      <input type="tel" value={form.phone || ''} onChange={e => updateForm('phone', e.target.value)} placeholder="+91 98765 43210" required />
                    </div>
                    <div className="auth-field">
                      <label>Email *</label>
                      <input type="email" value={form.email || ''} onChange={e => updateForm('email', e.target.value)} placeholder="officer@traffic.gov.in" required />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Department ID *</label>
                    <select value={form.departmentId || ''} onChange={e => updateForm('departmentId', e.target.value)} required>
                      <option value="">Select your department</option>
                      {departments.map(d => (
                        <option key={d.departmentId} value={d.departmentId}>{d.departmentId} — {d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="auth-field">
                    <label>Department Password *</label>
                    <input type="password" value={form.departmentPassword || ''} onChange={e => updateForm('departmentPassword', e.target.value)} placeholder="Provided by your department admin" required />
                    <span className="auth-field-hint">⚠️ This is NOT a user-created password. Contact your department administrator for this credential.</span>
                  </div>
                  <div className="form-row">
                    <div className="auth-field">
                      <label>User ID *</label>
                      <input type="text" value={form.username || ''} onChange={e => updateForm('username', e.target.value)} placeholder="Choose a unique User ID" required />
                    </div>
                    <div className="auth-field">
                      <label>Password *</label>
                      <input type="password" value={form.password || ''} onChange={e => updateForm('password', e.target.value)} placeholder="Min. 6 characters" required />
                      {form.password && (
                        <div className="password-strength">
                          <div className="strength-bar">
                            <div className="strength-fill" style={{ width: `${pwdStrength.level * 33.3}%`, background: pwdStrength.color }}></div>
                          </div>
                          <span style={{ color: pwdStrength.color, fontSize: '0.7rem' }}>{pwdStrength.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* HOSPITAL FIELDS */}
              {selectedRole.id === 'hospital' && (
                <>
                  <div className="auth-field">
                    <label>Hospital Name *</label>
                    <input type="text" value={form.hospitalName || ''} onChange={e => updateForm('hospitalName', e.target.value)} placeholder="Full hospital name" required />
                  </div>
                  <div className="auth-field">
                    <label>Address</label>
                    <input type="text" value={form.address || ''} onChange={e => updateForm('address', e.target.value)} placeholder="Hospital address" />
                  </div>
                  <div className="form-row">
                    <div className="auth-field">
                      <label>Phone Number *</label>
                      <input type="tel" value={form.phone || ''} onChange={e => updateForm('phone', e.target.value)} placeholder="+91 80 2222 1111" required />
                    </div>
                    <div className="auth-field">
                      <label>Email *</label>
                      <input type="email" value={form.email || ''} onChange={e => updateForm('email', e.target.value)} placeholder="admin@hospital.com" required />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Hospital ID</label>
                    <input type="text" value={form.hospitalId || ''} onChange={e => updateForm('hospitalId', e.target.value)} placeholder="Optional — auto-generated if blank" />
                  </div>
                  <div className="form-row">
                    <div className="auth-field">
                      <label>Username *</label>
                      <input type="text" value={form.username || ''} onChange={e => updateForm('username', e.target.value)} placeholder="Login username" required />
                    </div>
                    <div className="auth-field">
                      <label>Password *</label>
                      <input type="password" value={form.password || ''} onChange={e => updateForm('password', e.target.value)} placeholder="Min. 6 characters" required />
                      {form.password && (
                        <div className="password-strength">
                          <div className="strength-bar">
                            <div className="strength-fill" style={{ width: `${pwdStrength.level * 33.3}%`, background: pwdStrength.color }}></div>
                          </div>
                          <span style={{ color: pwdStrength.color, fontSize: '0.7rem' }}>{pwdStrength.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="auth-error">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button type="submit" className="auth-submit-btn" disabled={loading} style={{ '--role-color': selectedRole.color }}>
                {loading ? (
                  <><span className="auth-spinner"></span> Creating account...</>
                ) : (
                  <>Create Account <span className="auth-btn-arrow">→</span></>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="auth-card" style={{ textAlign: 'center', maxWidth: 480 }}>
            <div className="auth-success-icon">✅</div>
            <h2 style={{ marginBottom: 8 }}>Registration Successful!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              Your {selectedRole.label} account has been created.
              {selectedRole.id !== 'traffic_authority' && ' You will need to complete your profile setup on first login.'}
            </p>
            <button className="auth-submit-btn" onClick={() => navigate('/login')}>
              Go to Login <span className="auth-btn-arrow">→</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="auth-footer">
          <Link to="/" className="auth-home-link">← Back to Home</Link>
          <span className="auth-secure-badge">🔐 RBAC Protected Registration</span>
        </div>
      </div>
    </div>
  );
}
