const express = require('express');
const router = express.Router();
const hospitalFinder = require('../services/hospitalFinder');
const { authenticate, authorize } = require('../middleware/auth');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// MongoDB Models
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const Log = require('../models/Log');

module.exports = function(dataStore) {
  // Helper to filter sensitive data for Traffic Management / others
  const filterSensitiveData = (req, hospital) => {
    // Hospitals and System Admins see everything
    if (req.user && (req.user.role === 'hospital' || req.user.role === 'system_admin')) {
      return hospital;
    }
    // Traffic Management and AI routing engine see limited data
    return {
      id: hospital.id,
      name: hospital.name,
      lat: hospital.lat,
      lng: hospital.lng,
      type: hospital.type,
      availableBeds: hospital.availableBeds,
      icuAvailable: hospital.icuAvailable,
      emergencyReady: hospital.emergencyReady,
      specialties: hospital.specialties,
      status: hospital.status || 'active'
      // Hidden: totalBeds, icuBeds, rating, phone, address, reg number (patient/internal info)
    };
  };

  // Get all hospitals
  router.get('/', authenticate, (req, res) => {
    const safeHospitals = dataStore.hospitals.map(h => filterSensitiveData(req, h));
    res.json({ success: true, data: safeHospitals });
  });

  // Get single hospital
  router.get('/:id', authenticate, (req, res) => {
    const hospital = dataStore.hospitals.find(h => h.id === req.params.id);
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, data: filterSensitiveData(req, hospital) });
  });

  // Register new hospital
  router.post('/register', authenticate, authorize('traffic_authority', 'system_admin'), async (req, res) => {
    const { name, lat, lng, type, totalBeds, icuBeds, specialties, phone, address, registrationNumber, licenseDoc, username, password } = req.body;
    
    if (!name || !username || !password || !registrationNumber) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Encrypt sensitive docs
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.alloc(32, 'h'), Buffer.alloc(16, 's'));
    let encryptedLicense = cipher.update(licenseDoc || 'N/A', 'utf8', 'hex');
    encryptedLicense += cipher.final('hex');

    const newHospitalId = `h_${Date.now()}`;

    const newHospital = {
      id: newHospitalId,
      name, lat, lng, type, 
      totalBeds: parseInt(totalBeds || 0), availableBeds: parseInt(totalBeds || 0),
      icuBeds: parseInt(icuBeds || 0), icuAvailable: parseInt(icuBeds || 0),
      emergencyReady: false, specialties: specialties || [], rating: 0, phone, address,
      registrationHash: crypto.createHash('sha256').update(registrationNumber).digest('hex'),
      encryptedLicense,
      status: 'pending_approval'
    };

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newHospitalUser = {
      id: `u${Date.now()}`,
      username,
      password: hashedPassword,
      name: `${name} Admin`,
      email: `${username}@example.com`,
      phone,
      role: 'hospital',
      hospitalId: newHospitalId,
      hospitalName: name,
      permissions: ["update_beds", "view_alerts"],
      status: 'pending_approval',
      createdAt: new Date().toISOString()
    };

    // Save to MongoDB
    await Hospital.create(newHospital);
    await User.create(newHospitalUser);

    // Update in-memory
    dataStore.hospitals.push(newHospital);
    dataStore.users.push(newHospitalUser);

    // Log to MongoDB
    await Log.create({ action: 'HOSPITAL_REGISTERED', by: req.user.username, hospital: name, time: new Date().toISOString() });

    res.json({ success: true, message: 'Hospital registered. Awaiting verification and approval.', data: newHospital });
  });

  // Approve hospital
  router.patch('/:id/approve', authenticate, authorize('traffic_authority', 'system_admin'), async (req, res) => {
    const hospital = dataStore.hospitals.find(h => h.id === req.params.id);
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    
    hospital.status = 'active';
    hospital.emergencyReady = true;

    // Update in MongoDB
    await Hospital.updateOne({ id: req.params.id }, { status: 'active', emergencyReady: true });

    const hUser = dataStore.users.find(u => u.hospitalId === hospital.id && u.role === 'hospital');
    if (hUser) {
      hUser.status = 'active';
      await User.updateOne({ id: hUser.id }, { status: 'active' });
    }

    await Log.create({ action: 'HOSPITAL_APPROVED', by: req.user.username, hospital: hospital.name, time: new Date().toISOString() });

    res.json({ success: true, message: 'Hospital approved and activated.' });
  });

  // Find best hospital for an emergency (Used by AI routing)
  router.post('/find-best', authenticate, (req, res) => {
    const { lat, lng, specialty, needsICU, maxDistance } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Location (lat, lng) required' });
    }

    const results = hospitalFinder.findBest(lat, lng, dataStore.hospitals, {
      requiredSpecialty: specialty,
      needsICU: needsICU || false,
      maxDistance: maxDistance || 20
    });

    const safeResults = results.map(h => filterSensitiveData(req, h));

    res.json({ 
      success: true, 
      data: safeResults,
      recommended: safeResults[0] || null,
      count: safeResults.length
    });
  });

  // Update hospital availability - restricted to Hospital and System Admin
  router.patch('/:id/availability', authenticate, authorize('hospital', 'system_admin'), async (req, res) => {
    // Only allow hospital to update their own data, unless system_admin
    if (req.user.role === 'hospital' && req.user.hospitalId !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Cannot modify data of another hospital' });
    }

    const { availableBeds, icuAvailable, emergencyReady } = req.body;
    
    dataStore.hospitals = hospitalFinder.updateAvailability(
      req.params.id, 
      dataStore.hospitals, 
      { availableBeds, icuAvailable, emergencyReady }
    );

    const updated = dataStore.hospitals.find(h => h.id === req.params.id);
    if (!updated) return res.status(404).json({ success: false, message: 'Hospital not found' });

    // Sync to MongoDB
    await Hospital.updateOne({ id: req.params.id }, {
      availableBeds: updated.availableBeds,
      icuAvailable: updated.icuAvailable,
      emergencyReady: updated.emergencyReady
    });
    
    res.json({ success: true, data: filterSensitiveData(req, updated) });
  });

  // Notify hospital of incoming emergency
  router.post('/:id/notify', authenticate, (req, res) => {
    const notification = hospitalFinder.notifyHospital(req.params.id, req.body);
    res.json({ success: true, data: notification });
  });

  return router;
};
