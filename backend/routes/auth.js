/**
 * Auth Routes — Login, Register, Profile Completion, Verify
 * Now persists all data to MongoDB
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const router = express.Router();

// MongoDB Models
const User = require('../models/User');
const Department = require('../models/Department');
const Hospital = require('../models/Hospital');
const Ambulance = require('../models/Ambulance');
const Log = require('../models/Log');

module.exports = function(dataStore) {

  // ==================== LOGIN ====================
  router.post('/login', async (req, res) => {
    const { username, password, deviceId } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'User ID and password are required' });
    }

    try {
      // Find user in MongoDB
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Check password — support both bcrypt and plain comparison for dev
      let valid = false;
      try {
        valid = await bcrypt.compare(password, user.password);
      } catch (e) {
        valid = false;
      }
      // Fallback: check plainPassword field for dev convenience
      if (!valid && user.plainPassword) {
        valid = (password === user.plainPassword);
      }

      if (!valid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Role-specific status check
      if (user.role === 'ambulance_driver') {
        // Device Binding
        if (deviceId) {
          if (!user.deviceId) {
            user.deviceId = deviceId;
            await user.save();
          } else if (user.deviceId !== deviceId) {
            return res.status(403).json({ success: false, message: 'Login blocked. Unauthorized device detected.' });
          }
        }
      }

      // Generate JWT
      const payload = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        permissions: user.permissions,
        ambulanceId: user.ambulanceId || null,
        hospitalId: user.hospitalId || null,
        hospitalName: user.hospitalName || null,
        vehicleNumber: user.vehicleNumber || null,
        profileCompleted: user.profileCompleted !== false
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

      // Log activity to MongoDB
      await Log.create({
        action: 'USER_LOGIN',
        by: user.username,
        role: user.role,
        time: new Date().toISOString()
      });

      // Also update in-memory dataStore
      const memUser = dataStore.users.find(u => u.username === username);
      if (memUser && deviceId && !memUser.deviceId) {
        memUser.deviceId = deviceId;
      }

      res.json({
        success: true,
        message: `Welcome, ${user.name}!`,
        data: {
          token,
          user: payload,
          requiresSetup: user.profileCompleted === false
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ==================== REGISTER ====================
  router.post('/register', async (req, res) => {
    const { role } = req.body;

    if (!role || !['ambulance_driver', 'traffic_authority', 'hospital'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Valid role selection required (ambulance_driver, traffic_authority, hospital)' });
    }

    try {
      if (role === 'ambulance_driver') {
        return await registerDriver(req, res);
      } else if (role === 'traffic_authority') {
        return await registerTrafficAuthority(req, res);
      } else if (role === 'hospital') {
        return await registerHospital(req, res);
      }
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error during registration' });
    }
  });

  // ---- Ambulance Driver Registration ----
  async function registerDriver(req, res) {
    const { name, phone, address, email, age, dob, username, password, confirmPassword } = req.body;

    // Validation
    if (!name || !phone || !email || !username || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required: name, phone, address, email, age, dob, username, password, confirmPassword' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check duplicates in MongoDB
    if (await User.findOne({ username })) {
      return res.status(400).json({ success: false, message: 'User ID already exists. Please choose a different one.' });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: `u_drv_${Date.now()}`,
      username,
      password: hashedPassword,
      name,
      phone,
      address: address || '',
      email,
      age: parseInt(age) || null,
      dob: dob || null,
      role: 'ambulance_driver',
      permissions: ['activate_emergency', 'share_gps', 'receive_routes', 'view_own_location'],
      profileCompleted: false,
      vehicleNumber: null,
      medicalSupportLevel: null,
      ambulanceId: null,
      status: 'active',
      deviceId: null,
      createdAt: new Date().toISOString()
    };

    // Save to MongoDB
    await User.create(newUser);

    // Also add to in-memory dataStore
    dataStore.users.push(newUser);

    // Log to MongoDB
    await Log.create({
      action: 'DRIVER_REGISTERED',
      by: 'self-registration',
      user: username,
      role: 'ambulance_driver',
      time: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Registration successful! Please log in to complete your profile setup.'
    });
  }

  // ---- Traffic Authority Registration ----
  async function registerTrafficAuthority(req, res) {
    const { departmentName, officerName, address, phone, email, departmentId, username, password, departmentPassword } = req.body;

    // Validation
    if (!departmentName || !officerName || !phone || !email || !departmentId || !username || !password || !departmentPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required including Department Password' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (await User.findOne({ username })) {
      return res.status(400).json({ success: false, message: 'User ID already exists' });
    }

    // Validate department ID and password from MongoDB
    const dept = await Department.findOne({ departmentId });
    if (!dept) {
      return res.status(400).json({ success: false, message: 'Invalid Department ID. Please contact your department administrator.' });
    }
    if (dept.password !== departmentPassword) {
      return res.status(403).json({ success: false, message: 'Invalid Department Password. This password is assigned by your department and cannot be created by users.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: `u_trf_${Date.now()}`,
      username,
      password: hashedPassword,
      name: officerName,
      departmentName,
      department: dept.name,
      departmentId,
      address: address || '',
      phone,
      email,
      role: 'traffic_authority',
      permissions: ['view_map', 'control_signals', 'override_signals', 'view_ambulances', 'view_emergencies', 'view_analytics'],
      profileCompleted: true,
      createdAt: new Date().toISOString()
    };

    // Save to MongoDB
    await User.create(newUser);

    // Also add to in-memory dataStore
    dataStore.users.push(newUser);

    // Log to MongoDB
    await Log.create({
      action: 'TRAFFIC_AUTHORITY_REGISTERED',
      by: 'self-registration',
      user: username,
      department: dept.name,
      time: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Registration successful! You can now log in with your credentials.'
    });
  }

  // ---- Hospital Registration ----
  async function registerHospital(req, res) {
    const { hospitalName, address, phone, email, hospitalId, username, password } = req.body;

    // Validation
    if (!hospitalName || !phone || !email || !username || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required: hospitalName, address, phone, email, username, password' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (await User.findOne({ username })) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create hospital entry
    const newHospitalId = hospitalId || `h_${Date.now()}`;
    const newHospital = {
      id: newHospitalId,
      name: hospitalName,
      lat: 12.9716 + (Math.random() - 0.5) * 0.1,
      lng: 77.5946 + (Math.random() - 0.5) * 0.1,
      type: 'General',
      totalBeds: 0,
      availableBeds: 0,
      icuBeds: 0,
      icuAvailable: 0,
      emergencyReady: false,
      specialties: [],
      rating: 0,
      phone,
      address: address || '',
      workingTimings: null,
      status: 'pending_setup'
    };

    // Save hospital to MongoDB
    await Hospital.create(newHospital);
    dataStore.hospitals.push(newHospital);

    const newUser = {
      id: `u_hos_${Date.now()}`,
      username,
      password: hashedPassword,
      name: `${hospitalName} Admin`,
      email,
      phone,
      role: 'hospital',
      hospitalId: newHospitalId,
      hospitalName,
      permissions: ['update_beds', 'receive_alerts', 'view_incoming', 'view_eta'],
      profileCompleted: false,
      createdAt: new Date().toISOString()
    };

    // Save user to MongoDB
    await User.create(newUser);
    dataStore.users.push(newUser);

    // Log to MongoDB
    await Log.create({
      action: 'HOSPITAL_REGISTERED',
      by: 'self-registration',
      user: username,
      hospital: hospitalName,
      time: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Hospital registered! Please log in to complete your operational setup.'
    });
  }

  // ==================== PROFILE COMPLETION ====================
  router.post('/complete-profile', authenticate, async (req, res) => {
    try {
      const user = await User.findOne({ id: req.user.id });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.profileCompleted) {
        return res.status(400).json({ success: false, message: 'Profile already completed' });
      }

      if (user.role === 'ambulance_driver') {
        return await completeDriverProfile(req, res, user);
      } else if (user.role === 'hospital') {
        return await completeHospitalProfile(req, res, user);
      } else {
        return res.status(400).json({ success: false, message: 'Profile completion not required for this role' });
      }
    } catch (err) {
      console.error('Profile completion error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  async function completeDriverProfile(req, res, user) {
    const { vehicleNumber, medicalSupportLevel } = req.body;

    if (!vehicleNumber || !medicalSupportLevel) {
      return res.status(400).json({ success: false, message: 'Vehicle Number and Medical Support Level are required' });
    }

    user.vehicleNumber = vehicleNumber;
    user.medicalSupportLevel = medicalSupportLevel;
    user.profileCompleted = true;

    // Auto-assign to an available ambulance or create one
    let ambulance = dataStore.ambulances.find(a => !dataStore.users.some(u => u.ambulanceId === a.id && u.id !== user.id));
    if (ambulance) {
      user.ambulanceId = ambulance.id;
      ambulance.driverName = user.name;
      ambulance.vehicleNumber = vehicleNumber;
      ambulance.type = medicalSupportLevel;

      // Update ambulance in MongoDB
      await Ambulance.updateOne({ id: ambulance.id }, {
        driverName: user.name,
        vehicleNumber,
        type: medicalSupportLevel
      });
    } else {
      const newAmbulanceId = `a_${Date.now()}`;
      const newAmbulance = {
        id: newAmbulanceId,
        vehicleNumber,
        driverName: user.name,
        phone: user.phone || '',
        type: medicalSupportLevel,
        status: 'available',
        lat: 12.9716 + (Math.random() - 0.5) * 0.05,
        lng: 77.5946 + (Math.random() - 0.5) * 0.05,
        speed: 0,
        heading: 0,
        fuelLevel: 100,
        equipment: medicalSupportLevel === 'Advanced Life Support' 
          ? ['Defibrillator', 'Ventilator', 'ECG Monitor']
          : medicalSupportLevel === 'Neonatal'
          ? ['Incubator', 'Neonatal Ventilator', 'Warmer']
          : ['First Aid', 'Oxygen', 'Stretcher']
      };

      // Save new ambulance to MongoDB
      await Ambulance.create(newAmbulance);
      dataStore.ambulances.push(newAmbulance);
      user.ambulanceId = newAmbulanceId;
    }

    // Save user to MongoDB
    await user.save();

    // Update in-memory dataStore
    const memUser = dataStore.users.find(u => u.id === user.id);
    if (memUser) {
      memUser.vehicleNumber = vehicleNumber;
      memUser.medicalSupportLevel = medicalSupportLevel;
      memUser.profileCompleted = true;
      memUser.ambulanceId = user.ambulanceId;
    }

    // Re-issue token with updated data
    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      permissions: user.permissions,
      ambulanceId: user.ambulanceId,
      hospitalId: null,
      hospitalName: null,
      vehicleNumber: user.vehicleNumber,
      profileCompleted: true
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    // Log to MongoDB
    await Log.create({
      action: 'DRIVER_PROFILE_COMPLETED',
      by: user.username,
      vehicleNumber,
      time: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Profile completed successfully!',
      data: { token, user: payload }
    });
  }

  async function completeHospitalProfile(req, res, user) {
    const { availableBeds, icuBeds, specialties, workingTimings } = req.body;

    if (!availableBeds || !icuBeds) {
      return res.status(400).json({ success: false, message: 'Available Beds and ICU Beds are required' });
    }

    // Update the hospital record in MongoDB
    await Hospital.updateOne({ id: user.hospitalId }, {
      totalBeds: parseInt(availableBeds),
      availableBeds: parseInt(availableBeds),
      icuBeds: parseInt(icuBeds),
      icuAvailable: parseInt(icuBeds),
      specialties: specialties || [],
      workingTimings: workingTimings || null,
      emergencyReady: true,
      status: 'active'
    });

    // Update in-memory hospital
    const hospital = dataStore.hospitals.find(h => h.id === user.hospitalId);
    if (hospital) {
      hospital.totalBeds = parseInt(availableBeds);
      hospital.availableBeds = parseInt(availableBeds);
      hospital.icuBeds = parseInt(icuBeds);
      hospital.icuAvailable = parseInt(icuBeds);
      hospital.specialties = specialties || [];
      hospital.workingTimings = workingTimings || null;
      hospital.emergencyReady = true;
      hospital.status = 'active';
    }

    user.profileCompleted = true;
    await user.save();

    // Update in-memory user
    const memUser = dataStore.users.find(u => u.id === user.id);
    if (memUser) {
      memUser.profileCompleted = true;
    }

    // Re-issue token with updated data
    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      permissions: user.permissions,
      ambulanceId: null,
      hospitalId: user.hospitalId,
      hospitalName: user.hospitalName,
      vehicleNumber: null,
      profileCompleted: true
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    // Log to MongoDB
    await Log.create({
      action: 'HOSPITAL_PROFILE_COMPLETED',
      by: user.username,
      hospital: user.hospitalName,
      time: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Hospital setup completed successfully!',
      data: { token, user: payload }
    });
  }

  // ==================== VERIFY TOKEN ====================
  router.get('/me', authenticate, async (req, res) => {
    try {
      // Refresh profile status from MongoDB
      const freshUser = await User.findOne({ id: req.user.id });
      const data = { ...req.user };
      if (freshUser) {
        data.profileCompleted = freshUser.profileCompleted !== false;
      }
      res.json({ success: true, data });
    } catch (err) {
      res.json({ success: true, data: req.user });
    }
  });

  // ==================== GET DEPARTMENTS (for registration form) ====================
  router.get('/departments', async (req, res) => {
    try {
      // Return department names and IDs only — NOT passwords
      const departments = await Department.find({}, { departmentId: 1, name: 1, _id: 0 });
      res.json({ success: true, data: departments });
    } catch (err) {
      // Fallback to in-memory
      const safeDepts = (dataStore.departments || []).map(d => ({
        departmentId: d.departmentId,
        name: d.name
      }));
      res.json({ success: true, data: safeDepts });
    }
  });

  // ==================== GET ROLES (kept for compatibility) ====================
  router.get('/roles', (req, res) => {
    res.json({
      success: true,
      data: [
        { role: 'ambulance_driver', label: 'Ambulance Driver', icon: '🚑', desc: 'Emergency dispatch & GPS tracking' },
        { role: 'traffic_authority', label: 'Traffic Authority', icon: '🚦', desc: 'Monitor & control traffic signals' },
        { role: 'hospital', label: 'Hospital', icon: '🏥', desc: 'Bed management & emergency alerts' }
      ]
    });
  });

  return router;
};
