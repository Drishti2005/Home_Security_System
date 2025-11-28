import express from 'express';
import { Setting, Event, UnknownFace } from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { simulateEvent } from '../services/simulator.js';

const router = express.Router();

// Get system status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const settings = await Setting.find();
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);

    const recentEvents = await Event.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

    res.json({
      armed: settingsObj.armed === 'true',
      alertMode: settingsObj.alert_mode || 'normal',
      riskScore: parseInt(settingsObj.risk_score) || 0,
      theme: settingsObj.theme || 'light',
      recentEvents
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Update system setting
router.post('/settings', authenticateToken, async (req, res) => {
  try {
    const { key, value } = req.body;
    
    await Setting.findOneAndUpdate(
      { key },
      { key, value: String(value), updatedAt: new Date() },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Arm/Disarm system
router.post('/arm', authenticateToken, async (req, res) => {
  try {
    const { armed } = req.body;
    
    await Setting.findOneAndUpdate(
      { key: 'armed' },
      { key: 'armed', value: String(armed), updatedAt: new Date() },
      { upsert: true }
    );

    // Log event
    await Event.create({
      type: 'system',
      description: armed ? 'System armed' : 'System disarmed'
    });

    res.json({ success: true, armed });
  } catch (error) {
    console.error('Arm error:', error);
    res.status(500).json({ error: 'Failed to arm/disarm' });
  }
});

// Simulate intruder
router.post('/simulate-intruder', authenticateToken, async (req, res) => {
  try {
    const event = await simulateEvent('intruder');
    res.json({ success: true, event });
  } catch (error) {
    console.error('Simulate error:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

// Simulate threat
router.post('/simulate-threat', authenticateToken, async (req, res) => {
  try {
    const { type } = req.body;
    const event = await simulateEvent(type || 'intruder');
    res.json({ success: true, event });
  } catch (error) {
    console.error('Simulate threat error:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

// Get virtual house state
router.get('/house-state', authenticateToken, async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEvents = await Event.find({
      timestamp: { $gte: fiveMinutesAgo }
    }).sort({ timestamp: -1 }).lean();

    const rooms = {
      hall: { motion: false, door: 'closed', people: [] },
      kitchen: { motion: false, window: 'closed', people: [] },
      bedroom: { motion: false, door: 'closed', people: [] },
      garden: { motion: false, gate: 'closed', people: [] },
      living_room: { motion: false, window: 'closed', people: [] }
    };

    // Track the latest state for each room
    const roomStates = {};

    // Process events from newest to oldest
    recentEvents.forEach(event => {
      if (event.room && rooms[event.room]) {
        // Initialize room state if not exists
        if (!roomStates[event.room]) {
          roomStates[event.room] = {
            hasMotion: false,
            people: new Set(),
            lastEventType: null
          };
        }

        const roomState = roomStates[event.room];

        // Check if this room was cleared or evacuated
        if (!roomState.lastEventType) {
          roomState.lastEventType = event.type;
          
          if (event.type === 'motion_cleared' || event.type === 'evacuation') {
            // Room was cleared - no motion, no people
            roomState.hasMotion = false;
            roomState.people.clear();
          } else if (event.type === 'motion') {
            // Motion detected
            roomState.hasMotion = true;
          }
        }

        // Add people only if room hasn't been cleared
        if (event.personName && 
            event.type !== 'evacuation' && 
            event.type !== 'motion_cleared' &&
            roomState.lastEventType !== 'motion_cleared' &&
            roomState.lastEventType !== 'evacuation') {
          roomState.people.add(event.personName);
        }
      }
    });

    // Apply room states
    Object.keys(roomStates).forEach(room => {
      const state = roomStates[room];
      rooms[room].people = Array.from(state.people);
      
      // Final rule: People = Motion
      if (rooms[room].people.length > 0) {
        rooms[room].motion = true;
      } else {
        rooms[room].motion = false;
      }
    });

    res.json({ rooms, lastUpdate: new Date().toISOString() });
  } catch (error) {
    console.error('House state error:', error);
    res.status(500).json({ error: 'Failed to get house state' });
  }
});

// Clear unknown faces
router.post('/clear-unknown-faces', authenticateToken, async (req, res) => {
  try {
    const unknownResult = await UnknownFace.deleteMany({});
    const eventResult = await Event.deleteMany({ type: 'unknown_face' });
    
    console.log(`✅ Cleared ${unknownResult.deletedCount} unknown faces`);
    console.log(`✅ Cleared ${eventResult.deletedCount} unknown face events`);
    
    res.json({ 
      success: true, 
      unknownFacesDeleted: unknownResult.deletedCount,
      eventsDeleted: eventResult.deletedCount
    });
  } catch (error) {
    console.error('Clear unknown faces error:', error);
    res.status(500).json({ error: 'Failed to clear unknown faces' });
  }
});

export default router;
