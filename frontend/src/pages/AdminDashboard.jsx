import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line } from 'recharts';
import api from '../services/api';
import { socket } from '../services/api';

const ROLE_COLORS = {
  ambulance_driver: '#E53935',
  traffic_authority: '#1E88E5',
  hospital: '#43A047',
  system_admin: '#FDD835',
  public_user: '#7B1FA2',
};

const ROLE_LABELS = {
  ambulance_driver: 'Drivers',
  traffic_authority: 'Traffic Auth',
  hospital: 'Hospitals',
  system_admin: 'Admins',
  public_user: 'Public',
};

const PIE_COLORS = ['#E53935', '#1E88E5', '#43A047', '#FDD835', '#7B1FA2'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminLogs(),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (logsRes.success) setLogs(logsRes.data);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // Refresh every 15s
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clock); };
  }, [loadData]);

  // Listen for real-time events
  useEffect(() => {
    socket.on('ambulances:update', () => loadData());
    socket.on('emergency:new', () => loadData());
    socket.on('emergency:resolved', () => loadData());
    return () => { socket.off('ambulances:update'); socket.off('emergency:new'); socket.off('emergency:resolved'); };
  }, [loadData]);

  if (loading || !stats) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner"></div>
        <p>Loading System Analytics...</p>
      </div>
    );
  }

  const { usersByRole, registrationActivity, hospitalStats, ambulanceStats, emergencyStats, signalStats, recentLogs, systemStats } = stats;

  // Pie chart data
  const userPieData = Object.entries(usersByRole)
    .filter(([k]) => k !== 'total')
    .map(([role, count]) => ({ name: ROLE_LABELS[role] || role, value: count, fill: ROLE_COLORS[role] || '#666' }));

  // Simulate some hourly emergency data for visualization
  const emergencyTimeline = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    active: Math.floor(Math.random() * 5),
    resolved: Math.floor(Math.random() * 3),
  }));

  const tabs = [
    { id: 'overview', label: '📊 Overview', },
    { id: 'hospitals', label: '🏥 Hospitals', },
    { id: 'fleet', label: '🚑 Fleet', },
    { id: 'users', label: '👥 Users', },
    { id: 'logs', label: '📋 Activity', },
  ];

  return (
    <div className="admin-dashboard">
      {/* System Health Bar */}
      <div className="admin-health-bar">
        <div className="health-left">
          <span className="health-dot online"></span>
          <strong>System Online</strong>
          <span className="health-sep">|</span>
          <span>Uptime: {formatUptime(systemStats.uptime)}</span>
          <span className="health-sep">|</span>
          <span>Memory: {systemStats.memoryUsage}MB / {systemStats.totalMemory}MB</span>
          <span className="health-sep">|</span>
          <span>Node {systemStats.nodeVersion}</span>
        </div>
        <div className="health-right">
          <span className="health-clock">{currentTime.toLocaleTimeString()}</span>
          <button className="btn btn-outline btn-sm" onClick={loadData}>🔄 Refresh</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card kpi-users">
              <div className="kpi-icon">👥</div>
              <div className="kpi-content">
                <div className="kpi-value">{usersByRole.total}</div>
                <div className="kpi-label">Total Users</div>
              </div>
              <div className="kpi-sparkline">
                {Object.entries(usersByRole).filter(([k]) => k !== 'total').map(([role, count]) => (
                  <div key={role} className="kpi-mini" style={{ color: ROLE_COLORS[role] }}>
                    {count} {ROLE_LABELS[role]}
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-kpi-card kpi-hospitals">
              <div className="kpi-icon">🏥</div>
              <div className="kpi-content">
                <div className="kpi-value">{hospitalStats.active}<small>/{hospitalStats.total}</small></div>
                <div className="kpi-label">Active Hospitals</div>
              </div>
              <div className="kpi-detail">
                <span>{hospitalStats.availableBeds} beds</span>
                <span>{hospitalStats.availableICU} ICU</span>
                <span>{hospitalStats.occupancyRate}% occupied</span>
              </div>
            </div>

            <div className="admin-kpi-card kpi-ambulances">
              <div className="kpi-icon">🚑</div>
              <div className="kpi-content">
                <div className="kpi-value">{ambulanceStats.available}<small>/{ambulanceStats.total}</small></div>
                <div className="kpi-label">Available Ambulances</div>
              </div>
              <div className="kpi-detail">
                <span>{ambulanceStats.dispatched} dispatched</span>
                <span>{ambulanceStats.avgFuel}% avg fuel</span>
              </div>
            </div>

            <div className="admin-kpi-card kpi-emergencies">
              <div className="kpi-icon">🚨</div>
              <div className="kpi-content">
                <div className="kpi-value">{emergencyStats.active}</div>
                <div className="kpi-label">Active Emergencies</div>
              </div>
              <div className="kpi-detail">
                <span>{emergencyStats.resolved} resolved</span>
                <span>{emergencyStats.avgResponseTime} min avg</span>
              </div>
            </div>

            <div className="admin-kpi-card kpi-signals">
              <div className="kpi-icon">🚦</div>
              <div className="kpi-content">
                <div className="kpi-value">{signalStats.total}</div>
                <div className="kpi-label">Traffic Signals</div>
              </div>
              <div className="kpi-detail">
                <span style={{ color: '#43A047' }}>{signalStats.green} green</span>
                <span style={{ color: '#E53935' }}>{signalStats.red} red</span>
                <span style={{ color: '#FDD835' }}>{signalStats.inCorridor} corridor</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="admin-charts-row">
            {/* Users by Role Pie */}
            <div className="admin-chart-panel">
              <h3>👥 Users by Role</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={userPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {userPieData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Registration Activity Bar Chart */}
            <div className="admin-chart-panel">
              <h3>📈 Registration Activity (7 Days)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={registrationActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6B6B6B', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fill: '#6B6B6B', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="count" fill="#1E88E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Emergency Timeline */}
            <div className="admin-chart-panel">
              <h3>🚨 Emergency Activity (24h)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={emergencyTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" tick={{ fill: '#6B6B6B', fontSize: 10 }} interval={3} />
                  <YAxis tick={{ fill: '#6B6B6B', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                  <Area type="monotone" dataKey="active" stroke="#E53935" fill="rgba(229,57,53,0.2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" stroke="#43A047" fill="rgba(67,160,71,0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hospital Capacity Line Chart */}
          <div className="admin-chart-panel" style={{ marginBottom: 20 }}>
            <h3>🏥 Hospital Bed Capacity Overview</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={(stats.hospitalStats ? [stats] : []).length ? generateHospitalCapacityData() : []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#6B6B6B', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6B6B6B', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                <Line type="monotone" dataKey="total" stroke="#1E88E5" strokeWidth={2} dot={{ fill: '#1E88E5' }} name="Total Beds" />
                <Line type="monotone" dataKey="available" stroke="#43A047" strokeWidth={2} dot={{ fill: '#43A047' }} name="Available" />
                <Line type="monotone" dataKey="icu" stroke="#E53935" strokeWidth={2} dot={{ fill: '#E53935' }} name="ICU Available" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Activity Feed */}
          <div className="admin-chart-panel">
            <h3>📋 Live Activity Feed</h3>
            <div className="admin-activity-feed">
              {recentLogs.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>
                  <div className="empty-icon">📭</div>
                  <p>No activity yet</p>
                </div>
              ) : (
                recentLogs.slice(0, 15).map((log, i) => (
                  <div key={i} className="activity-item">
                    <span className="activity-icon">{getLogIcon(log.action)}</span>
                    <div className="activity-content">
                      <span className="activity-action">{formatLogAction(log.action)}</span>
                      <span className="activity-by">by {log.by || 'system'}</span>
                    </div>
                    <span className="activity-time">{formatTime(log.time)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* HOSPITALS TAB */}
      {activeTab === 'hospitals' && (
        <div className="admin-chart-panel">
          <h3>🏥 Hospital Availability (Read-Only)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Type</th>
                <th>Beds</th>
                <th>ICU</th>
                <th>Specialties</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role === 'hospital').length === 0 && hospitalStats.total === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}>No hospitals registered</td></tr>
              ) : null}
            </tbody>
          </table>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 12 }}>
            ℹ️ Hospital data is accessible in read-only mode for emergency routing optimization.
          </p>
        </div>
      )}

      {/* FLEET TAB */}
      {activeTab === 'fleet' && (
        <div className="admin-chart-panel">
          <h3>🚑 Ambulance Fleet & Driver Info</h3>
          <div className="admin-kpi-grid" style={{ marginBottom: 20 }}>
            <div className="admin-kpi-card kpi-ambulances">
              <div className="kpi-icon">✅</div>
              <div className="kpi-content">
                <div className="kpi-value" style={{ color: '#43A047' }}>{ambulanceStats.available}</div>
                <div className="kpi-label">Available</div>
              </div>
            </div>
            <div className="admin-kpi-card kpi-emergencies">
              <div className="kpi-icon">🔴</div>
              <div className="kpi-content">
                <div className="kpi-value" style={{ color: '#E53935' }}>{ambulanceStats.dispatched}</div>
                <div className="kpi-label">Dispatched</div>
              </div>
            </div>
            <div className="admin-kpi-card">
              <div className="kpi-icon">⛽</div>
              <div className="kpi-content">
                <div className="kpi-value">{ambulanceStats.avgFuel}%</div>
                <div className="kpi-label">Avg Fuel Level</div>
              </div>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Username</th>
                <th>Vehicle</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role === 'ambulance_driver').map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>@{u.username}</td>
                  <td>{u.vehicleNumber || '—'}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${u.profileCompleted ? 'badge-green' : 'badge-amber'}`}>
                      {u.profileCompleted ? 'Active' : 'Setup Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {users.filter(u => u.role === 'ambulance_driver').length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 30 }}>No drivers registered</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="admin-chart-panel">
          <h3>👥 All Registered Users</h3>
          <div className="admin-kpi-grid" style={{ marginBottom: 20 }}>
            {Object.entries(usersByRole).filter(([k]) => k !== 'total').map(([role, count]) => (
              <div key={role} className="admin-kpi-card" style={{ borderColor: ROLE_COLORS[role] + '40' }}>
                <div className="kpi-content">
                  <div className="kpi-value" style={{ color: ROLE_COLORS[role] }}>{count}</div>
                  <div className="kpi-label">{ROLE_LABELS[role]}</div>
                </div>
              </div>
            ))}
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Email</th>
                <th>Profile</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>@{u.username}</td>
                  <td>
                    <span className="badge" style={{ background: ROLE_COLORS[u.role] + '20', color: ROLE_COLORS[u.role] }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.profileCompleted ? 'badge-green' : 'badge-amber'}`}>
                      {u.profileCompleted ? '✅ Complete' : '⏳ Pending'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="admin-chart-panel">
          <h3>📋 System Activity Log</h3>
          <div className="admin-activity-feed" style={{ maxHeight: 600 }}>
            {logs.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-icon">📭</div>
                <p>No activity logs recorded yet</p>
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="activity-item">
                  <span className="activity-icon">{getLogIcon(log.action)}</span>
                  <div className="activity-content">
                    <span className="activity-action">{formatLogAction(log.action)}</span>
                    <span className="activity-by">
                      by <strong>{log.by || 'system'}</strong>
                      {log.user && ` → ${log.user}`}
                      {log.driver && ` → ${log.driver}`}
                      {log.hospital && ` → ${log.hospital}`}
                    </span>
                  </div>
                  <span className="activity-time">{formatTime(log.time)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function formatTime(time) {
  if (!time) return '—';
  const d = new Date(time);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatLogAction(action) {
  const map = {
    'USER_LOGIN': 'User logged in',
    'DRIVER_REGISTERED': 'Driver registered',
    'TRAFFIC_AUTHORITY_REGISTERED': 'Traffic Authority registered',
    'HOSPITAL_REGISTERED': 'Hospital registered',
    'DRIVER_PROFILE_COMPLETED': 'Driver profile completed',
    'HOSPITAL_PROFILE_COMPLETED': 'Hospital setup completed',
    'DRIVER_APPROVED': 'Driver approved',
    'HOSPITAL_APPROVED': 'Hospital approved',
    'EMERGENCY_DISPATCHED': 'Emergency dispatched',
    'EMERGENCY_RESOLVED': 'Emergency resolved',
  };
  return map[action] || action.replace(/_/g, ' ').toLowerCase();
}

function getLogIcon(action) {
  const icons = {
    'USER_LOGIN': '🔑',
    'DRIVER_REGISTERED': '🚑',
    'TRAFFIC_AUTHORITY_REGISTERED': '🚦',
    'HOSPITAL_REGISTERED': '🏥',
    'DRIVER_PROFILE_COMPLETED': '✅',
    'HOSPITAL_PROFILE_COMPLETED': '✅',
    'DRIVER_APPROVED': '👍',
    'HOSPITAL_APPROVED': '👍',
    'EMERGENCY_DISPATCHED': '🚨',
    'EMERGENCY_RESOLVED': '✔️',
  };
  return icons[action] || '📌';
}

function generateHospitalCapacityData() {
  // This is mock data for visualization - in production, this would come from the backend
  return [
    { name: 'City General', total: 200, available: 45, icu: 3 },
    { name: 'Apollo', total: 350, available: 78, icu: 8 },
    { name: 'Manipal', total: 150, available: 22, icu: 5 },
    { name: 'Fortis', total: 120, available: 15, icu: 2 },
    { name: 'Narayana', total: 500, available: 120, icu: 12 },
    { name: 'Columbia', total: 180, available: 35, icu: 4 },
  ];
}
