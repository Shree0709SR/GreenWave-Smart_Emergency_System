require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/setcs');

  // 1. Create "admin" / "admin123" (system_admin)
  const existingAdmin = await User.findOne({ username: 'admin' });
  if (existingAdmin) {
    existingAdmin.plainPassword = 'admin123';
    await existingAdmin.save();
    console.log('Updated admin plainPassword to admin123');
  } else {
    await User.create({
      id: 'u_admin',
      username: 'admin',
      password: 'bcrypt_placeholder',
      plainPassword: 'admin123',
      name: 'System Administrator',
      email: 'admin@setcs.local',
      phone: '9999999999',
      role: 'system_admin',
      permissions: ['full_access', 'manage_users', 'manage_hospitals', 'manage_signals', 'view_analytics', 'system_settings'],
      profileCompleted: true,
      isFixedAdmin: true,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    console.log('Created: admin / admin123 (system_admin)');
  }

  // 2. Update hospital_admin password to admin123 as well
  const hospAdmin = await User.findOne({ username: 'hospital_admin' });
  if (hospAdmin) {
    hospAdmin.plainPassword = 'admin123';
    await hospAdmin.save();
    console.log('Updated: hospital_admin password to admin123');
  }

  // Summary
  console.log('\n=== Login Credentials ===');
  console.log('Admin Dashboard:    admin / admin123');
  console.log('Hospital Dashboard: hospital_admin / admin123');
  console.log('(Also still works): hospital_apollo / hospital123');

  await mongoose.disconnect();
})();
