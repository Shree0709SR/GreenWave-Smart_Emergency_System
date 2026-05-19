require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/setcs');

  const users = await User.find({}).lean();
  const depts = await Department.find({}).lean();

  console.log('=== DEPARTMENTS ===');
  depts.forEach(d => {
    console.log('  ' + d.departmentId + ' | ' + d.name + ' | password: ' + d.password);
  });

  console.log('\n=== ALL USER CREDENTIALS ===\n');

  const roles = ['system_admin', 'traffic_authority', 'ambulance_driver', 'hospital', 'public_user'];
  
  roles.forEach(role => {
    const roleUsers = users.filter(u => u.role === role);
    if (roleUsers.length === 0) return;
    
    const label = role.replace(/_/g, ' ').toUpperCase();
    console.log('--- ' + label + ' (' + roleUsers.length + ') ---');
    
    roleUsers.forEach(u => {
      const pwd = u.plainPassword || '(bcrypt only - no plaintext)';
      let extra = '';
      if (u.hospitalId) extra = ' | hospital: ' + (u.hospitalName || u.hospitalId);
      if (u.ambulanceId) extra = ' | ambulance: ' + u.ambulanceId;
      if (u.departmentName) extra = ' | dept: ' + u.departmentName;
      console.log('  username: ' + u.username + '  |  password: ' + pwd + extra);
    });
    console.log('');
  });

  await mongoose.disconnect();
})();
