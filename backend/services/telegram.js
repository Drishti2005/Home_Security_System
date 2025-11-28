import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { Setting, Event } from '../database/init.js';
import { simulateEvent } from './simulator.js';
import { calculateRiskScore } from './riskEngine.js';

dotenv.config();

let bot = null;

export function initTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token || token === 'your-telegram-bot-token-here') {
    console.log('⚠️  Telegram bot token not configured. Bot features disabled.');
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: true });
    console.log('✅ Telegram bot initialized');

    // Command handlers
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      bot.sendMessage(chatId, 
        '🏠 *Virtual Home Security System*\n\n' +
        'Available commands:\n' +
        '/arm - Activate security\n' +
        '/disarm - Deactivate security\n' +
        '/status - System status\n' +
        '/logs - Last 10 events\n' +
        '/pending - Show pending faces\n' +
        '/approve [ID] [Name] - Approve unknown person\n' +
        '/risk - Current risk score\n' +
        '/who\\_is\\_home - Show detected people\n' +
        '/alertmode [silent|normal] - Change alert mode',
        { parse_mode: 'Markdown' }
      );
    });

    bot.onText(/\/arm/, async (msg) => {
      await Setting.findOneAndUpdate(
        { key: 'armed' },
        { key: 'armed', value: 'true' },
        { upsert: true }
      );
      await Event.create({ type: 'system', description: 'System armed via Telegram' });
      bot.sendMessage(msg.chat.id, '✅ Security system ARMED');
    });

    bot.onText(/\/disarm/, async (msg) => {
      await Setting.findOneAndUpdate(
        { key: 'armed' },
        { key: 'armed', value: 'false' },
        { upsert: true }
      );
      await Event.create({ type: 'system', description: 'System disarmed via Telegram' });
      bot.sendMessage(msg.chat.id, '✅ Security system DISARMED');
    });

    bot.onText(/\/status/, async (msg) => {
      const armed = await Setting.findOne({ key: 'armed' });
      const alertMode = await Setting.findOne({ key: 'alert_mode' });
      const riskScore = await Setting.findOne({ key: 'risk_score' });
      
      const status = `📊 *System Status*\n\n` +
        `Armed: ${armed?.value === 'true' ? '🔴 YES' : '🟢 NO'}\n` +
        `Alert Mode: ${alertMode?.value || 'normal'}\n` +
        `Risk Score: ${riskScore?.value || 0}/100`;
      
      bot.sendMessage(msg.chat.id, status, { parse_mode: 'Markdown' });
    });

    bot.onText(/\/logs/, async (msg) => {
      const events = await Event.find().sort({ timestamp: -1 }).limit(10).lean();
      
      let message = '📋 *Last 10 Events*\n\n';
      events.forEach((e, i) => {
        const time = new Date(e.timestamp).toLocaleTimeString();
        message += `${i + 1}. [${time}] ${e.description}\n`;
      });
      
      bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
    });

    bot.onText(/\/simulate_intruder/, async (msg) => {
      const event = await simulateEvent('intruder');
      bot.sendMessage(msg.chat.id, `🚨 Simulated: ${event.description}`);
    });

    bot.onText(/\/risk/, async (msg) => {
      const risk = await calculateRiskScore();
      const emoji = risk.level === 'high' ? '🔴' : risk.level === 'medium' ? '🟡' : '🟢';
      bot.sendMessage(msg.chat.id, 
        `${emoji} *Risk Level: ${risk.level.toUpperCase()}*\n\nScore: ${risk.score}/100`,
        { parse_mode: 'Markdown' }
      );
    });

    bot.onText(/\/who_is_home/, async (msg) => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recent = await Event.find({
        personName: { $exists: true, $ne: null },
        timestamp: { $gte: thirtyMinutesAgo }
      }).distinct('personName');
      
      if (recent.length === 0) {
        bot.sendMessage(msg.chat.id, '🏠 No one detected recently');
      } else {
        const people = recent.join('\n');
        bot.sendMessage(msg.chat.id, `🏠 *People at home:*\n\n${people}`, { parse_mode: 'Markdown' });
      }
    });

    bot.onText(/\/alertmode (.+)/, async (msg, match) => {
      const mode = match[1];
      if (mode === 'silent' || mode === 'normal') {
        await Setting.findOneAndUpdate(
          { key: 'alert_mode' },
          { key: 'alert_mode', value: mode },
          { upsert: true }
        );
        bot.sendMessage(msg.chat.id, `✅ Alert mode set to: ${mode}`);
      } else {
        bot.sendMessage(msg.chat.id, '❌ Invalid mode. Use: silent or normal');
      }
    });

    bot.onText(/\/addunknown ([a-f0-9]+) (.+)/, async (msg, match) => {
      const unknownId = match[1];
      const name = match[2];

      try {
        // Import UnknownFace and KnownFace
        const { UnknownFace, KnownFace } = await import('../database/init.js');

        const unknownFace = await UnknownFace.findById(unknownId);
        if (!unknownFace) {
          bot.sendMessage(msg.chat.id, '❌ Unknown face not found');
          return;
        }

        // Add to known faces
        const knownFace = await KnownFace.create({
          name,
          category: 'guest',
          imagePath: unknownFace.imagePath,
          faceDescriptor: unknownFace.faceDescriptor,
          accessAllowed: true
        });

        // Update unknown face status
        unknownFace.status = 'approved';
        await unknownFace.save();

        // Log event
        await Event.create({
          type: 'face_added',
          personName: name,
          description: `${name} added via Telegram`
        });

        bot.sendMessage(msg.chat.id, `✅ ${name} added to known faces!\n\nThey will be recognized next time.`);
      } catch (error) {
        console.error('Add unknown error:', error);
        bot.sendMessage(msg.chat.id, '❌ Failed to add person. Please try again.');
      }
    });

    bot.onText(/\/pending/, async (msg) => {
      try {
        const { KnownFace } = await import('../database/init.js');
        const pending = await KnownFace.find({ approved: false }).sort({ detectedAt: -1 });

        if (pending.length === 0) {
          bot.sendMessage(msg.chat.id, '✅ No pending faces to approve');
          return;
        }

        let message = `📋 *Pending Faces: ${pending.length}*\n\n`;
        pending.forEach((face, i) => {
          message += `${i + 1}. ${face.name}\n`;
          message += `   ID: \`${face._id}\`\n`;
          message += `   Detected: ${new Date(face.detectedAt).toLocaleString()}\n\n`;
        });
        message += `To approve: /approve [ID] [RealName]\n`;
        message += `Example: /approve ${pending[0]._id} John Doe`;

        bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Pending error:', error);
        bot.sendMessage(msg.chat.id, '❌ Failed to get pending faces');
      }
    });

    // Approve pending face command
    bot.onText(/\/approve ([a-f0-9]+) (.+)/, async (msg, match) => {
      const pendingId = match[1];
      const realName = match[2];

      try {
        const { KnownFace, Event } = await import('../database/init.js');

        const pendingFace = await KnownFace.findById(pendingId);
        if (!pendingFace) {
          bot.sendMessage(msg.chat.id, '❌ Pending face not found');
          return;
        }

        if (pendingFace.approved) {
          bot.sendMessage(msg.chat.id, '⚠️ This person is already approved');
          return;
        }

        // Approve the face
        pendingFace.name = realName;
        pendingFace.category = 'guest';
        pendingFace.approved = true;
        pendingFace.accessAllowed = true;
        await pendingFace.save();

        // Log event
        await Event.create({
          type: 'face_approved',
          personName: realName,
          description: `${realName} approved via Telegram`
        });

        bot.sendMessage(msg.chat.id, `✅ *${realName}* approved and added to known faces!\n\nThey will be recognized next time.`, { parse_mode: 'Markdown' });
        
        console.log(`✅ ${realName} approved via Telegram by user ${msg.from.first_name}`);
      } catch (error) {
        console.error('Approve error:', error);
        bot.sendMessage(msg.chat.id, '❌ Failed to approve person. Please try again.');
      }
    });

    return bot;
  } catch (error) {
    console.error('Telegram bot error:', error.message);
    return null;
  }
}

