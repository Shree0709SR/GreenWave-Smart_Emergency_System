const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  status: { type: String, default: 'active', enum: ['active', 'resolved'] },
  severity: { type: String, default: 'medium' },
  type: { type: String, default: 'general' },
  patientInfo: { type: String, default: 'Unknown' },
  patientLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  ambulanceId: { type: String },
  hospital: {
    id: { type: String },
    name: { type: String },
    lat: { type: Number },
    lng: { type: Number }
  },
  routeToPatient: { type: mongoose.Schema.Types.Mixed },
  routeToHospital: { type: mongoose.Schema.Types.Mixed },
  corridor: { type: mongoose.Schema.Types.Mixed },
  totalETA: { type: Number },
  totalDistance: { type: Number },
  signalsCleared: { type: Number, default: 0 },
  resolvedAt: { type: String },
  responseTime: { type: Number },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.model('Emergency', emergencySchema);
