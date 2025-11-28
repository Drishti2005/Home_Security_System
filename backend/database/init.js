import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// Known Face Schema
const knownFaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'guest' },
  imagePath: String,
  faceDescriptor: [Number], // Store 128-dimensional face descriptor
  visitCount: { type: Number, default: 0 },
  lastSeen: Date,
  addedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  detectedAt: { type: Date, default: Date.now },
  notes: String,
  accessAllowed: { type: Boolean, default: true }, // For door access control
  approved: { type: Boolean, default: true } // For pending approval workflow
});

// Event Schema
const eventSchema = new mongoose.Schema({
  type: { type: String, required: true },
  room: String,
  personName: String,
  personId: { type: mongoose.Schema.Types.ObjectId, ref: 'KnownFace' },
  riskLevel: { type: String, default: 'low' },
  description: String,
  imagePath: String,
  timestamp: { type: Date, default: Date.now }
});

// System Settings Schema
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

// Unknown Faces Schema (pending approval)
const unknownFaceSchema = new mongoose.Schema({
  faceDescriptor: [Number],
  imagePath: String,
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  detectionCount: { type: Number, default: 1 },
  alertSent: { type: Boolean, default: false },
  status: { type: String, default: 'pending' } // pending, approved, rejected
});

// Create Models
export const User = mongoose.model('User', userSchema);
export const KnownFace = mongoose.model('KnownFace', knownFaceSchema);
export const Event = mongoose.model('Event', eventSchema);
export const Setting = mongoose.model('Setting', settingSchema);
export const UnknownFace = mongoose.model('UnknownFace', unknownFaceSchema);

// Initialize Database Connection
export async function initDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-security';
    
    await mongoose.connect(mongoUri);
    
    console.log('✅ MongoDB connected successfully');

    // Initialize default settings
    const defaultSettings = [
      { key: 'armed', value: 'false' },
      { key: 'alert_mode', value: 'normal' },
      { key: 'risk_score', value: '0' },
      { key: 'theme', value: 'light' }
    ];

    for (const setting of defaultSettings) {
      await Setting.findOneAndUpdate(
        { key: setting.key },
        setting,
        { upsert: true, new: true }
      );
    }

    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n⚠️  MongoDB not running? Install and start MongoDB:');
    console.log('   Download: https://www.mongodb.com/try/download/community');
    console.log('   Or use MongoDB Atlas (free cloud): https://www.mongodb.com/cloud/atlas');
    process.exit(1);
  }
}

export default mongoose;
