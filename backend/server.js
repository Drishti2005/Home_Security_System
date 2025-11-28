import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import systemRoutes from './routes/system.js';
import facesRoutes from './routes/faces.js';
import eventsRoutes from './routes/events.js';
import analyticsRoutes from './routes/analytics.js';
import detectionRoutes from './routes/detection.js';
import { initDatabase } from './database/init.js';
import { initTelegramBot } from './services/telegram.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/faces', facesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/detection', detectionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: 'mongodb',
    timestamp: new Date().toISOString() 
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    
    // Initialize Telegram Bot
    const bot = initTelegramBot();
    if (bot) {
      console.log('✅ Telegram bot initialized and ready');
    } else {
      console.log('⚠️  Telegram bot not configured (optional)');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`💾 Database: MongoDB`);
      console.log(`🤖 Telegram: ${bot ? 'Connected' : 'Disabled'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
