import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { socket } from '../services/api';

// Custom marker icons
const createIcon = (emoji, size = 30) => L.divIcon({
  html: `<div style="font-size:${size}px;text-align:center;line-height:${size}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">${emoji}</div>`,
  iconSize: [size, size], iconAnchor: [size/2, size/2], className: ''
});

const ambulanceIcon = createIcon('🚑', 32);
const hospitalIcon = createIcon('🏥', 28);
const patientIcon = createIcon('🆘', 28);

// Signal icon based on status
const signalIcon = (status) => createIcon(status === 'green' ? '🟢' : status === 'yellow' ? '🟡' : '🔴', 18);

// Auto-panning component
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

export default function MapView({ data }) {
  const [selectedAmb, setSelectedAmb] = useState(null);
  const [livePositions, setLivePositions] = useState({});
  const [showSignals, setShowSignals] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [trackAmb, setTrackAmb] = useState(null);
  const center = [12.9716, 77.5946]; // Bangalore center

  useEffect(() => {
    const handler = (pos) => {
      setLivePositions(p => ({ ...p, [pos.ambulanceId]: pos }));
    };
    socket.on('gps:update', handler);
    return () => socket.off('gps:update', handler);
  }, []);

  const ambulances = (data.ambulances || []).map(a => {
    const live = livePositions[a.id];
    return live ? { ...a, lat: live.lat, lng: live.lng, speed: live.speed, heading: live.heading } : a;
  });

  const activeEmergencies = (data.emergencies || []).filter(e => e.status === 'active');
  const trackCenter = trackAmb ? ambulances.find(a => a.id === trackAmb) : null;

  return (
    <div>
      {/* Map Controls */}
      <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <button className={`btn btn-sm ${showSignals ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowSignals(!showSignals)}>
          🚦 Signals
        </button>
        <button className={`btn btn-sm ${showHospitals ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowHospitals(!showHospitals)}>
          🏥 Hospitals
        </button>
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Track:</span>
          <select value={trackAmb || ''} onChange={e => setTrackAmb(e.target.value || null)}
            style={{padding:'4px 8px',fontSize:'0.8rem',background:'var(--bg-secondary)',border:'1px solid var(--border-color)',color:'var(--text-primary)',borderRadius:6}}>
            <option value="">None</option>
            {ambulances.map(a => <option key={a.id} value={a.id}>{a.vehicleNumber}</option>)}
          </select>
        </div>
      </div>

      {/* Ambulance status strip */}
      <div style={{display:'flex',gap:8,marginBottom:12,overflowX:'auto',paddingBottom:4}}>
        {ambulances.map(a => (
          <div key={a.id} onClick={() => { setSelectedAmb(a.id); setTrackAmb(a.id); }}
            style={{
              background: a.status === 'dispatched' ? 'rgba(239,68,68,0.15)' : 'var(--bg-card)',
              border: `1px solid ${a.status === 'dispatched' ? 'rgba(239,68,68,0.4)' : 'var(--border-color)'}`,
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer', minWidth: 160, transition: 'all 0.2s',
              ...(selectedAmb === a.id ? {borderColor:'var(--accent-blue)',boxShadow:'0 0 12px var(--accent-blue-glow)'} : {})
            }}>
            <div style={{fontSize:'0.8rem',fontWeight:600}}>🚑 {a.vehicleNumber}</div>
            <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>
              {a.speed > 0 ? `${Math.round(a.speed)} km/h` : a.status}
            </div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="map-container">
        <MapContainer center={center} zoom={13} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {trackCenter && <MapUpdater center={[trackCenter.lat, trackCenter.lng]} />}

          {/* Ambulances */}
          {ambulances.map(a => (
            <Marker key={a.id} position={[a.lat, a.lng]} icon={ambulanceIcon}>
              <Popup>
                <div style={{minWidth:180}}>
                  <strong>{a.vehicleNumber}</strong><br/>
                  <span style={{fontSize:'0.8rem'}}>🧑 {a.driverName}</span><br/>
                  <span style={{fontSize:'0.8rem'}}>📱 {a.phone}</span><br/>
                  <span className={`badge ${a.status === 'available' ? 'badge-green' : 'badge-red'}`} style={{marginTop:4}}>{a.status}</span>
                  {a.speed > 0 && <span style={{fontSize:'0.8rem',marginLeft:8}}>🏎️ {Math.round(a.speed)} km/h</span>}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Hospitals */}
          {showHospitals && (data.hospitals || []).map(h => (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={hospitalIcon}>
              <Popup>
                <div style={{minWidth:200}}>
                  <strong>{h.name}</strong><br/>
                  <span style={{fontSize:'0.8rem'}}>🛏️ Beds: {h.availableBeds}/{h.totalBeds}</span><br/>
                  <span style={{fontSize:'0.8rem'}}>🏨 ICU: {h.icuAvailable}/{h.icuBeds}</span><br/>
                  <span style={{fontSize:'0.8rem'}}>⭐ {h.rating} | 📍 {h.address}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Traffic Signals */}
          {showSignals && (data.signals || []).map(s => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={signalIcon(s.status)}>
              <Popup>
                <div>
                  <strong>{s.name}</strong><br/>
                  <span className={`badge ${s.status === 'green' ? 'badge-green' : 'badge-red'}`}>{s.status.toUpperCase()}</span>
                  {s.corridor && <span style={{fontSize:'0.75rem',marginLeft:8,color:'#f59e0b'}}>🚧 CORRIDOR</span>}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Emergency routes */}
          {activeEmergencies.map(em => (
            <div key={em.id}>
              {em.routeToPatient?.routePoints && (
                <Polyline positions={em.routeToPatient.routePoints.map(p => [p.lat, p.lng])} pathOptions={{color:'#ef4444',weight:4,dashArray:'10 6',opacity:0.8}} />
              )}
              {em.routeToHospital?.routePoints && (
                <Polyline positions={em.routeToHospital.routePoints.map(p => [p.lat, p.lng])} pathOptions={{color:'#22c55e',weight:4,opacity:0.8}} />
              )}
              {em.patientLocation && (
                <Marker position={[em.patientLocation.lat, em.patientLocation.lng]} icon={patientIcon}>
                  <Popup><strong>Patient Location</strong><br/>{em.patientInfo || 'Emergency'}</Popup>
                </Marker>
              )}
            </div>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
