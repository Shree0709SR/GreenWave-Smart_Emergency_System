const express = require('express');
const router = express.Router();

module.exports = function(dataStore) {
  // Get all ambulances
  router.get('/', (req, res) => {
    res.json({ success: true, data: dataStore.ambulances });
  });

  // Get single ambulance
  router.get('/:id', (req, res) => {
    const ambulance = dataStore.ambulances.find(a => a.id === req.params.id);
    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });
    res.json({ success: true, data: ambulance });
  });

  // Update ambulance status
  router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    const idx = dataStore.ambulances.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Ambulance not found' });
    
    dataStore.ambulances[idx].status = status;
    res.json({ success: true, data: dataStore.ambulances[idx] });
  });

  // Update ambulance position
  router.patch('/:id/position', (req, res) => {
    const { lat, lng, speed, heading } = req.body;
    const idx = dataStore.ambulances.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Ambulance not found' });
    
    if (lat !== undefined) dataStore.ambulances[idx].lat = lat;
    if (lng !== undefined) dataStore.ambulances[idx].lng = lng;
    if (speed !== undefined) dataStore.ambulances[idx].speed = speed;
    if (heading !== undefined) dataStore.ambulances[idx].heading = heading;
    
    res.json({ success: true, data: dataStore.ambulances[idx] });
  });

  // Get available ambulances
  router.get('/filter/available', (req, res) => {
    const available = dataStore.ambulances.filter(a => a.status === 'available');
    res.json({ success: true, data: available, count: available.length });
  });

  return router;
};
