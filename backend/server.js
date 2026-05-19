/**
 * SETCS - Smart Emergency Traffic Clearance System
 * Main Server Entry Point
 *
 * Features:
 * - REST API for ambulances, hospitals, signals, emergencies
 * - WebSocket for real-time updates
 * - GPS simulation engine
 * - Traffic signal cycling
 * - MongoDB persistence for all data
 */

require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");

// Mongoose Models
const User = require("./models/User");
const Hospital = require("./models/Hospital");
const Ambulance = require("./models/Ambulance");
const TrafficSignal = require("./models/TrafficSignal");
const Emergency = require("./models/Emergency");
const Department = require("./models/Department");
const Log = require("./models/Log");

// Services
const gpsSimulator = require("./services/gpsSimulator");
const signalController = require("./services/signalController");
const { filterSensitiveHospitalData } = require("./middleware/dataFilter");
const { authenticate } = require("./middleware/auth");

// Initialize Express
const app = express();
const server = http.createServer(app);

// Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json());

// In-memory data store (loaded from MongoDB on startup)
const dataStore = {
  hospitals: [],
  trafficSignals: [],
  ambulances: [],
  emergencies: [],
  analytics: { resolved: 0, totalResponseTime: 0 },
  civilianAlerts: [],
  users: [],
  departments: [],
  logs: [],
};

// ===== Load data from MongoDB into memory =====
async function loadDataFromDB() {
  try {
    dataStore.users = (await User.find({}).lean()).map(u => {
      const obj = { ...u };
      delete obj._id;
      delete obj.__v;
      return obj;
    });

    dataStore.hospitals = (await Hospital.find({}).lean()).map(h => {
      const obj = { ...h };
      delete obj._id;
      delete obj.__v;
      return obj;
    });

    dataStore.ambulances = (await Ambulance.find({}).lean()).map(a => {
      const obj = { ...a };
      delete obj._id;
      delete obj.__v;
      return obj;
    });

    dataStore.trafficSignals = (await TrafficSignal.find({}).lean()).map(s => {
      const obj = { ...s };
      delete obj._id;
      delete obj.__v;
      return obj;
    });

    dataStore.departments = (await Department.find({}).lean()).map(d => {
      const obj = { ...d };
      delete obj._id;
      delete obj.__v;
      return obj;
    });

    dataStore.emergencies = (await Emergency.find({}).lean()).map(e => {
      const obj = { ...e };
      delete obj._id;
      delete obj.__v;
      return obj;
    });

    dataStore.logs = (await Log.find({}).sort({ _id: -1 }).limit(200).lean()).map(l => {
      const obj = { ...l };
      delete obj._id;
      delete obj.__v;
      return obj;
    });

    console.log(`  📊 Loaded: ${dataStore.users.length} users, ${dataStore.hospitals.length} hospitals, ${dataStore.ambulances.length} ambulances, ${dataStore.trafficSignals.length} signals`);

    // Seed demo analytics data if no emergencies exist
    if (dataStore.emergencies.length === 0) {
      // seedDemoAnalytics();
    }
  } catch (error) {
    console.error('  ❌ Failed to load data from MongoDB:', error.message);
    throw error;
  }
}

