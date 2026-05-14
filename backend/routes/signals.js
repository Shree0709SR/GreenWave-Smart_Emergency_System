const express = require('express');
const router = express.Router();
const signalController = require('../services/signalController');
const esp32 = require('../services/esp32StateManager');

module.exports = function(dataStore) {
  // ─── Existing Signal Routes ──────────────────────

  // Get all signals
  router.get('/', (req, res) => {
    res.json({ success: true, data: dataStore.trafficSignals });
  });

  // Get signal stats
  router.get('/stats', (req, res) => {
    const stats = signalController.getStats();
    const greenCount = dataStore.trafficSignals.filter(s => s.status === 'green').length;
    const redCount = dataStore.trafficSignals.filter(s => s.status === 'red').length;
    const corridorCount = dataStore.trafficSignals.filter(s => s.corridor).length;

    res.json({ 
      success: true, 
      data: {
        ...stats,
        total: dataStore.trafficSignals.length,
        green: greenCount,
        red: redCount,
        inCorridor: corridorCount
      }
    });
  });

  // Update single signal
  router.patch('/:id', (req, res) => {
    const { status } = req.body;
    if (!['green', 'red', 'yellow'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    dataStore.trafficSignals = signalController.updateSignalStatus(
      req.params.id, status, dataStore.trafficSignals
    );

    const updated = dataStore.trafficSignals.find(s => s.id === req.params.id);
    res.json({ success: true, data: updated });
  });

  // Create green corridor
  router.post('/corridor', (req, res) => {
    const { emergencyId, ambulanceId, signalIds } = req.body;
    
    if (!signalIds || !signalIds.length) {
      return res.status(400).json({ success: false, message: 'Signal IDs required' });
    }

    const result = signalController.createGreenCorridor(
      emergencyId, ambulanceId, signalIds, dataStore.trafficSignals
    );
    
    dataStore.trafficSignals = result.updatedSignals;

    res.json({ success: true, data: result });
  });

  // Release green corridor
  router.delete('/corridor/:corridorId', (req, res) => {
    const result = signalController.releaseCorridor(
      req.params.corridorId, dataStore.trafficSignals
    );
    
    dataStore.trafficSignals = result.updatedSignals;
    res.json({ success: true, data: result });
  });

  // Get active corridors
  router.get('/corridors/active', (req, res) => {
    const corridors = signalController.getActiveCorridors();
    res.json({ success: true, data: corridors });
  });

  // Get signal change history
  router.get('/history/changes', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const history = signalController.getHistory(limit);
    res.json({ success: true, data: history });
  });

  // ─── ESP32 Hardware Routes ───────────────────────

  /**
   * GET /api/signals/state
   * ESP32 polls this endpoint every ~1 second.
   * Returns the JSON the Arduino code expects.
   */
  router.get('/state', (req, res) => {
    const state = esp32.getState();
    res.json(state);
  });

  /**
   * GET /api/signals/hardware/status
   * Full hardware status for the frontend dashboard.
   */
  router.get('/hardware/status', (req, res) => {
    const status = esp32.getFullStatus();

    // Enrich with signal names from dataStore
    const enrichedMappings = {};
    for (const [label, sigId] of Object.entries(status.mappings)) {
      const signal = dataStore.trafficSignals.find(s => s.id === sigId);
      enrichedMappings[label] = {
        signalId: sigId,
        name: signal ? signal.name : 'Unknown',
        dbStatus: signal ? signal.status : 'unknown',
      };
    }

    res.json({
      success: true,
      data: {
        ...status,
        enrichedMappings,
        allSignals: dataStore.trafficSignals.map(s => ({ id: s.id, name: s.name })),
      }
    });
  });

  /**
   * POST /api/signals/hardware/manual
   * Enable manual mode on ESP32.
   * Body: { signal: "A"|"B"|"C", color: "red"|"yellow"|"green" }
   */
  router.post('/hardware/manual', (req, res) => {
    try {
      const { signal, color } = req.body;
      if (!signal || !color) {
        return res.status(400).json({ success: false, message: 'signal and color are required' });
      }
      const status = esp32.setManual(signal, color);
      res.json({ success: true, data: status, message: `Signal ${signal} set to ${color}` });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  /**
   * DELETE /api/signals/hardware/manual
   * Disable manual mode — ESP32 returns to normal cycle.
   */
  router.delete('/hardware/manual', (req, res) => {
    const status = esp32.clearManual();
    res.json({ success: true, data: status, message: 'Manual mode disabled' });
  });

  /**
   * POST /api/signals/hardware/priority
   * Enable priority (emergency) mode on ESP32.
   * Body: { signalIndex: 0|1|2, emergencyId?: string }
   */
  router.post('/hardware/priority', (req, res) => {
    try {
      const { signalIndex, emergencyId } = req.body;
      if (signalIndex === undefined || signalIndex === null) {
        return res.status(400).json({ success: false, message: 'signalIndex is required (0=A, 1=B, 2=C)' });
      }
      const status = esp32.setPriority(parseInt(signalIndex), emergencyId || '');
      res.json({ success: true, data: status, message: `Priority mode: Signal ${['A','B','C'][signalIndex]} → GREEN` });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  /**
   * DELETE /api/signals/hardware/priority
   * Disable priority mode.
   */
  router.delete('/hardware/priority', (req, res) => {
    const status = esp32.clearPriority();
    res.json({ success: true, data: status, message: 'Priority mode disabled' });
  });

  /**
   * POST /api/signals/hardware/mappings
   * Update which database signals map to physical A/B/C.
   * Body: { A: "sig-id", B: "sig-id", C: "sig-id" }
   */
  router.post('/hardware/mappings', (req, res) => {
    try {
      const mappings = esp32.setMappings(req.body);
      res.json({ success: true, data: mappings, message: 'Mappings updated' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  return router;
};
