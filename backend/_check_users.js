require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/setcs');
  
  const allUsers = await User.find({}, { username: 1, role: 1, plainPassword: 1, password: 1, _id: 0 });
  
  console.log('All users in DB:');
  allUsers.forEach(u => {
    const pwdInfo = u.plainPassword ? u.plainPassword : (u.password ? 'bcrypt:' + u.password.substring(0, 15) + '...' : 'NONE');
    console.log('  ' + u.username + ' (' + u.role + ') pwd=' + pwdInfo);
  });

  await mongoose.disconnect();
})();
