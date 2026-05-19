require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/setcs');

  // Check if hospital_admin already exists
  const existing = await User.findOne({ username: 'hospital_admin' });
  if (existing) {
    console.log('hospital_admin already exists, updating plainPassword...');
    existing.plainPassword = 'hospital123';
    await existing.save();
    console.log('Done! Login with: hospital_admin / hospital123');
    await mongoose.disconnect();
    return;
  }

  // Create hospital_admin user linked to Apollo Emergency Center (h2)
  const newUser = {
    id: 'u_hospital_admin',
    username: 'hospital_admin',
    password: 'bcrypt_placeholder',  // won't match bcrypt.compare
    plainPassword: 'hospital123',    // fallback login for dev
    name: 'Hospital Admin',
    email: 'hospital_admin@setcs.local',
    phone: '9876543210',
    role: 'hospital',
    hospitalId: 'h2',
    hospitalName: 'Apollo Emergency Center',
    permissions: ['update_beds', 'receive_alerts', 'view_incoming', 'view_eta'],
    profileCompleted: true,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  await User.create(newUser);
  console.log('Created hospital_admin user!');
  console.log('Login with: hospital_admin / hospital123');
  
  await mongoose.disconnect();
})();
