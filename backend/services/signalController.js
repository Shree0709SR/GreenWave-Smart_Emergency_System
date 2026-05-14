/**
 * Signal Controller Service
 * Manages IoT-simulated traffic signal control for green corridor creation
 */

class SignalController {
  constructor() {
    this.corridors = new Map(); // Active green corridors
    this.signalTimers = new Map(); // Auto-revert timers
    this.signalHistory = []; // Log of signal changes
  }

  /**
   * Create a green corridor along a set of signals
   */
  createGreenCorridor(emergencyId, ambulanceId, signalIds, signals) {
    const corridor = {
      id: `corridor-${Date.now()}`,
      emergencyId,
      ambulanceId,
      signalIds,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    // Switch all signals to green
    const updatedSignals = signals.map(signal => {
      if (signalIds.includes(signal.id)) {
        // Log the change
        this.signalHistory.push({
          signalId: signal.id,
          signalName: signal.name,
          previousStatus: signal.status,
          newStatus: 'green',
          reason: `Green corridor for ambulance ${ambulanceId}`,
          emergencyId,
          timestamp: new Date().toISOString()
        });

        return {
          ...signal,
          status: 'green',
          corridor: corridor.id,
          overrideReason: `Emergency: ${emergencyId}`
        };
      }
      return signal;
    });

    this.corridors.set(corridor.id, corridor);
    
    return {
      corridor,
      updatedSignals,
      signalsChanged: signalIds.length
    };
  }

  /**
   * Release a green corridor (revert signals to normal cycle)
   */
  releaseCorridor(corridorId, signals) {
    const corridor = this.corridors.get(corridorId);
    if (!corridor) return { updatedSignals: signals, released: false };

    corridor.status = 'released';
    corridor.releasedAt = new Date().toISOString();

    const updatedSignals = signals.map(signal => {
      if (signal.corridor === corridorId) {
        this.signalHistory.push({
          signalId: signal.id,
          signalName: signal.name,
          previousStatus: 'green',
          newStatus: 'red',
          reason: 'Corridor released - reverting to normal cycle',
          emergencyId: corridor.emergencyId,
          timestamp: new Date().toISOString()
        });

        return {
          ...signal,
          status: 'red',
          corridor: null,
          overrideReason: null
        };
      }
      return signal;
    });

    this.corridors.delete(corridorId);
    
    return {
      updatedSignals,
      released: true,
      signalsReverted: corridor.signalIds.length
    };
  }

  /**
   * Update signal status manually
   */
  updateSignalStatus(signalId, newStatus, signals) {
    const updatedSignals = signals.map(signal => {
      if (signal.id === signalId) {
        this.signalHistory.push({
          signalId: signal.id,
          signalName: signal.name,
          previousStatus: signal.status,
          newStatus,
          reason: 'Manual override',
          timestamp: new Date().toISOString()
        });
        return { ...signal, status: newStatus };
      }
      return signal;
    });

    return updatedSignals;
  }

  /**
   * Simulate normal signal cycling
   */
  cycleSignals(signals) {
    return signals.map(signal => {
      if (signal.corridor) return signal; // Don't cycle corridor signals
      
      // Random cycle simulation
      if (Math.random() > 0.7) {
        const newStatus = signal.status === 'green' ? 'red' : 'green';
        return { ...signal, status: newStatus };
      }
      return signal;
    });
  }

  /**
   * Get all active corridors
   */
  getActiveCorridors() {
    return Array.from(this.corridors.values()).filter(c => c.status === 'active');
  }

  /**
   * Get signal change history
   */
  getHistory(limit = 50) {
    return this.signalHistory.slice(-limit).reverse();
  }

  /**
   * Get corridor statistics
   */
  getStats() {
    return {
      activeCorridors: this.getActiveCorridors().length,
      totalChanges: this.signalHistory.length,
      recentChanges: this.signalHistory.slice(-10).reverse()
    };
  }
}

module.exports = new SignalController();
