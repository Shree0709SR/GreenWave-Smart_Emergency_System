import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import api from '../services/api';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

export default function Analytics({ data }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.getAnalytics().then(r => r.success && setAnalytics(r.data)).catch(() => {});
  }, [data]);

  const hospitals = data.hospitals || [];
  const ambulances = data.ambulances || [];
  const signals = data.signals || [];
  const emergencies = data.emergencies || [];

  // Chart data
  const hospitalCapacity = hospitals.map(h => ({
    name: h.name.split(' ').slice(0, 2).join(' '),
    beds: h.availableBeds,
    total: h.totalBeds,
    icu: h.icuAvailable,
    occupancy: Math.round((1 - h.availableBeds / h.totalBeds) * 100)
  }));

  const signalData = [
    { name: 'Green', value: signals.filter(s => s.status === 'green').length, color: '#22c55e' },
    { name: 'Red', value: signals.filter(s => s.status === 'red').length, color: '#ef4444' },
    { name: 'Corridor', value: signals.filter(s => s.corridor).length, color: '#f59e0b' }
  ];

  const ambulanceData = [
    { name: 'Available', value: ambulances.filter(a => a.status === 'available').length, color: '#22c55e' },
    { name: 'Dispatched', value: ambulances.filter(a => a.status === 'dispatched').length, color: '#ef4444' },
    { name: 'At Hospital', value: ambulances.filter(a => a.status === 'at-hospital').length, color: '#3b82f6' }
  ];

  // Simulated time-series for response times
  const responseTimeTrend = Array.from({ length: 8 }, (_, i) => ({
    time: `${8 + i * 2}:00`,
    responseTime: 8 + Math.random() * 7,
    avgSpeed: 30 + Math.random() * 25,
    signalsCleared: Math.floor(2 + Math.random() * 6)
  }));

  const tooltipStyle = {
    contentStyle: { background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' },
    labelStyle: { color: '#8b95b0' }
  };

  return (
    <div>
      {/* Stats row */}
      {analytics && (
        <div className="stats-grid">
          <div className="stat-card info">
            <span className="stat-icon">📊</span>
            <span className="stat-value">{analytics.totalEmergencies}</span>
            <span className="stat-label">Total Emergencies</span>
          </div>
          <div className="stat-card success">
            <span className="stat-icon">⏱️</span>
            <span className="stat-value">{analytics.avgResponseTime}<small style={{fontSize:'0.4em'}}>min</small></span>
            <span className="stat-label">Avg Response Time</span>
          </div>
          <div className="stat-card warning">
            <span className="stat-icon">📈</span>
            <span className="stat-value">{analytics.successRate}%</span>
            <span className="stat-label">Success Rate</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🏨</span>
            <span className="stat-value">{analytics.hospitalCapacity}%</span>
            <span className="stat-label">Hospital Availability</span>
          </div>
        </div>
      )}

      <div className="panel-grid">
        {/* Hospital Capacity Chart */}
        <div className="panel">
          <div className="panel-header"><h3>🏥 Hospital Occupancy</h3></div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hospitalCapacity}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: '#8b95b0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b95b0', fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Bar dataKey="beds" name="Available Beds" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="icu" name="ICU Available" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Response Time Trend */}
        <div className="panel">
          <div className="panel-header"><h3>⏱️ Response Time Trend</h3></div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={responseTimeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="time" tick={{ fill: '#8b95b0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b95b0', fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Area type="monotone" dataKey="responseTime" name="Response (min)" stroke="#ef4444" fill="rgba(239,68,68,0.2)" />
              <Area type="monotone" dataKey="avgSpeed" name="Avg Speed (km/h)" stroke="#22c55e" fill="rgba(34,197,94,0.1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Signal Distribution Pie */}
        <div className="panel">
          <div className="panel-header"><h3>🚦 Signal Distribution</h3></div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={signalData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {signalData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Ambulance Fleet Pie */}
        <div className="panel">
          <div className="panel-header"><h3>🚑 Fleet Status</h3></div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={ambulanceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {ambulanceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Emergency Log */}
      {emergencies.length > 0 && (
        <div className="panel">
          <div className="panel-header"><h3>📋 Emergency Log</h3></div>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Type</th><th>Severity</th><th>Ambulance</th><th>Hospital</th><th>ETA</th><th>Distance</th><th>Signals</th><th>Status</th></tr></thead>
            <tbody>
              {emergencies.slice().reverse().map(em => (
                <tr key={em.id}>
                  <td style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem'}}>{em.id.slice(-8)}</td>
                  <td><span className="badge badge-blue">{em.type}</span></td>
                  <td><span className={`badge ${em.severity === 'critical' ? 'badge-red' : 'badge-amber'}`}>{em.severity}</span></td>
                  <td>{em.ambulanceId}</td>
                  <td>{em.hospital?.name?.split(' ').slice(0, 2).join(' ')}</td>
                  <td>{em.totalETA} min</td>
                  <td>{em.totalDistance} km</td>
                  <td>{em.signalsCleared}</td>
                  <td><span className={`badge ${em.status === 'active' ? 'badge-red' : 'badge-green'}`}>{em.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
