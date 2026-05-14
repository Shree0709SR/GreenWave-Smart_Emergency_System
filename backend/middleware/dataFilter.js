// Helper to filter sensitive data for Traffic Management / others
const filterSensitiveHospitalData = (hospital, role = null, requestedHospitalId = null) => {
  // Hospitals can see their own data, System Admins see everything
  if (role === 'system_admin' || (role === 'hospital' && hospital.id === requestedHospitalId)) {
    return hospital;
  }
  
  // Traffic Management, AI routing engine, and others see limited data
  return {
    id: hospital.id,
    name: hospital.name,
    lat: hospital.lat,
    lng: hospital.lng,
    type: hospital.type,
    availableBeds: hospital.availableBeds,
    icuAvailable: hospital.icuAvailable,
    emergencyReady: hospital.emergencyReady,
    specialties: hospital.specialties
    // Hidden: totalBeds, icuBeds, rating, phone, address (patient/internal info)
  };
};

module.exports = { filterSensitiveHospitalData };
