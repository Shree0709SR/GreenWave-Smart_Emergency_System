const express = require('express');
const router = express.Router();
const routeOptimizer = require('../services/routeOptimizer');
const signalController = require('../services/signalController');
const hospitalFinder = require('../services/hospitalFinder');
const gpsSimulator = require('../services/gpsSimulator');
const esp32 = require('../services/esp32StateManager');
const Emergency = require('../models/Emergency');
const Log = require('../models/Log');

module.exports = function(dataStore, io) {
  router.get('/', (req, res) => {
    res.json({ success: true, data: dataStore.emergencies || [] });
  });

  router.post('/dispatch', async (req, res) => {
    const { patientLat, patientLng, patientInfo, emergencyType, severity, ambulanceId, hospitalId } = req.body;
    if (!patientLat || !patientLng || !ambulanceId) {
      return res.status(400).json({ success: false, message: 'Patient location and ambulance ID are required' });
    }

    const ambulance = dataStore.ambulances.find(a => a.id === ambulanceId);
    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });

    let targetHospital;
    if (hospitalId) {
      targetHospital = dataStore.hospitals.find(h => h.id === hospitalId);
    } else {
      const bestHospitals = hospitalFinder.findBest(patientLat, patientLng, dataStore.hospitals, {
        requiredSpecialty: emergencyType === 'cardiac' ? 'Cardiology' : emergencyType === 'trauma' ? 'Trauma' : null,
        needsICU: severity === 'critical'
      });
      targetHospital = bestHospitals[0];
    }
    if (!targetHospital) return res.status(404).json({ success: false, message: 'No suitable hospital found' });

    const hospitalData = targetHospital;
    const routeToPatient = routeOptimizer.findOptimalRoute(ambulance.lat, ambulance.lng, patientLat, patientLng, dataStore.trafficSignals);
    const routeToHospital = routeOptimizer.findOptimalRoute(patientLat, patientLng, hospitalData.lat, hospitalData.lng, dataStore.trafficSignals);

    const allSignalIds = [...new Set([...routeToPatient.signalsOnRoute, ...routeToHospital.signalsOnRoute])];
    const emergencyId = `em-${Date.now()}`;
    let corridorResult = null;
    if (allSignalIds.length > 0) {
      corridorResult = signalController.createGreenCorridor(emergencyId, ambulanceId, allSignalIds, dataStore.trafficSignals);
      dataStore.trafficSignals = corridorResult.updatedSignals;

      // Auto-enable ESP32 hardware priority if any corridor signal is mapped
      for (const sigId of allSignalIds) {
        const hwIndex = esp32.getHardwareIndex(sigId);
        if (hwIndex !== -1) {
          esp32.setPriority(hwIndex, emergencyId);
          console.log(`🔌 ESP32: Priority mode ON — Signal ${['A','B','C'][hwIndex]} GREEN for emergency ${emergencyId}`);
          break; // Set priority for the first mapped signal found
        }
      }
    }

    gpsSimulator.startSimulation(ambulanceId, ambulance.lat, ambulance.lng, hospitalData.lat, hospitalData.lng,
      [...routeToPatient.waypoints, { lat: patientLat, lng: patientLng }, ...routeToHospital.waypoints]);

    const ambIdx = dataStore.ambulances.findIndex(a => a.id === ambulanceId);
    if (ambIdx !== -1) dataStore.ambulances[ambIdx].status = 'dispatched';

    const emergency = {
      id: emergencyId, status: 'active', severity: severity || 'medium', type: emergencyType || 'general',
      patientInfo: patientInfo || 'Unknown', patientLocation: { lat: patientLat, lng: patientLng },
      ambulanceId, hospital: { id: hospitalData.id, name: hospitalData.name, lat: hospitalData.lat, lng: hospitalData.lng },
      routeToPatient, routeToHospital, corridor: corridorResult ? corridorResult.corridor : null,
      totalETA: routeToPatient.estimatedTime + routeToHospital.estimatedTime,
      totalDistance: parseFloat((routeToPatient.distance + routeToHospital.distance).toFixed(2)),
      createdAt: new Date().toISOString(), signalsCleared: allSignalIds.length
    };

    if (!dataStore.emergencies) dataStore.emergencies = [];
    dataStore.emergencies.push(emergency);

    // Save to MongoDB
    try { await Emergency.create(emergency); } catch (e) { console.error('Failed to save emergency to DB:', e.message); }

    const notification = hospitalFinder.notifyHospital(hospitalData.id, { patientInfo, type: emergencyType, eta: emergency.totalETA, ambulanceId, severity });

    if (io) {
      io.emit('emergency:new', emergency);
      io.emit('signals:update', dataStore.trafficSignals);
      io.emit('ambulances:update', dataStore.ambulances);
      io.emit('civilian:alert', {
        type: 'emergency_nearby',
        message: `🚑 Emergency ambulance ${ambulance.vehicleNumber} is en route. Please clear the way!`,
        ambulanceId, route: routeToPatient.routePoints, timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, data: emergency, notification, message: `Emergency dispatched! Ambulance ${ambulance.vehicleNumber} en route. ETA: ${emergency.totalETA} min` });
  });

  router.patch('/:id/resolve', async (req, res) => {
    if (!dataStore.emergencies) return res.status(404).json({ success: false, message: 'No emergencies' });
    const idx = dataStore.emergencies.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Emergency not found' });

    const emergency = dataStore.emergencies[idx];
    emergency.status = 'resolved';
    emergency.resolvedAt = new Date().toISOString();
    emergency.responseTime = Math.round((Date.now() - new Date(emergency.createdAt).getTime()) / 60000);

    if (emergency.corridor) {
      const result = signalController.releaseCorridor(emergency.corridor.id, dataStore.trafficSignals);
      dataStore.trafficSignals = result.updatedSignals;
    }

    // Auto-clear ESP32 hardware priority
    if (esp32.getFullStatus().state.priority) {
      esp32.clearPriority();
      console.log(`🔌 ESP32: Priority mode OFF — emergency ${req.params.id} resolved`);
    }
    gpsSimulator.stopSimulation(emergency.ambulanceId);

    const ambIdx = dataStore.ambulances.findIndex(a => a.id === emergency.ambulanceId);
    if (ambIdx !== -1) { dataStore.ambulances[ambIdx].status = 'available'; dataStore.ambulances[ambIdx].speed = 0; }

    // Update in MongoDB
    try {
      await Emergency.updateOne({ id: req.params.id }, { status: 'resolved', resolvedAt: emergency.resolvedAt, responseTime: emergency.responseTime });
    } catch (e) { console.error('Failed to update emergency in DB:', e.message); }

    if (io) {
      io.emit('emergency:resolved', emergency);
      io.emit('signals:update', dataStore.trafficSignals);
      io.emit('ambulances:update', dataStore.ambulances);
    }

    if (!dataStore.analytics) dataStore.analytics = { resolved: 0, totalResponseTime: 0 };
    dataStore.analytics.resolved++;
    dataStore.analytics.totalResponseTime += emergency.responseTime || 0;

    res.json({ success: true, data: emergency });
  });

  router.post('/optimize-route', (req, res) => {
    const { startLat, startLng, endLat, endLng } = req.body;
    const route = routeOptimizer.findOptimalRoute(startLat, startLng, endLat, endLng, dataStore.trafficSignals);
    const predictions = routeOptimizer.predictCongestion(startLat, startLng);
    res.json({ success: true, data: { route, predictions } });
  });

  router.post('/predict-traffic', (req, res) => {
    const { lat, lng, minutes } = req.body;
    const predictions = routeOptimizer.predictCongestion(lat, lng, minutes || 30);
    res.json({ success: true, data: predictions });
  });

  router.get('/analytics/summary', (req, res) => {
    const emergencies = dataStore.emergencies || [];
    const active = emergencies.filter(e => e.status === 'active');
    const resolved = emergencies.filter(e => e.status === 'resolved');
    const avgResponseTime = resolved.length > 0 ? Math.round(resolved.reduce((sum, e) => sum + (e.responseTime || 0), 0) / resolved.length) : 0;
    res.json({
      success: true,
      data: {
        totalEmergencies: emergencies.length, activeEmergencies: active.length, resolvedEmergencies: resolved.length,
        avgResponseTime, successRate: emergencies.length > 0 ? Math.round(resolved.length / emergencies.length * 100) : 0,
        signalsControlled: dataStore.trafficSignals.filter(s => s.corridor).length,
        ambulancesActive: dataStore.ambulances.filter(a => a.status === 'dispatched').length,
        ambulancesAvailable: dataStore.ambulances.filter(a => a.status === 'available').length,
        hospitalCapacity: Math.round(dataStore.hospitals.reduce((sum, h) => sum + h.availableBeds, 0) / dataStore.hospitals.reduce((sum, h) => sum + h.totalBeds, 0) * 100)
      }
    });
  });

  // ─── Driver-Initiated Emergency Flow ─────────────

  /**
   * POST /api/emergencies/nearby-hospitals
   * Driver presses Emergency → get ranked hospital list
   * Body: { ambulanceId, lat, lng, emergencyType?, severity? }
   */
  router.post('/nearby-hospitals', (req, res) => {
    const { ambulanceId, lat, lng, emergencyType, severity } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Location (lat, lng) is required' });
    }

    const ambulance = dataStore.ambulances.find(a => a.id === ambulanceId);
    const ambLat = lat || ambulance?.lat;
    const ambLng = lng || ambulance?.lng;

    // Calculate route to each hospital with full details
    const rankedHospitals = dataStore.hospitals
      .filter(h => h.emergencyReady && h.availableBeds > 0)
      .map(h => {
        const route = routeOptimizer.findOptimalRoute(ambLat, ambLng, h.lat, h.lng, dataStore.trafficSignals);
        const distance = routeOptimizer.haversineDistance(ambLat, ambLng, h.lat, h.lng);

        return {
          id: h.id,
          name: h.name,
          type: h.type,
          address: h.address,
          phone: h.phone,
          rating: h.rating,
          specialties: h.specialties,
          totalBeds: h.totalBeds,
          availableBeds: h.availableBeds,
          icuBeds: h.icuBeds,
          icuAvailable: h.icuAvailable,
          emergencyReady: h.emergencyReady,
          lat: h.lat,
          lng: h.lng,
          // Route details
          distance: parseFloat(distance.toFixed(2)),
          routeDistance: route.distance,
          eta: route.estimatedTime,
          trafficLevel: route.trafficLevel,
          signalsOnRoute: route.numSignals,
          signalIds: route.signalsOnRoute,
          routeScore: route.routeScore,
        };
      })
      .sort((a, b) => a.distance - b.distance); // Sort by distance (closest first)

    res.json({
      success: true,
      data: rankedHospitals,
      ambulance: ambulance ? { id: ambulance.id, vehicleNumber: ambulance.vehicleNumber, driverName: ambulance.driverName } : null
    });
  });

  /**
   * POST /api/emergencies/driver-dispatch
   * Driver selects hospital → create emergency, notify traffic authority & hospital
   * Body: { ambulanceId, hospitalId, patientInfo, emergencyType, severity, lat, lng }
   */
  router.post('/driver-dispatch', async (req, res) => {
    const { ambulanceId, hospitalId, patientInfo, emergencyType, severity, lat, lng } = req.body;

    if (!ambulanceId || !hospitalId) {
      return res.status(400).json({ success: false, message: 'ambulanceId and hospitalId are required' });
    }

    const ambulance = dataStore.ambulances.find(a => a.id === ambulanceId);
    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });

    const hospital = dataStore.hospitals.find(h => h.id === hospitalId);
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const ambLat = lat || ambulance.lat;
    const ambLng = lng || ambulance.lng;

    // Calculate routes
    const routeToHospital = routeOptimizer.findOptimalRoute(ambLat, ambLng, hospital.lat, hospital.lng, dataStore.trafficSignals);
    const emergencyId = `em-${Date.now()}`;

    // Create green corridor
    const allSignalIds = [...new Set(routeToHospital.signalsOnRoute)];
    let corridorResult = null;
    if (allSignalIds.length > 0) {
      corridorResult = signalController.createGreenCorridor(emergencyId, ambulanceId, allSignalIds, dataStore.trafficSignals);
      dataStore.trafficSignals = corridorResult.updatedSignals;

      // Auto-enable ESP32 hardware priority
      for (const sigId of allSignalIds) {
        const hwIndex = esp32.getHardwareIndex(sigId);
        if (hwIndex !== -1) {
          esp32.setPriority(hwIndex, emergencyId);
          console.log(`🔌 ESP32: Priority mode ON — Signal ${['A','B','C'][hwIndex]} GREEN for driver emergency ${emergencyId}`);
          break;
        }
      }
    }

    // Start GPS simulation
    gpsSimulator.startSimulation(ambulanceId, ambLat, ambLng, hospital.lat, hospital.lng, routeToHospital.waypoints);

    // Update ambulance status
    const ambIdx = dataStore.ambulances.findIndex(a => a.id === ambulanceId);
    if (ambIdx !== -1) {
      dataStore.ambulances[ambIdx].status = 'dispatched';
      dataStore.ambulances[ambIdx].speed = 40;
    }

    // Create emergency record
    const emergency = {
      id: emergencyId,
      status: 'active',
      severity: severity || 'high',
      type: emergencyType || 'general',
      patientInfo: patientInfo || 'Unknown',
      patientLocation: { lat: ambLat, lng: ambLng },
      ambulanceId,
      hospital: { id: hospital.id, name: hospital.name, lat: hospital.lat, lng: hospital.lng },
      routeToPatient: { distance: 0, estimatedTime: 0, signalsOnRoute: [], waypoints: [], routePoints: [] },
      routeToHospital,
      corridor: corridorResult ? corridorResult.corridor : null,
      totalETA: routeToHospital.estimatedTime,
      totalDistance: routeToHospital.distance,
      signalsCleared: allSignalIds.length,
      createdAt: new Date().toISOString(),
      driverInitiated: true,
    };

    if (!dataStore.emergencies) dataStore.emergencies = [];
    dataStore.emergencies.push(emergency);

    // Save to MongoDB
    try { await Emergency.create(emergency); } catch (e) { console.error('Failed to save emergency to DB:', e.message); }

    // ─── WebSocket Notifications ───────────────────
    if (io) {
      // 1. Notify ALL clients about new emergency
      io.emit('emergency:new', emergency);

      // 2. Notify traffic authority — signals update
      io.emit('signals:update', dataStore.trafficSignals);
      io.emit('ambulances:update', dataStore.ambulances);

      // 3. Specific alert to traffic authority dashboard
      io.emit('driver:emergency', {
        type: 'driver_emergency',
        emergencyId,
        message: `🚨 DRIVER ALERT: ${ambulance.driverName} (${ambulance.vehicleNumber}) has activated emergency mode!`,
        ambulanceId,
        driverName: ambulance.driverName,
        vehicleNumber: ambulance.vehicleNumber,
        hospitalName: hospital.name,
        severity: severity || 'high',
        eta: routeToHospital.estimatedTime,
        signalsCleared: allSignalIds.length,
        timestamp: new Date().toISOString(),
      });

      // 4. Specific alert to hospital dashboard
      io.emit('hospital:incoming', {
        type: 'incoming_ambulance',
        emergencyId,
        hospitalId: hospital.id,
        message: `🚑 INCOMING: Ambulance ${ambulance.vehicleNumber} (${ambulance.driverName}) is heading to your hospital!`,
        ambulanceId,
        driverName: ambulance.driverName,
        vehicleNumber: ambulance.vehicleNumber,
        patientInfo: patientInfo || 'Unknown',
        emergencyType: emergencyType || 'general',
        severity: severity || 'high',
        eta: routeToHospital.estimatedTime,
        distance: routeToHospital.distance,
        timestamp: new Date().toISOString(),
      });

      // 5. Civilian alert
      io.emit('civilian:alert', {
        type: 'emergency_nearby',
        message: `🚑 Emergency ambulance ${ambulance.vehicleNumber} is en route to ${hospital.name}. Please clear the way!`,
        ambulanceId,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`🚨 Driver-initiated emergency: ${ambulance.driverName} → ${hospital.name} | ETA: ${routeToHospital.estimatedTime} min | ${allSignalIds.length} signals cleared`);

    res.json({
      success: true,
      data: emergency,
      message: `Emergency activated! Heading to ${hospital.name}. ETA: ${routeToHospital.estimatedTime} min. ${allSignalIds.length} signals cleared.`
    });
  });

  /**
   * POST /api/emergencies/driver-message
   * Driver sends a voice-dictated message to traffic authority / hospital
   * Body: { ambulanceId, message, targets: ['traffic','hospital'], emergencyId? }
   */
  router.post('/driver-message', (req, res) => {
    const { ambulanceId, message, targets, emergencyId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const ambulance = dataStore.ambulances.find(a => a.id === ambulanceId);
    const driverName = ambulance?.driverName || 'Unknown Driver';
    const vehicleNumber = ambulance?.vehicleNumber || 'Unknown';
    const timestamp = new Date().toISOString();

    // Find the active emergency for this ambulance
    const activeEmergency = (dataStore.emergencies || []).find(
      e => e.status === 'active' && e.ambulanceId === ambulanceId
    );

    const msgPayload = {
      type: 'driver_message',
      ambulanceId,
      driverName,
      vehicleNumber,
      message: message.trim(),
      emergencyId: emergencyId || activeEmergency?.id || null,
      hospitalId: activeEmergency?.hospital?.id || null,
      hospitalName: activeEmergency?.hospital?.name || null,
      timestamp,
    };

    if (io) {
      const sendTargets = targets || ['traffic', 'hospital'];

      if (sendTargets.includes('traffic')) {
        io.emit('driver:message', {
          ...msgPayload,
          displayMessage: `📢 [${vehicleNumber}] ${driverName}: "${message.trim()}"`,
        });
      }

      if (sendTargets.includes('hospital') && activeEmergency?.hospital?.id) {
        io.emit('hospital:message', {
          ...msgPayload,
          displayMessage: `🚑 [${vehicleNumber}] ${driverName}: "${message.trim()}"`,
        });
      }
    }

    console.log(`📢 Driver message: [${vehicleNumber}] ${driverName} → ${(targets || ['traffic','hospital']).join(', ')}: "${message.trim()}"`);

    res.json({
      success: true,
      message: `Message sent to ${(targets || ['traffic','hospital']).join(' & ')}`,
      data: msgPayload,
    });
  });

  return router;
};
