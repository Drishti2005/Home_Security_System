import { Event, Setting } from '../database/init.js';
import { sendTelegramAlert } from './telegram.js';

const rooms = ['hall', 'kitchen', 'bedroom', 'garden', 'living_room'];
const unknownNames = ['Unknown Person', 'Unidentified Individual', 'Stranger'];

export async function simulateEvent(type = 'motion', customRoom = null, customPerson = null) {
  const room = customRoom || rooms[Math.floor(Math.random() * rooms.length)];
  let eventData = {};

  switch (type) {
    case 'intruder':
    case 'unknown_face':
      const personName = customPerson || unknownNames[Math.floor(Math.random() * unknownNames.length)];
      eventData = {
        type: 'unknown_face',
        room,
        personName,
        riskLevel: 'high',
        description: `⚠️ Unknown person detected in ${room}`
      };
      
      await updateRiskScore(30);
      
      // Send detailed Telegram alert
      const alertMessage = `🚨 *SECURITY ALERT*\n\n` +
        `⚠️ Unknown Person Detected!\n\n` +
        `📍 Location: ${room.toUpperCase()}\n` +
        `👤 Person: ${personName}\n` +
        `⏰ Time: ${new Date().toLocaleString()}\n` +
        `🔴 Risk Level: HIGH\n\n` +
        `Please check the camera feed immediately!`;
      
      await sendTelegramAlert(alertMessage);
      break;

    case 'motion':
      eventData = {
        type: 'motion',
        room,
        riskLevel: 'low',
        description: `Motion detected in ${room}`
      };
      break;

    case 'fire':
      eventData = {
        type: 'fire',
        room,
        riskLevel: 'high',
        description: `🔥 FIRE ALERT in ${room}!`
      };
      await updateRiskScore(50);
      sendTelegramAlert(`🔥 CRITICAL: Fire detected in ${room}!`);
      break;

    case 'forced_entry':
      eventData = {
        type: 'forced_entry',
        room,
        riskLevel: 'high',
        description: `Forced entry attempt at ${room}`
      };
      await updateRiskScore(40);
      sendTelegramAlert(`⚠️ ALERT: Forced entry detected at ${room}!`);
      break;

    case 'power_failure':
      eventData = {
        type: 'power_failure',
        riskLevel: 'medium',
        description: 'Power failure detected'
      };
      sendTelegramAlert('⚡ WARNING: Power failure detected!');
      break;

    case 'lockdown':
      eventData = {
        type: 'lockdown',
        riskLevel: 'high',
        description: '🔒 Emergency lockdown activated - All doors locked, alarms triggered'
      };
      sendTelegramAlert('🔒 EMERGENCY LOCKDOWN ACTIVATED!\n\nAll doors locked. Alarms triggered. System secured.');
      break;

    default:
      eventData = {
        type: 'motion',
        room,
        riskLevel: 'low',
        description: `Motion detected in ${room}`
      };
  }

  const event = await Event.create(eventData);
  return { id: event._id, ...eventData, timestamp: event.timestamp };
}

async function updateRiskScore(increase) {
  try {
    const current = await Setting.findOne({ key: 'risk_score' });
    const newScore = Math.min(100, parseInt(current?.value || 0) + increase);
    
    await Setting.findOneAndUpdate(
      { key: 'risk_score' },
      { key: 'risk_score', value: String(newScore) },
      { upsert: true }
    );
  } catch (error) {
    console.error('Update risk score error:', error);
  }
}

// Simulate random events periodically
export function startEventSimulation() {
  setInterval(async () => {
    try {
      const armed = await Setting.findOne({ key: 'armed' });
      
      if (armed?.value === 'true' && Math.random() > 0.7) {
        const eventTypes = ['motion', 'motion', 'motion', 'unknown_face'];
        const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        await simulateEvent(type);
      }
    } catch (error) {
      console.error('Event simulation error:', error);
    }
  }, 30000); // Every 30 seconds
}
