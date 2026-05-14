/**
 * Admin Routes — System monitoring, user management, analytics
 * Accessible only by system_admin role
 * Now reads from MongoDB
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

// MongoDB Models
const User = require('../models/User');
const Log = require('../models/Log');

module.exports = function(dataStore) {

  // All admin routes require authentication + system_admin role
  router.use(authenticate, authorize('system_admin'));

  // ==================== SYSTEM STATS ====================
  router.get('/stats', async (req, res) => {
    try {
      const hospitals = dataStore.hospitals || [];
      const ambulances = dataStore.ambulances || [];
      const emergencies = dataStore.emergencies || [];

      const now = new Date();

      // User counts by role from MongoDB
      const usersByRole = {
        ambulance_driver: await User.countDocuments({ role: 'ambulance_driver' }),
        traffic_authority: await User.countDocuments({ role: 'traffic_authority' }),
        hospital: await User.countDocuments({ role: 'hospital' }),
        system_admin: await User.countDocuments({ role: 'system_admin' }),
        public_user: await User.countDocuments({ role: 'public_user' }),
        total: await User.countDocuments({})
      };

      // Registration activity (last 7 days) from MongoDB
      const registrationActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        const dayStr = date.toISOString().split('T')[0];
        const count = await User.countDocuments({
          createdAt: { $regex: `^${dayStr}` }
        });
        registrationActivity.push({ date: dayStr, count });
      }

      // Hospital availability summary
      const hospitalStats = {
        total: hospitals.length,
        active: hospitals.filter(h => h.status !== 'pending_setup' && h.emergencyReady).length,
        totalBeds: hospitals.reduce((s, h) => s + (h.totalBeds || 0), 0),
        availableBeds: hospitals.reduce((s, h) => s + (h.availableBeds || 0), 0),
        totalICU: hospitals.reduce((s, h) => s + (h.icuBeds || 0), 0),
        availableICU: hospitals.reduce((s, h) => s + (h.icuAvailable || 0), 0),
        occupancyRate: hospitals.reduce((s, h) => s + (h.totalBeds || 0), 0) > 0
          ? Math.round(((hospitals.reduce((s, h) => s + (h.totalBeds || 0), 0) - hospitals.reduce((s, h) => s + (h.availableBeds || 0), 0)) / hospitals.reduce((s, h) => s + (h.totalBeds || 0), 0)) * 100)
          : 0
      };

      // Ambulance fleet summary
      const ambulanceStats = {
        total: ambulances.length,
        available: ambulances.filter(a => a.status === 'available').length,
        dispatched: ambulances.filter(a => a.status === 'dispatched').length,
        atHospital: ambulances.filter(a => a.status === 'at-hospital').length,
        avgFuel: ambulances.length > 0
          ? Math.round(ambulances.reduce((s, a) => s + (a.fuelLevel || 0), 0) / ambulances.length)
          : 0
      };

      // Emergency statistics
      const activeEmergencies = emergencies.filter(e => e.status === 'active');
      const resolvedEmergencies = emergencies.filter(e => e.status === 'resolved');
      const emergencyStats = {
        total: emergencies.length,
        active: activeEmergencies.length,
        resolved: resolvedEmergencies.length,
        avgResponseTime: resolvedEmergencies.length > 0
          ? Math.round(resolvedEmergencies.reduce((s, e) => s + (e.totalETA || 0), 0) / resolvedEmergencies.length)
          : 0
      };

      // Traffic signals
      const signals = dataStore.trafficSignals || [];
      const signalStats = {
        total: signals.length,
        green: signals.filter(s => s.status === 'green').length,
        red: signals.filter(s => s.status === 'red').length,
        inCorridor: signals.filter(s => s.corridor).length
      };

      // Recent activity logs from MongoDB
      const recentLogs = await Log.find({}).sort({ _id: -1 }).limit(50).lean();

      // System uptime
      const systemStats = {
        uptime: Math.round(process.uptime()),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        totalMemory: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        nodeVersion: process.version,
        platform: process.platform,
        database: 'MongoDB (connected)'
      };

      res.json({
        success: true,
        data: {
          usersByRole,
          registrationActivity,
          hospitalStats,
          ambulanceStats,
          emergencyStats,
          signalStats,
          recentLogs,
          systemStats,
          timestamp: now.toISOString()
        }
      });
    } catch (err) {
      console.error('Admin stats error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
  });

  // ==================== ALL USERS ====================
  router.get('/users', async (req, res) => {
    try {
      const users = await User.find({}, {
        password: 0, plainPassword: 0, __v: 0, _id: 0
      }).lean();

      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        email: u.email,
        phone: u.phone,
        department: u.department || u.departmentName,
        hospitalName: u.hospitalName,
        vehicleNumber: u.vehicleNumber,
        profileCompleted: u.profileCompleted,
        status: u.status,
        createdAt: u.createdAt
      }));
      res.json({ success: true, data: safeUsers });
    } catch (err) {
      console.error('Admin users error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
  });

  // ==================== ALL LOGS ====================
  router.get('/logs', async (req, res) => {
    try {
      const logs = await Log.find({}).sort({ _id: -1 }).limit(100).lean();
      res.json({ success: true, data: logs });
    } catch (err) {
      res.json({ success: true, data: dataStore.logs || [] });
    }
  });

  // ==================== HOSPITAL DETAILS (read-only for admin) ====================
  router.get('/hospitals', (req, res) => {
    res.json({ success: true, data: dataStore.hospitals });
  });

  // ==================== AMBULANCE DETAILS ====================
  router.get('/ambulances', (req, res) => {
    res.json({ success: true, data: dataStore.ambulances });
  });

  return router;
};
