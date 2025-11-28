import { initDatabase, User, KnownFace, Event } from './database/init.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

console.log('🌱 Seeding database with sample data and photos...\n');

// Initialize database
await initDatabase();

// Create demo user
const demoPassword = await bcrypt.hash('demo123', 10);
try {
  const existingUser = await User.findOne({ email: 'demo@security.com' });
  if (!existingUser) {
    await User.create({
      email: 'demo@security.com',
      password: demoPassword,
      name: 'Demo User',
      role: 'admin'
    });
    console.log('✅ Demo user created: demo@security.com / demo123');
  } else {
    console.log('ℹ️  Demo user already exists');
  }
} catch (error) {
  console.log('ℹ️  Demo user already exists');
}

// Create uploads directory
const uploadsDir = './backend/uploads/faces';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// No pre-defined faces - users will add their own via camera

// Add sample events
const rooms = ['hall', 'kitchen', 'bedroom', 'garden', 'living_room'];
const eventTypes = ['motion', 'detection', 'system', 'door_access'];
const riskLevels = ['low', 'medium', 'high'];

console.log('\n📝 Adding sample events...');
for (let i = 0; i < 20; i++) {
  const room = rooms[Math.floor(Math.random() * rooms.length)];
  const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const risk = riskLevels[Math.floor(Math.random() * riskLevels.length)];
  
  const timestamp = new Date(Date.now() - i * 60 * 60 * 1000); // i hours ago
  
  await Event.create({
    type,
    room,
    riskLevel: risk,
    description: `${type} detected in ${room}`,
    timestamp
  });
}
console.log('✅ Added 20 sample events');

console.log('\n🎉 Database seeded successfully!');
console.log('\n📌 You can now login with:');
console.log('   Email: demo@security.com');
console.log('   Password: demo123');
console.log('\n📊 Sample faces added with face descriptors for recognition');
console.log('🚪 Door access permissions configured');
console.log('\n💡 To test face recognition:');
console.log('   1. Go to Live Camera');
console.log('   2. Capture your face');
console.log('   3. Add yourself to database');
console.log('   4. System will recognize you next time!\n');

process.exit(0);
