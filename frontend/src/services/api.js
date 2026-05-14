import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';
const socket = io('http://localhost:5000', { autoConnect: true, reconnection: true, reconnectionDelay: 1000 });

// ---- REST helpers ----
function getToken() { return sessionStorage.getItem('setcs_token'); }

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return res.json();
}

export const api = {
  // Auth
  login: (username, password, deviceId = 'web-browser-1') => request('/auth/login', { method: 'POST', body: { username, password, deviceId } }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  completeProfile: (data) => request('/auth/complete-profile', { method: 'POST', body: data }),
  verifyToken: (token) => fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  getRoles: () => request('/auth/roles'),
  getDepartments: () => request('/auth/departments'),
  
  // Drivers
  getDrivers: () => request('/drivers'),
  registerDriver: (data) => request('/drivers/register', { method: 'POST', body: data }),
  approveDriver: (id) => request(`/drivers/${id}/approve`, { method: 'PATCH' }),

  // Hospitals
  registerHospital: (data) => request('/hospitals/register', { method: 'POST', body: data }),
  approveHospital: (id) => request(`/hospitals/${id}/approve`, { method: 'PATCH' }),

  getDashboard: () => request('/dashboard'),
  getHealth: () => request('/health'),

  // Ambulances
  getAmbulances: () => request('/ambulances'),
  updateAmbulanceStatus: (id, status) => request(`/ambulances/${id}/status`, { method: 'PATCH', body: { status } }),

  // Hospitals
  getHospitals: () => request('/hospitals'),
  findBestHospital: (lat, lng, specialty, needsICU) =>
    request('/hospitals/find-best', { method: 'POST', body: { lat, lng, specialty, needsICU } }),
  updateHospitalAvailability: (id, data) => request(`/hospitals/${id}/availability`, { method: 'PATCH', body: data }),

  // Signals
  getSignals: () => request('/signals'),
  getSignalStats: () => request('/signals/stats'),
  updateSignal: (id, status) => request(`/signals/${id}`, { method: 'PATCH', body: { status } }),
  createCorridor: (data) => request('/signals/corridor', { method: 'POST', body: data }),
  releaseCorridor: (id) => request(`/signals/corridor/${id}`, { method: 'DELETE' }),
  getSignalHistory: () => request('/signals/history/changes'),

  // Emergencies
  getEmergencies: () => request('/emergencies'),
  dispatch: (data) => request('/emergencies/dispatch', { method: 'POST', body: data }),
  resolveEmergency: (id) => request(`/emergencies/${id}/resolve`, { method: 'PATCH' }),
  getAnalytics: () => request('/emergencies/analytics/summary'),
  optimizeRoute: (data) => request('/emergencies/optimize-route', { method: 'POST', body: data }),
  getNearbyHospitals: (data) => request('/emergencies/nearby-hospitals', { method: 'POST', body: data }),
  driverDispatch: (data) => request('/emergencies/driver-dispatch', { method: 'POST', body: data }),
  driverMessage: (data) => request('/emergencies/driver-message', { method: 'POST', body: data }),

  // Admin
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: () => request('/admin/users'),
  getAdminLogs: () => request('/admin/logs'),
  getAdminHospitals: () => request('/admin/hospitals'),
  getAdminAmbulances: () => request('/admin/ambulances'),

  // ESP32 Hardware Control
  getHardwareStatus: () => request('/signals/hardware/status'),
  setHardwareManual: (signal, color) => request('/signals/hardware/manual', { method: 'POST', body: { signal, color } }),
  clearHardwareManual: () => request('/signals/hardware/manual', { method: 'DELETE' }),
  setHardwarePriority: (signalIndex, emergencyId) => request('/signals/hardware/priority', { method: 'POST', body: { signalIndex, emergencyId } }),
  clearHardwarePriority: () => request('/signals/hardware/priority', { method: 'DELETE' }),
  updateHardwareMappings: (mappings) => request('/signals/hardware/mappings', { method: 'POST', body: mappings }),
};

export { socket };
export default api;
