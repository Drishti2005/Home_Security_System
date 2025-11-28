import dotenv from 'dotenv';
import { initDatabase } from './database/init.js';
import { initTelegramBot } from './services/telegram.js';
import { startEventSimulation } from './services/simulator.js';

dotenv.config();

console.log('🤖 Starting Telegram Bot...');

async function startBot() {
  try {
    // Initialize database
    await initDatabase();

    // Initialize Telegram bot
    const bot = initTelegramBot();

    if (bot) {
      console.log('✅ Bot is running. Press Ctrl+C to stop.');
      
      // Start event simulation
      startEventSimulation();
      console.log('✅ Event simulation started');
    } else {
      console.log('⚠️  Bot not started. Check your .env configuration.');
    }
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

startBot();
