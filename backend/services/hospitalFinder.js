/**
 * Hospital Finder Service
 * Recommends the best hospital based on proximity, availability, and specialty
 */

class HospitalFinder {
  /**
   * Calculate distance between two coordinates (Haversine)
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Find best hospitals sorted by composite score
   */
  findBest(patientLat, patientLng, hospitals, options = {}) {
    const { 
      requiredSpecialty = null,
      needsICU = false,
      maxDistance = 20 // km
    } = options;

    return hospitals
      .map(h => {
        const distance = this.calculateDistance(patientLat, patientLng, h.lat, h.lng);
        const eta = Math.ceil((distance / 35) * 60); // minutes at 35km/h avg
        
        // Compute availability score
        const bedScore = h.availableBeds / h.totalBeds;
        const icuScore = needsICU ? (h.icuAvailable / Math.max(1, h.icuBeds)) : 1;
        const specialtyMatch = !requiredSpecialty || h.specialties.includes(requiredSpecialty);
        const distanceScore = Math.max(0, 1 - distance / maxDistance);
        
        const compositeScore = (
          distanceScore * 35 +
          bedScore * 20 +
          icuScore * 20 +
          (h.rating / 5) * 15 +
          (specialtyMatch ? 10 : 0)
        );

        return {
          ...h,
          distance: parseFloat(distance.toFixed(2)),
          eta,
          bedScore: parseFloat((bedScore * 100).toFixed(1)),
          icuScore: parseFloat((icuScore * 100).toFixed(1)),
          specialtyMatch,
          compositeScore: parseFloat(compositeScore.toFixed(1)),
          recommended: compositeScore > 50
        };
      })
      .filter(h => h.distance <= maxDistance && h.emergencyReady)
      .sort((a, b) => b.compositeScore - a.compositeScore);
  }

  /**
   * Notify hospital of incoming emergency (simulated)
   */
  notifyHospital(hospitalId, emergencyDetails) {
    return {
      hospitalId,
      notificationId: `notif-${Date.now()}`,
      status: 'sent',
      sentAt: new Date().toISOString(),
      details: {
        patientInfo: emergencyDetails.patientInfo || 'Unknown',
        emergencyType: emergencyDetails.type || 'General',
        eta: emergencyDetails.eta || 'Unknown',
        ambulanceId: emergencyDetails.ambulanceId,
        severity: emergencyDetails.severity || 'medium'
      }
    };
  }

  /**
   * Update hospital bed availability
   */
  updateAvailability(hospitalId, hospitals, updates) {
    return hospitals.map(h => {
      if (h.id === hospitalId) {
        return {
          ...h,
          availableBeds: updates.availableBeds ?? h.availableBeds,
          icuAvailable: updates.icuAvailable ?? h.icuAvailable,
          emergencyReady: updates.emergencyReady ?? h.emergencyReady
        };
      }
      return h;
    });
  }
}

module.exports = new HospitalFinder();
