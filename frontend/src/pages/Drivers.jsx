import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Drivers({ data }) {
  const [drivers, setDrivers] = useState([]);
  
  const loadDrivers = () => {
    api.getDrivers().then(res => { if (res.success) setDrivers(res.data); });
  };
  
  useEffect(() => { loadDrivers(); }, []);

  const handleApprove = async (id) => {
    await api.approveDriver(id);
    loadDrivers();
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>🧑‍✈️ System Driver Directory & Approvals</h3>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Driver</th>
            <th>Contact</th>
            <th>Hospital</th>
            <th>Ambulance</th>
            <th>Status</th>
            <th>Approval</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map(d => (
            <tr key={d.id}>
              <td><strong>{d.name}</strong><br/><small className="text-muted">@{d.username}</small></td>
              <td>{d.phone}<br/><small className="text-muted">{d.email}</small></td>
              <td>{d.hospitalName || d.hospitalId}</td>
              <td>{d.ambulanceId} ({d.vehicleNumber})</td>
              <td>
                {d.status === 'active' ? <span className="badge badge-green">Active</span> :
                  <span className="badge badge-amber">{d.status.replace('_', ' ')}</span>}
              </td>
              <td>
                <div style={{fontSize:'0.75rem'}}>
                  Hosp: {d.hospitalApproved ? '✅' : '❌'}<br/>
                  Traf: {d.trafficAuthorityApproved ? '✅' : '❌'}
                </div>
              </td>
              <td>
                {!d.trafficAuthorityApproved && d.role === 'ambulance_driver' && (
                  <button className="btn btn-success btn-sm" onClick={() => handleApprove(d.id)}>Approve</button>
                )}
              </td>
            </tr>
          ))}
          {drivers.length === 0 && <tr><td colSpan="7" style={{textAlign:'center'}}>No drivers registered yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