export function sendTelegramAlert(message) {
  if (!bot) {
    console.log('⚠️  Telegram bot not initialized - message not sent');
    return;
  }
  
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!chatId || chatId === 'your-telegram-chat-id-here') {
    console.log('⚠️  Telegram chat ID not configured - message not sent');
    return;
  }

  Setting.findOne({ key: 'alert_mode' }).then(alertMode => {
    if (alertMode?.value === 'silent' && !message.includes('CRITICAL')) {
      console.log('🔕 Silent mode - alert suppressed');
      return; // Silent mode - only send critical alerts
    }

    try {
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      console.log('✅ Telegram alert sent successfully');
    } catch (error) {
      console.error('❌ Failed to send Telegram alert:', error.message);
    }
  });
}

export async function sendTelegramAlertWithImage(message, imagePath) {
  if (!bot) {
    console.log('⚠️  Telegram bot not configured');
    return;
  }
  
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!chatId || chatId === 'your-telegram-chat-id-here') {
    console.log('⚠️  Telegram chat ID not configured');
    return;
  }

  try {
    const alertMode = await Setting.findOne({ key: 'alert_mode' });
    
    if (alertMode?.value === 'silent' && !message.includes('CRITICAL')) {
      return;
    }

    const fs = await import('fs');
    const path = await import('path');
    
    const absolutePath = path.resolve(imagePath);
    
    if (!fs.existsSync(absolutePath)) {
      console.error(`❌ File not found: ${absolutePath}`);
      return;
    }

    await bot.sendPhoto(chatId, absolutePath, {
      caption: message
    });
    
    console.log('✅ Photo sent to Telegram!');
  } catch (error) {
    console.error('❌ Telegram photo error:', error.message);
  }
}
