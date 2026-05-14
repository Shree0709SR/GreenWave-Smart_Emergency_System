/**
 * Seed Script — Migrate JSON data to MongoDB
 * Run once: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Models
const User = require('./models/User');
const Hospital = require('./models/Hospital');
const Ambulance = require('./models/Ambulance');
const TrafficSignal = require('./models/TrafficSignal');
const Department = require('./models/Department');
const Log = require('./models/Log');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/setcs';

async function seed() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Load JSON data
    const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf-8'));
    const initialData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'initialData.json'), 'utf-8'));
    const departmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'departments.json'), 'utf-8'));

    // Clear existing data
    console.log('🗑️  Clearing existing collections...');
    await User.deleteMany({});
    await Hospital.deleteMany({});
    await Ambulance.deleteMany({});
    await TrafficSignal.deleteMany({});
    await Department.deleteMany({});
    await Log.deleteMany({});

    // Seed Departments
    console.log('📁 Seeding departments...');
    await Department.insertMany(departmentsData);
    console.log(`   ✅ ${departmentsData.length} departments inserted`);

    // Seed Users (hash passwords that aren't already hashed)
    console.log('👤 Seeding users...');
    const usersToInsert = [];
    for (const user of usersData) {
      const userData = { ...user };
      
      // If password looks like plaintext (short, no $2 prefix), hash it
      if (userData.password && !userData.password.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.plainPassword || userData.password, salt);
      }
      
      usersToInsert.push(userData);
    }
    await User.insertMany(usersToInsert);
    console.log(`   ✅ ${usersToInsert.length} users inserted`);

    // Seed Hospitals
    console.log('🏥 Seeding hospitals...');
    await Hospital.insertMany(initialData.hospitals);
    console.log(`   ✅ ${initialData.hospitals.length} hospitals inserted`);

    // Seed Ambulances
    console.log('🚑 Seeding ambulances...');
    await Ambulance.insertMany(initialData.ambulances);
    console.log(`   ✅ ${initialData.ambulances.length} ambulances inserted`);

    // Seed Traffic Signals
    console.log('🚦 Seeding traffic signals...');
    await TrafficSignal.insertMany(initialData.trafficSignals);
    console.log(`   ✅ ${initialData.trafficSignals.length} signals inserted`);

    // Seed initial log
    await Log.create({
      action: 'DATABASE_SEEDED',
      by: 'system',
      time: new Date().toISOString()
    });

    console.log('\n🎉 Database seeded successfully!');
    console.log('   You can now view the data in MongoDB Compass at:');
    console.log(`   ${MONGO_URI}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
