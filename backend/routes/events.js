import express from 'express';
import { Event } from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all events with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const events = await Event.find()
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await Event.countDocuments();

    res.json({ events, total });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get events by type
router.get('/type/:type', authenticateToken, async (req, res) => {
  try {
    const events = await Event.find({ type: req.params.type })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.json(events);
  } catch (error) {
    console.error('Get events by type error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get timeline (last 24 hours)
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const events = await Event.find({
      timestamp: { $gte: oneDayAgo }
    }).sort({ timestamp: -1 }).lean();

    res.json(events);
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// Clear all events
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    await Event.deleteMany({});
    res.json({ success: true });
  } catch (error) {
    console.error('Clear events error:', error);
    res.status(500).json({ error: 'Failed to clear events' });
  }
});

export default router;