// ===== Demo Analytics Seeder =====
function seedDemoAnalytics() {
  const emergencyTypes = ['cardiac', 'trauma', 'respiratory', 'burn', 'general', 'neurological'];
  const severities = ['critical', 'high', 'medium'];
  const now = Date.now();

  // 12 resolved emergencies (past data)
  const resolvedEmergencies = Array.from({ length: 12 }, (_, i) => {
    const createdTime = now - (i + 1) * 3600000 - Math.random() * 1800000; // staggered over past hours
    const responseTime = Math.floor(6 + Math.random() * 12); // 6–18 min
    const hospital = dataStore.hospitals[Math.floor(Math.random() * dataStore.hospitals.length)];
    const ambulance = dataStore.ambulances[Math.floor(Math.random() * dataStore.ambulances.length)];

    return {
      id: `em-demo-${1000 + i}`,
      status: 'resolved',
      severity: severities[Math.floor(Math.random() * severities.length)],
      type: emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)],
      patientInfo: `Patient ${i + 1}`,
      patientLocation: {
        lat: 12.93 + Math.random() * 0.08,
        lng: 77.55 + Math.random() * 0.1
      },
      ambulanceId: ambulance?.id,
      hospital: { id: hospital.id, name: hospital.name, lat: hospital.lat, lng: hospital.lng },
      routeToPatient: { distance: parseFloat((1.5 + Math.random() * 4).toFixed(2)), estimatedTime: Math.floor(4 + Math.random() * 8), signalsOnRoute: [], waypoints: [], routePoints: [] },
      routeToHospital: { distance: parseFloat((2 + Math.random() * 5).toFixed(2)), estimatedTime: Math.floor(5 + Math.random() * 10), signalsOnRoute: [], waypoints: [], routePoints: [] },
      corridor: null,
      totalETA: Math.floor(8 + Math.random() * 15),
      totalDistance: parseFloat((3 + Math.random() * 8).toFixed(2)),
      signalsCleared: Math.floor(2 + Math.random() * 5),
      createdAt: new Date(createdTime).toISOString(),
      resolvedAt: new Date(createdTime + responseTime * 60000).toISOString(),
      responseTime: responseTime,
    };
  });

  // 2 active emergencies (ongoing)
  const activeEmergencies = [
    {
      id: `em-active-001`,
      status: 'active',
      severity: 'critical',
      type: 'cardiac',
      patientInfo: 'Male, 58, Chest Pain',
      patientLocation: { lat: 12.9754, lng: 77.6066 },
      ambulanceId: 'a1',
      hospital: { id: 'h1', name: 'City General Hospital', lat: 12.9716, lng: 77.5946 },
      routeToPatient: { distance: 2.1, estimatedTime: 5, signalsOnRoute: ['s1', 's2'], waypoints: [], routePoints: [] },
      routeToHospital: { distance: 3.4, estimatedTime: 8, signalsOnRoute: ['s3', 's4'], waypoints: [], routePoints: [] },
      corridor: { id: 'corridor-demo-1', emergencyId: 'em-active-001', ambulanceId: 'a1', signalIds: ['s1', 's2', 's3'], status: 'active', createdAt: new Date().toISOString() },
      totalETA: 13,
      totalDistance: 5.5,
      signalsCleared: 3,
      createdAt: new Date(now - 300000).toISOString(),
    },
    {
      id: `em-active-002`,
      status: 'active',
      severity: 'high',
      type: 'trauma',
      patientInfo: 'Female, 34, Road Accident',
      patientLocation: { lat: 12.9352, lng: 77.6245 },
      ambulanceId: 'a2',
      hospital: { id: 'h2', name: 'Apollo Emergency Center', lat: 12.9352, lng: 77.6245 },
      routeToPatient: { distance: 1.8, estimatedTime: 4, signalsOnRoute: ['s9', 's8'], waypoints: [], routePoints: [] },
      routeToHospital: { distance: 2.6, estimatedTime: 6, signalsOnRoute: ['s16'], waypoints: [], routePoints: [] },
      corridor: null,
      totalETA: 10,
      totalDistance: 4.4,
      signalsCleared: 2,
      createdAt: new Date(now - 180000).toISOString(),
    }
  ];

  dataStore.emergencies = [...resolvedEmergencies, ...activeEmergencies];

  // Set ambulances a1 and a2 as dispatched with movement
  const a1Idx = dataStore.ambulances.findIndex(a => a.id === 'a1');
  const a2Idx = dataStore.ambulances.findIndex(a => a.id === 'a2');
  if (a1Idx !== -1) {
    dataStore.ambulances[a1Idx].status = 'dispatched';
    dataStore.ambulances[a1Idx].speed = 45;
    dataStore.ambulances[a1Idx].heading = 220;
  }
  if (a2Idx !== -1) {
    dataStore.ambulances[a2Idx].status = 'dispatched';
    dataStore.ambulances[a2Idx].speed = 38;
    dataStore.ambulances[a2Idx].heading = 165;
  }

  // Put 3 signals in green corridor
  dataStore.trafficSignals = dataStore.trafficSignals.map(s => {
    if (['s1', 's2', 's3'].includes(s.id)) {
      return { ...s, status: 'green', corridor: 'corridor-demo-1', overrideReason: 'Emergency: em-active-001' };
    }
    return s;
  });

  // Set analytics baseline
  dataStore.analytics = {
    resolved: resolvedEmergencies.length,
    totalResponseTime: resolvedEmergencies.reduce((sum, e) => sum + e.responseTime, 0),
  };

  console.log(`  🎯 Demo analytics seeded: ${resolvedEmergencies.length} resolved + ${activeEmergencies.length} active emergencies`);
}

// Routes — pass both dataStore and MongoDB models
const authRoutes = require("./routes/auth")(dataStore);
const driverRoutes = require("./routes/drivers")(dataStore);
const ambulanceRoutes = require("./routes/ambulances")(dataStore);
const hospitalRoutes = require("./routes/hospitals")(dataStore);
const signalRoutes = require("./routes/signals")(dataStore);
const emergencyRoutes = require("./routes/emergencies")(dataStore, io);
const adminRoutes = require("./routes/admin")(dataStore);

