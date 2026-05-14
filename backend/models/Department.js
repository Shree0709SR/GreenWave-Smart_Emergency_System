const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  departmentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true }
});

module.exports = mongoose.model('Department', departmentSchema);
