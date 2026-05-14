const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Use a custom string ID to stay compatible with existing code
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plainPassword: { type: String }, // Dev convenience — remove in production
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  age: { type: Number },
  dob: { type: String },

  role: {
    type: String,
    required: true,
    enum: ['ambulance_driver', 'traffic_authority', 'hospital', 'system_admin', 'public_user']
  },

  permissions: [{ type: String }],
  profileCompleted: { type: Boolean, default: false },
  status: { type: String, default: 'active' },

  // Ambulance driver fields
  ambulanceId: { type: String },
  vehicleNumber: { type: String },
  medicalSupportLevel: { type: String },
  deviceId: { type: String },

  // Hospital fields
  hospitalId: { type: String },
  hospitalName: { type: String },

  // Traffic authority fields
  departmentName: { type: String },
  department: { type: String },
  departmentId: { type: String },

  // Admin fields
  isFixedAdmin: { type: Boolean, default: false },

  // Driver approval fields
  encryptedLicense: { type: String },
  govIdHash: { type: String },
  hospitalApproved: { type: Boolean },
  trafficAuthorityApproved: { type: Boolean },

  createdAt: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.model('User', userSchema);
