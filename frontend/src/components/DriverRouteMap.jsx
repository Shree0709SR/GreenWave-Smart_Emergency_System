import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

// Custom marker icons
const icon = (emoji, size = 30) => L.divIcon({
  html: `<div style="font-size:${size}px;text-align:center;line-height:${size}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">${emoji}</div>`,
  iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: ''
});

const ambulanceIcon = icon('🚑', 34);
const hospitalIcon = icon('🏥', 30);
const signalGreen = icon('🟢', 20);
const signalRed = icon('🔴', 16);
const signalYellow = icon('🟡', 16);

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

function LiveTracker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position, { animate: true });
  }, [position, map]);
  return null;
}

/**
 * DriverRouteMap — shows the ambulance route to hospital with signals and hospitals highlighted
 * Props:
 *   emergency - the active emergency object
 *   ambulancePos - { lat, lng } live GPS position
 *   signals - array of traffic signal objects
 *   hospitals - array of hospital objects
 */
export default function DriverRouteMap({ emergency, ambulancePos, signals = [], hospitals = [] }) {
  if (!emergency) return null;

  const ambLat = ambulancePos?.lat || emergency.patientLocation?.lat || 12.9716;
  const ambLng = ambulancePos?.lng || emergency.patientLocation?.lng || 77.5946;
  const hospLat = emergency.hospital?.lat;
  const hospLng = emergency.hospital?.lng;

  // Route polyline points
  const routePoints = emergency.routeToHospital?.routePoints?.map(p => [p.lat, p.lng]) || [];
  const fullRoute = routePoints.length > 0
    ? [[ambLat, ambLng], ...routePoints, ...(hospLat ? [[hospLat, hospLng]] : [])]
    : hospLat ? [[ambLat, ambLng], [hospLat, hospLng]] : [[ambLat, ambLng]];

  // Signals on this route
  const routeSignalIds = new Set([
    ...(emergency.routeToHospital?.signalsOnRoute || []),
    ...(emergency.corridor?.signalIds || []),
  ]);
  const routeSignals = signals.filter(s => routeSignalIds.has(s.id));
  const otherSignals = signals.filter(s => !routeSignalIds.has(s.id));

  // Destination hospital
  const destHospital = hospitals.find(h => h.id === emergency.hospital?.id);

  // Bounds for auto-fit
  const bounds = fullRoute.length >= 2 ? fullRoute : undefined;

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)', marginTop: 12 }}>
      <div style={{ height: 360, position: 'relative' }}>
        <MapContainer center={[ambLat, ambLng]} zoom={14} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {bounds && <FitBounds bounds={bounds} />}
          <LiveTracker position={[ambLat, ambLng]} />

          {/* Route line (green corridor) */}
          {fullRoute.length >= 2 && (
            <Polyline
              positions={fullRoute}
              pathOptions={{ color: '#22c55e', weight: 5, opacity: 0.85 }}
            />
          )}

          {/* Route glow effect */}
          {fullRoute.length >= 2 && (
            <Polyline
              positions={fullRoute}
              pathOptions={{ color: '#22c55e', weight: 12, opacity: 0.15 }}
            />
          )}

          {/* Ambulance marker (live) */}
          <Marker position={[ambLat, ambLng]} icon={ambulanceIcon}>
            <Popup>
              <strong>🚑 Your Ambulance</strong><br />
              <span style={{ fontSize: '0.8rem' }}>
                📍 {ambLat.toFixed(4)}, {ambLng.toFixed(4)}
              </span>
            </Popup>
          </Marker>

          {/* Destination hospital */}
          {hospLat && (
            <Marker position={[hospLat, hospLng]} icon={hospitalIcon}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <strong>🏥 {emergency.hospital?.name}</strong><br />
                  {destHospital && (
                    <>
                      <span style={{ fontSize: '0.8rem' }}>🛏️ Beds: {destHospital.availableBeds}/{destHospital.totalBeds}</span><br />
                      <span style={{ fontSize: '0.8rem' }}>🏨 ICU: {destHospital.icuAvailable}/{destHospital.icuBeds}</span><br />
                      <span style={{ fontSize: '0.8rem' }}>⭐ {destHospital.rating} | 📍 {destHospital.address}</span>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Destination pulse circle */}
          {hospLat && (
            <CircleMarker center={[hospLat, hospLng]} radius={18}
              pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.15, weight: 2 }} />
          )}

          {/* Route signals (highlighted) */}
          {routeSignals.map(s => (
            <Marker key={s.id} position={[s.lat, s.lng]}
              icon={s.status === 'green' || s.corridor ? signalGreen : s.status === 'yellow' ? signalYellow : signalRed}>
              <Popup>
                <strong>{s.name}</strong><br />
                <span style={{ color: s.corridor ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                  {s.corridor ? '🟢 GREEN CORRIDOR' : s.status?.toUpperCase()}
                </span>
              </Popup>
            </Marker>
          ))}

          {/* Nearby other signals (dimmed) */}
          {otherSignals.map(s => (
            <CircleMarker key={s.id} center={[s.lat, s.lng]} radius={4}
              pathOptions={{ color: s.status === 'green' ? '#22c55e' : '#ef4444', fillOpacity: 0.3, weight: 1, opacity: 0.4 }}>
              <Popup><strong>{s.name}</strong> — {s.status}</Popup>
            </CircleMarker>
          ))}

          {/* Other hospitals (dimmed) */}
          {hospitals.filter(h => h.id !== emergency.hospital?.id).map(h => (
            <CircleMarker key={h.id} center={[h.lat, h.lng]} radius={6}
              pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.2, weight: 1, opacity: 0.5 }}>
              <Popup>
                <strong>{h.name}</strong><br />
                <span style={{ fontSize: '0.8rem' }}>🛏️ {h.availableBeds} beds | ⭐ {h.rating}</span>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Map Legend */}
      <div style={{
        display: 'flex', gap: 16, padding: '8px 14px', flexWrap: 'wrap',
        background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)',
        fontSize: '0.72rem', color: 'var(--text-muted)'
      }}>
        <span>🚑 You</span>
        <span>🏥 Destination</span>
        <span>🟢 Green Corridor</span>
        <span>🔴 Red Signal</span>
        <span style={{ color: '#6366f1' }}>● Other Hospitals</span>
        <span style={{ marginLeft: 'auto', color: 'var(--accent-blue)' }}>
          📏 {emergency.totalDistance} km | ⏱️ ~{emergency.totalETA} min
        </span>
      </div>
    </div>
  );
}
