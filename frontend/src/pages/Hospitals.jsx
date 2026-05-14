import { useState } from 'react';
import api from '../services/api';

export default function Hospitals({ data, onRefresh }) {
  const [findResult, setFindResult] = useState(null);
  const [searchLat, setSearchLat] = useState('12.965');
  const [searchLng, setSearchLng] = useState('77.590');
  const [specialty, setSpecialty] = useState('');
  const [needsICU, setNeedsICU] = useState(false);
  
  const [showReg, setShowReg] = useState(false);
  const [newHosp, setNewHosp] = useState({ name: '', lat: '', lng: '', type: 'General', totalBeds: '', icuBeds: '', specialties: '', phone: '', address: '', registrationNumber: '', licenseDoc: '', username: '', password: '' });

  const handleFindBest = async () => {
    const res = await api.findBestHospital(parseFloat(searchLat), parseFloat(searchLng), specialty || undefined, needsICU);
    if (res.success) setFindResult(res.data);
  };

  const hospitals = data.hospitals || [];

  const handleRegister = async (e) => {
    e.preventDefault();
    const specialtiesArray = newHosp.specialties.split(',').map(s => s.trim()).filter(s => s);
    const payload = { ...newHosp, specialties: specialtiesArray };
    const res = await api.registerHospital(payload);
    if (res.success) {
      setShowReg(false);
      setNewHosp({ name: '', lat: '', lng: '', type: 'General', totalBeds: '', icuBeds: '', specialties: '', phone: '', address: '', registrationNumber: '', licenseDoc: '', username: '', password: '' });
      onRefresh();
    } else {
      alert(res.message);
    }
  };

  const handleApprove = async (id) => {
    const res = await api.approveHospital(id);
    if (res.success) onRefresh();
  };

  return (
    <div>
      {/* Registration Form */}
      <div className="panel" style={{marginBottom: 24}}>
        <div className="panel-header">
          <h3>🏥 Hospital Registration & Management</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowReg(!showReg)}>{showReg ? 'Close' : '➕ Register Hospital'}</button>
        </div>
        
        {showReg && (
          <form onSubmit={handleRegister} style={{background:'#1A1A1A',padding:20,borderRadius:12,marginTop:16}}>
            <h4>Onboard New Hospital</h4>
            <div className="form-row" style={{marginTop:12}}>
              <div className="form-group"><label>Hospital Name</label><input required value={newHosp.name} onChange={e=>setNewHosp({...newHosp, name: e.target.value})} /></div>
              <div className="form-group"><label>Type</label>
                <select value={newHosp.type} onChange={e=>setNewHosp({...newHosp, type: e.target.value})}>
                  <option value="General">General</option>
                  <option value="Multi-Specialty">Multi-Specialty</option>
                  <option value="Trauma Center">Trauma Center</option>
                  <option value="Cardiac Specialty">Cardiac Specialty</option>
                  <option value="Super Specialty">Super Specialty</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Admin Username</label><input required value={newHosp.username} onChange={e=>setNewHosp({...newHosp, username: e.target.value})} /></div>
              <div className="form-group"><label>Admin Password</label><input required type="password" value={newHosp.password} onChange={e=>setNewHosp({...newHosp, password: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Phone Number (OTP Verification)</label><input required value={newHosp.phone} onChange={e=>setNewHosp({...newHosp, phone: e.target.value})} /></div>
              <div className="form-group"><label>Registration Number</label><input required value={newHosp.registrationNumber} onChange={e=>setNewHosp({...newHosp, registrationNumber: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Total Beds</label><input required type="number" value={newHosp.totalBeds} onChange={e=>setNewHosp({...newHosp, totalBeds: e.target.value})} /></div>
              <div className="form-group"><label>ICU Beds</label><input required type="number" value={newHosp.icuBeds} onChange={e=>setNewHosp({...newHosp, icuBeds: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Latitude</label><input required type="number" step="0.0001" value={newHosp.lat} onChange={e=>setNewHosp({...newHosp, lat: e.target.value})} /></div>
              <div className="form-group"><label>Longitude</label><input required type="number" step="0.0001" value={newHosp.lng} onChange={e=>setNewHosp({...newHosp, lng: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Specialties (comma separated)</label><input value={newHosp.specialties} onChange={e=>setNewHosp({...newHosp, specialties: e.target.value})} placeholder="Trauma, Cardiology, etc." /></div>
              <div className="form-group"><label>Address</label><input required value={newHosp.address} onChange={e=>setNewHosp({...newHosp, address: e.target.value})} /></div>
            </div>
            <button type="submit" className="btn btn-success" style={{marginTop:12}}>Submit Registration</button>
          </form>
        )}
      </div>

      {/* Hospital Finder */}
      <div className="panel" style={{borderColor:'rgba(34,197,94,0.3)', marginBottom: 24}}>
        <div className="panel-header"><h3>🔍 AI Hospital Finder</h3></div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div className="form-group" style={{margin:0}}>
            <label>Patient Lat</label>
            <input type="number" step="0.001" value={searchLat} onChange={e => setSearchLat(e.target.value)} style={{width:130}} />
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Patient Lng</label>
            <input type="number" step="0.001" value={searchLng} onChange={e => setSearchLng(e.target.value)} style={{width:130}} />
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Specialty</label>
            <select value={specialty} onChange={e => setSpecialty(e.target.value)} style={{width:160}}>
              <option value="">Any</option>
              <option value="Trauma">Trauma</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Burns">Burns</option>
              <option value="Pediatrics">Pediatrics</option>
            </select>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.85rem',cursor:'pointer',marginBottom:16}}>
            <input type="checkbox" checked={needsICU} onChange={e => setNeedsICU(e.target.checked)} /> ICU Required
          </label>
          <button className="btn btn-success btn-sm" onClick={handleFindBest} style={{marginBottom:16}}>🔍 Find Best</button>
        </div>

        {findResult && findResult.length > 0 && (
          <div style={{marginTop:16}}>
            <h4 style={{fontSize:'0.85rem',color:'var(--accent-green)',marginBottom:12}}>
              ✅ Recommended: {findResult[0].name} (Score: {findResult[0].compositeScore})
            </h4>
            <div className="cards-grid">
              {findResult.slice(0, 4).map((h, i) => (
                <div key={h.id} className="info-card" style={i === 0 ? {borderColor:'rgba(34,197,94,0.4)',boxShadow:'0 0 20px rgba(34,197,94,0.15)'} : {}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <h4>{i === 0 ? '⭐ ' : ''}{h.name}</h4>
                    <span className={`badge ${h.compositeScore > 60 ? 'badge-green' : h.compositeScore > 40 ? 'badge-amber' : 'badge-red'}`}>
                      Score: {h.compositeScore}
                    </span>
                  </div>
                  <div className="meta" style={{marginTop:8}}>
                    <div>📏 {h.distance} km away | ⏱️ ETA: {h.eta} min</div>
                    <div>🛏️ Beds: {h.availableBeds}/{h.totalBeds} | 🏨 ICU: {h.icuAvailable}/{h.icuBeds}</div>
                    <div>⭐ Rating: {h.rating} | 🏷️ {h.type}</div>
                    <div style={{marginTop:4,display:'flex',gap:4,flexWrap:'wrap'}}>
                      {h.specialties.map(s => <span key={s} className="badge badge-purple" style={{fontSize:'0.65rem'}}>{s}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* All Hospitals */}
      <div className="panel">
        <div className="panel-header">
          <h3>🏥 All Hospitals Directory ({hospitals.length})</h3>
          <button className="btn btn-outline btn-sm" onClick={onRefresh}>Refresh</button>
        </div>
        <div className="cards-grid">
          {hospitals.map(h => (
            <div key={h.id} className="info-card" style={h.status === 'pending_approval' ? {borderColor:'var(--accent-amber)', opacity: 0.8} : {}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h4>{h.name}</h4>
                {h.status === 'pending_approval' ? (
                  <button className="btn btn-success btn-sm" onClick={() => handleApprove(h.id)}>Approve Hospital</button>
                ) : (
                  <span className={`badge ${h.emergencyReady ? 'badge-green' : 'badge-red'}`}>
                    {h.emergencyReady ? '🟢 Ready' : '🔴 Busy'}
                  </span>
                )}
              </div>
              {h.status === 'pending_approval' && <div style={{color:'var(--accent-amber)', fontSize:'0.75rem', marginTop:4}}>⚠️ Pending Verification</div>}
              <div className="meta" style={{marginTop:8}}>
                <div>📍 {h.address}</div>
                <div>📞 {h.phone}</div>
                <div>🏷️ {h.type} | ⭐ {h.rating || 'New'}</div>
              </div>
              <div className="card-row">
                <div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Beds</div>
                  <strong>{h.availableBeds}/{h.totalBeds}</strong>
                  <div className="progress-bar" style={{width:100}}>
                    <div className="progress-fill green" style={{width:`${(h.availableBeds/h.totalBeds)*100}%`}}></div>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>ICU</div>
                  <strong>{h.icuAvailable}/{h.icuBeds}</strong>
                  <div className="progress-bar" style={{width:80}}>
                    <div className={`progress-fill ${h.icuAvailable > 2 ? 'green' : 'red'}`} style={{width:`${(h.icuAvailable/h.icuBeds)*100}%`}}></div>
                  </div>
                </div>
              </div>
              <div style={{marginTop:8,display:'flex',gap:4,flexWrap:'wrap'}}>
                {h.specialties?.map(s => <span key={s} className="badge badge-blue" style={{fontSize:'0.65rem'}}>{s}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
