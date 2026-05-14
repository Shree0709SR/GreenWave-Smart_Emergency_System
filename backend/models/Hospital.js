const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  type: { type: String, default: 'General' },
  totalBeds: { type: Number, default: 0 },
  availableBeds: { type: Number, default: 0 },
  icuBeds: { type: Number, default: 0 },
  icuAvailable: { type: Number, default: 0 },
  emergencyReady: { type: Boolean, default: false },
  specialties: [{ type: String }],
  rating: { type: Number, default: 0 },
  phone: { type: String },
  address: { type: String },
  workingTimings: { type: String },
  status: { type: String, default: 'active' },
  registrationHash: { type: String },
  encryptedLicense: { type: String }
});

module.exports = mongoose.model('Hospital', hospitalSchema);
