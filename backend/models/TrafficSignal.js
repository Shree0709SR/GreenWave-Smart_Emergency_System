const mongoose = require('mongoose');

const trafficSignalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  status: { type: String, default: 'red', enum: ['red', 'green', 'yellow'] },
  greenDuration: { type: Number, default: 30 },
  redDuration: { type: Number, default: 60 },
  corridor: { type: mongoose.Schema.Types.Mixed, default: null }
});

module.exports = mongoose.model('TrafficSignal', trafficSignalSchema);
