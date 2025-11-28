import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-security';

async function clearUnknownFaces() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear UnknownFace collection
    const result = await mongoose.connection.db.collection('unknownfaces').deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} unknown face records`);

    // Optional: Clear unknown face events
    const eventsResult = await mongoose.connection.db.collection('events').deleteMany({
      type: 'unknown_face',
      room: 'camera_feed'
    });
    console.log(`✅ Deleted ${eventsResult.deletedCount} unknown face events`);

    console.log('\n🎉 Database cleared! Ready for fresh detection.');
    console.log('Next unknown person will send photo to Telegram.\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearUnknownFaces();
