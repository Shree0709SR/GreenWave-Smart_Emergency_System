/**
 * GPS Simulator Service
 * Simulates real-time GPS movement for ambulances during active emergencies
 */

class GPSSimulator {
  constructor() {
    this.activeSimulations = new Map();
  }

  /**
   * Start GPS simulation for an ambulance moving toward a destination
   */
  startSimulation(ambulanceId, startLat, startLng, endLat, endLng, waypoints = []) {
    // Build full path: start -> waypoints -> end
    const fullPath = [
      { lat: startLat, lng: startLng },
      ...waypoints,
      { lat: endLat, lng: endLng }
    ];

    const simulation = {
      ambulanceId,
      path: fullPath,
      currentSegment: 0,
      progress: 0, // 0 to 1 within current segment
      speed: 40 + Math.random() * 20, // 40-60 km/h
      isActive: true,
      startTime: Date.now()
    };

    this.activeSimulations.set(ambulanceId, simulation);
    return simulation;
  }

  /**
   * Get next position update for an ambulance
   */
  getNextPosition(ambulanceId) {
    const sim = this.activeSimulations.get(ambulanceId);
    if (!sim || !sim.isActive) return null;

    const segment = sim.currentSegment;
    if (segment >= sim.path.length - 1) {
      sim.isActive = false;
      return {
        lat: sim.path[sim.path.length - 1].lat,
        lng: sim.path[sim.path.length - 1].lng,
        speed: 0,
        heading: 0,
        arrived: true
      };
    }

    const from = sim.path[segment];
    const to = sim.path[segment + 1];

    // Calculate movement step
    const stepSize = 0.0008 + Math.random() * 0.0004; // Variable step
    sim.progress += stepSize;

    if (sim.progress >= 1) {
      sim.progress = 0;
      sim.currentSegment++;
      
      if (sim.currentSegment >= sim.path.length - 1) {
        sim.isActive = false;
        return {
          lat: to.lat,
          lng: to.lng,
          speed: 0,
          heading: 0,
          arrived: true
        };
      }
    }

    // Interpolate position
    const lat = from.lat + (to.lat - from.lat) * Math.min(sim.progress, 1);
    const lng = from.lng + (to.lng - from.lng) * Math.min(sim.progress, 1);

    // Calculate heading (bearing)
    const heading = this.calculateBearing(from.lat, from.lng, to.lat, to.lng);

    // Simulate speed variations (slower at signals, faster on clear roads)
    const speed = sim.speed + (Math.random() - 0.5) * 10;

    return {
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      speed: Math.max(20, Math.min(80, speed)),
      heading: parseFloat(heading.toFixed(1)),
      arrived: false,
      progress: this.getOverallProgress(sim)
    };
  }

  /**
   * Calculate bearing between two points
   */
  calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  /**
   * Get overall progress percentage
   */
  getOverallProgress(sim) {
    const totalSegments = sim.path.length - 1;
    if (totalSegments === 0) return 100;
    return ((sim.currentSegment + sim.progress) / totalSegments * 100).toFixed(1);
  }

  /**
   * Stop simulation for an ambulance
   */
  stopSimulation(ambulanceId) {
    const sim = this.activeSimulations.get(ambulanceId);
    if (sim) {
      sim.isActive = false;
      this.activeSimulations.delete(ambulanceId);
    }
  }

  /**
   * Check if simulation is active
   */
  isActive(ambulanceId) {
    const sim = this.activeSimulations.get(ambulanceId);
    return sim ? sim.isActive : false;
  }

  /**
   * Get all active simulations
   */
  getActiveSimulations() {
    return Array.from(this.activeSimulations.entries())
      .filter(([, sim]) => sim.isActive)
      .map(([id, sim]) => ({
        ambulanceId: id,
        progress: this.getOverallProgress(sim),
        startTime: sim.startTime
      }));
  }
}

module.exports = new GPSSimulator();
