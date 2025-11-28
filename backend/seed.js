import { initDatabase, User, KnownFace, Event } from './database/init.js';
import bcrypt from 'bcryptjs';

console.log('🌱 Seeding database with sample data...\n');

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

// Add sample known faces
const sampleFaces = [
  { name: 'John Smith', category: 'family', notes: 'Homeowner', visitCount: 50 },
  { name: 'Jane Smith', category: 'family', notes: 'Spouse', visitCount: 48 },
  { name: 'Bob Johnson', category: 'frequent', notes: 'Neighbor', visitCount: 15 },
  { name: 'Alice Williams', category: 'guest', notes: 'Friend', visitCount: 8 },
  { name: 'Mike Davis', category: 'rare', notes: 'Delivery person', visitCount: 3 }
];

for (const face of sampleFaces) {
  try {
    const existing = await KnownFace.findOne({ name: face.name });
    if (!existing) {
      await KnownFace.create({
        ...face,
        lastSeen: new Date()
      });
      console.log(`✅ Added known face: ${face.name}`);
    } else {
      console.log(`ℹ️  Face already exists: ${face.name}`);
    }
  } catch (error) {
    console.log(`ℹ️  Face already exists: ${face.name}`);
  }
}

// Add sample events
const rooms = ['hall', 'kitchen', 'bedroom', 'garden', 'living_room'];
const eventTypes = ['motion', 'detection', 'system'];
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
console.log('   Password: demo123\n');

process.exit(0);
