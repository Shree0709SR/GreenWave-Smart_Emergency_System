const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Log = require('../models/Log');

module.exports = function(dataStore) {
  router.get('/', authenticate, authorize('hospital', 'traffic_authority', 'system_admin'), async (req, res) => {
    try {
      let query = { role: 'ambulance_driver' };
      if (req.user.role === 'hospital') query.hospitalId = req.user.hospitalId;
      const drivers = await User.find(query, { password: 0, plainPassword: 0, __v: 0, _id: 0 }).lean();
      res.json({ success: true, data: drivers });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
    }
  });

  router.post('/register', authenticate, authorize('hospital', 'traffic_authority', 'system_admin'), async (req, res) => {
    const { name, username, password, email, phone, licenseNumber, govId, ambulanceId, vehicleNumber } = req.body;
    if (!username || !password || !licenseNumber || !ambulanceId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (await User.findOne({ username })) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    let hospitalId = null, hospitalName = null;
    if (req.user.role === 'hospital') {
      hospitalId = req.user.hospitalId;
      hospitalName = req.user.hospitalName;
    } else if (req.body.hospitalId) {
      const h = dataStore.hospitals.find(h => h.id === req.body.hospitalId);
      if (h) { hospitalId = h.id; hospitalName = h.name; }
    }
    if (!hospitalId) return res.status(400).json({ success: false, message: 'Hospital ID required' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.alloc(32, 'a'), Buffer.alloc(16, 'b'));
    let encryptedLicense = cipher.update(licenseNumber, 'utf8', 'hex');
    encryptedLicense += cipher.final('hex');

    const newDriver = {
      id: `u${Date.now()}`, username, password: hashedPassword, name, email, phone,
      role: 'ambulance_driver', hospitalId, hospitalName, ambulanceId, vehicleNumber,
      encryptedLicense, govIdHash: govId ? crypto.createHash('sha256').update(govId).digest('hex') : null,
      permissions: ["activate_emergency", "share_gps", "receive_routes", "view_own_location"],
      status: 'pending_approval', hospitalApproved: req.user.role === 'hospital',
      trafficAuthorityApproved: req.user.role === 'traffic_authority', deviceId: null,
      createdAt: new Date().toISOString()
    };
    if (newDriver.hospitalApproved && newDriver.trafficAuthorityApproved) newDriver.status = 'active';

    await User.create(newDriver);
    dataStore.users.push(newDriver);
    await Log.create({ action: 'DRIVER_REGISTERED', by: req.user.username, driver: newDriver.username, time: new Date().toISOString() });
    res.json({ success: true, message: 'Driver registered successfully.', data: newDriver });
  });

  router.patch('/:id/approve', authenticate, authorize('hospital', 'traffic_authority', 'system_admin'), async (req, res) => {
    try {
      const driver = await User.findOne({ id: req.params.id, role: 'ambulance_driver' });
      if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
      if (req.user.role === 'hospital') {
        if (driver.hospitalId !== req.user.hospitalId) return res.status(403).json({ success: false, message: 'Cannot approve drivers for another hospital' });
        driver.hospitalApproved = true;
      } else if (req.user.role === 'traffic_authority') { driver.trafficAuthorityApproved = true; }
      else if (req.user.role === 'system_admin') { driver.hospitalApproved = true; driver.trafficAuthorityApproved = true; }
      if (driver.hospitalApproved && driver.trafficAuthorityApproved) driver.status = 'active';
      await driver.save();
      const memDriver = dataStore.users.find(u => u.id === req.params.id);
      if (memDriver) { memDriver.hospitalApproved = driver.hospitalApproved; memDriver.trafficAuthorityApproved = driver.trafficAuthorityApproved; memDriver.status = driver.status; }
      await Log.create({ action: 'DRIVER_APPROVED', by: req.user.username, driver: driver.username, time: new Date().toISOString() });
      res.json({ success: true, message: 'Driver approval updated', data: driver });
    } catch (err) { return res.status(500).json({ success: false, message: 'Failed to approve driver' }); }
  });

  return router;
};
