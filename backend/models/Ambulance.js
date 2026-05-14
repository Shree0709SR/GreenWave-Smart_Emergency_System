const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  vehicleNumber: { type: String, required: true },
  driverName: { type: String },
  phone: { type: String },
  type: { type: String, default: 'Basic Life Support' },
  status: { type: String, default: 'available' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  fuelLevel: { type: Number, default: 100 },
  equipment: [{ type: String }]
});

module.exports = mongoose.model('Ambulance', ambulanceSchema);
