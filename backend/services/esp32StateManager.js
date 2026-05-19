/**
 * ESP32 Hardware State Manager
 * Manages the state that the ESP32 microcontroller polls via /api/signals/state
 * 
 * Physical Signal Mapping:
 *   A → s1 (MG Road Junction)
 *   B → s2 (Brigade Road Signal)
 *   C → s3 (Residency Road Cross)
 * 
 * Modes:
 *   - Normal Cycle: ESP32 handles its own Green→Yellow→Red cycling
 *   - Priority Mode: Forces one signal green for ambulance emergency
 *   - Manual Mode: Traffic authority manually sets a signal color
 */

class ESP32StateManager {
  constructor() {
    // Default signal-to-hardware mappings
    this.mappings = {
      A: 's1',  // MG Road Junction
      B: 's2',  // Brigade Road Signal
      C: 's3',  // Residency Road Cross
    };

    // Reverse lookup: signal ID → hardware label
    this.reverseMappings = {
      's1': 'A',
      's2': 'B',
      's3': 'C',
    };

    // Current state (what ESP32 polls)
    this.state = {
      priority: false,
      manual: false,
      prioritySignal: 0,   // 0=A, 1=B, 2=C
      signal: 'A',          // Manual mode: which signal
      color: 'red',         // Manual mode: what color
    };

    // Connectivity tracking
    this.lastPollTime = null;
    this.pollCount = 0;

    // Activity log (last 50 events)
    this.activityLog = [];

    this._rebuildReverseMappings();
  }

  // ─── State Access ────────────────────────────────

  /**
   * Get current state for ESP32 polling endpoint
   */
  getState() {
    this.lastPollTime = Date.now();
    this.pollCount++;
    return { ...this.state };
  }

  /**
   * Get full hardware status for frontend dashboard
   */
  getFullStatus() {
    return {
      state: { ...this.state },
      mappings: { ...this.mappings },
      connected: this.isConnected(),
      lastPollTime: this.lastPollTime ? new Date(this.lastPollTime).toISOString() : null,
      pollCount: this.pollCount,
      activityLog: this.activityLog.slice(-20).reverse(),
    };
  }

  // ─── Manual Control ──────────────────────────────

  /**
   * Enable manual mode — sets a specific signal to a specific color
   * @param {string} signal - "A", "B", or "C"
   * @param {string} color - "red", "yellow", or "green"
   */
  setManual(signal, color) {
    if (!['A', 'B', 'C'].includes(signal)) {
      throw new Error(`Invalid signal: ${signal}. Must be A, B, or C`);
    }
    if (!['red', 'yellow', 'green'].includes(color)) {
      throw new Error(`Invalid color: ${color}. Must be red, yellow, or green`);
    }

    this.state.manual = true;
    this.state.priority = false;  // Manual overrides priority
    this.state.signal = signal;
    this.state.color = color;

    this._log('MANUAL_SET', `Manual control: Signal ${signal} → ${color.toUpperCase()}`);
    return this.getFullStatus();
  }

  /**
   * Disable manual mode — returns ESP32 to normal cycle
   */
  clearManual() {
    this.state.manual = false;
    this.state.signal = 'A';
    this.state.color = 'red';

    this._log('MANUAL_CLEAR', 'Manual control disabled — returning to normal cycle');
    return this.getFullStatus();
  }

  // ─── Priority (Emergency) Control ────────────────

  /**
   * Enable priority mode for an emergency
   * @param {number} signalIndex - 0=A, 1=B, 2=C
   * @param {string} emergencyId - The emergency that triggered this
   */
  setPriority(signalIndex, emergencyId = '') {
    if (![0, 1, 2].includes(signalIndex)) {
      throw new Error(`Invalid signal index: ${signalIndex}. Must be 0, 1, or 2`);
    }

    this.state.priority = true;
    this.state.manual = false;  // Priority overrides manual
    this.state.prioritySignal = signalIndex;

    const labels = ['A', 'B', 'C'];
    this._log('PRIORITY_SET', `Emergency priority: Signal ${labels[signalIndex]} → GREEN (Emergency: ${emergencyId})`);
    return this.getFullStatus();
  }

  /**
   * Disable priority mode
   */
  clearPriority() {
    this.state.priority = false;
    this.state.prioritySignal = 0;

    this._log('PRIORITY_CLEAR', 'Emergency priority cleared — returning to normal cycle');
    return this.getFullStatus();
  }

  // ─── Signal Mappings ─────────────────────────────

  /**
   * Get current signal-to-hardware mappings
   */
  getMappings() {
    return { ...this.mappings };
  }

  /**
   * Update signal-to-hardware mappings
   * @param {Object} newMappings - { A: "sig-id", B: "sig-id", C: "sig-id" }
   */
  setMappings(newMappings) {
    if (newMappings.A) this.mappings.A = newMappings.A;
    if (newMappings.B) this.mappings.B = newMappings.B;
    if (newMappings.C) this.mappings.C = newMappings.C;
    this._rebuildReverseMappings();

    this._log('MAPPINGS_UPDATED', `Signal mappings updated: A→${this.mappings.A}, B→${this.mappings.B}, C→${this.mappings.C}`);
    return this.getMappings();
  }

  /**
   * Get the hardware label (A/B/C) for a given database signal ID
   * Returns null if the signal is not mapped to hardware
   */
  getHardwareLabel(signalId) {
    return this.reverseMappings[signalId] || null;
  }

  /**
   * Get the hardware signal index (0/1/2) for a given database signal ID
   * Returns -1 if not mapped
   */
  getHardwareIndex(signalId) {
    const label = this.getHardwareLabel(signalId);
    if (!label) return -1;
    return ['A', 'B', 'C'].indexOf(label);
  }

  // ─── Connectivity ────────────────────────────────

  /**
   * Check if ESP32 has polled within the last 15 seconds.
   * ESP32 polls every ~1s, but network latency + HTTP overhead
   * can cause gaps, so we use a generous 15-second window.
   */
  isConnected() {
    if (!this.lastPollTime) return false;
    return (Date.now() - this.lastPollTime) < 15000;
  }

  // ─── Internal Helpers ────────────────────────────

  _rebuildReverseMappings() {
    this.reverseMappings = {};
    for (const [label, sigId] of Object.entries(this.mappings)) {
      this.reverseMappings[sigId] = label;
    }
  }

  _log(action, message) {
    this.activityLog.push({
      action,
      message,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 100 events
    if (this.activityLog.length > 100) {
      this.activityLog = this.activityLog.slice(-100);
    }
  }
}

module.exports = new ESP32StateManager();