app.use("/api/auth", authRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/ambulances", ambulanceRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/signals", signalRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: "MongoDB connected",
    services: {
      gps: "active",
      signals: "active",
      routing: "active",
      hospitals: "active",
    },
  });
});

// Dashboard summary endpoint
app.get("/api/dashboard", (req, res) => {
  const activeEmergencies = (dataStore.emergencies || []).filter(
    (e) => e.status === "active",
  );
  const resolvedEmergencies = (dataStore.emergencies || []).filter(
    (e) => e.status === "resolved",
  );

  res.json({
    success: true,
    data: {
      ambulances: {
        total: dataStore.ambulances.length,
        available: dataStore.ambulances.filter((a) => a.status === "available")
          .length,
        dispatched: dataStore.ambulances.filter(
          (a) => a.status === "dispatched",
        ).length,
        list: dataStore.ambulances,
      },
      hospitals: {
        total: dataStore.hospitals.length,
        totalBeds: dataStore.hospitals.reduce((s, h) => s + h.totalBeds, 0),
        availableBeds: dataStore.hospitals.reduce(
          (s, h) => s + h.availableBeds,
          0,
        ),
        icuAvailable: dataStore.hospitals.reduce(
          (s, h) => s + h.icuAvailable,
          0,
        ),
        list: dataStore.hospitals.map((h) =>
          filterSensitiveHospitalData(h, req.user?.role, req.user?.hospitalId),
        ),
      },
      signals: {
        total: dataStore.trafficSignals.length,
        green: dataStore.trafficSignals.filter((s) => s.status === "green")
          .length,
        red: dataStore.trafficSignals.filter((s) => s.status === "red").length,
        inCorridor: dataStore.trafficSignals.filter((s) => s.corridor).length,
        list: dataStore.trafficSignals,
      },
      emergencies: {
        active: activeEmergencies.length,
        resolved: resolvedEmergencies.length,
        total: dataStore.emergencies.length,
        list: dataStore.emergencies,
      },
    },
  });
});

// ===== WebSocket Handling =====
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  const safeHospitals = dataStore.hospitals.map((h) =>
    filterSensitiveHospitalData(h),
  );

  // Send initial state
  socket.emit("initial:state", {
    ambulances: dataStore.ambulances,
    hospitals: safeHospitals,
    signals: dataStore.trafficSignals,
    emergencies: dataStore.emergencies || [],
  });

  // Handle client requests
  socket.on("request:dashboard", () => {
    socket.emit("dashboard:update", {
      ambulances: dataStore.ambulances,
      hospitals: safeHospitals,
      signals: dataStore.trafficSignals,
      emergencies: dataStore.emergencies || [],
    });
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ===== Real-time Update Engine =====

// GPS position update loop (every 1.5 seconds)
setInterval(() => {
  let hasUpdates = false;

  dataStore.ambulances.forEach((ambulance) => {
    if (gpsSimulator.isActive(ambulance.id)) {
      const pos = gpsSimulator.getNextPosition(ambulance.id);
      if (pos) {
        const idx = dataStore.ambulances.findIndex(
          (a) => a.id === ambulance.id,
        );
        if (idx !== -1) {
          dataStore.ambulances[idx].lat = pos.lat;
          dataStore.ambulances[idx].lng = pos.lng;
          dataStore.ambulances[idx].speed = pos.speed;
          dataStore.ambulances[idx].heading = pos.heading;
          hasUpdates = true;

          // Check if arrived
          if (pos.arrived) {
            dataStore.ambulances[idx].status = "at-hospital";
            io.emit("ambulance:arrived", {
              ambulanceId: ambulance.id,
              position: pos,
            });
          }

          // Emit individual position update
          io.emit("gps:update", {
            ambulanceId: ambulance.id,
            ...pos,
          });
        }
      }
    }
  });

  if (hasUpdates) {
    io.emit("ambulances:update", dataStore.ambulances);
  }
}, 1500);

// Signal cycling (every 10 seconds for non-corridor signals)
setInterval(() => {
  dataStore.trafficSignals = signalController.cycleSignals(
    dataStore.trafficSignals,
  );
  io.emit("signals:update", dataStore.trafficSignals);
}, 10000);

// ===== Start Server =====
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Load data from MongoDB into memory
    try {
  await loadDataFromDB();
    console.log("Data loaded successfully");
  } catch (error) {
    console.error("Error loading DB data:", error);
  }

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   🚑 SETCS Backend Server Running                ║
  ║   📡 REST API: http://localhost:${PORT}/api         ║
  ║   🔌 WebSocket: ws://localhost:${PORT}              ║
  ║   📊 Dashboard: http://localhost:${PORT}/api/dashboard ║
  ║   📦 Database: MongoDB (local)                    ║
  ╚═══════════════════════════════════════════════════╝
  `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
