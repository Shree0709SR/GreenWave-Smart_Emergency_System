const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: { type: String, required: true },
  by: { type: String },
  role: { type: String },
  user: { type: String },
  driver: { type: String },
  hospital: { type: String },
  department: { type: String },
  vehicleNumber: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  time: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.model('Log', logSchema);
