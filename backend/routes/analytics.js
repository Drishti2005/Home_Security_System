import express from 'express';
import { Event, KnownFace } from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateRiskScore } from '../services/riskEngine.js';

const router = express.Router();

// Get analytics dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Events by day (last 7 days)
    const eventsByDay = await Event.aggregate([
      {
        $match: { timestamp: { $gte: sevenDaysAgo } }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    // Events by type
    const eventsByType = await Event.aggregate([
      {
        $match: { timestamp: { $gte: sevenDaysAgo } }
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          type: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    // Known vs unknown detections
    const knownCount = await Event.countDocuments({
      timestamp: { $gte: sevenDaysAgo },
      personId: { $exists: true, $ne: null }
    });

    const unknownCount = await Event.countDocuments({
      timestamp: { $gte: sevenDaysAgo },
      type: 'detection',
      personId: { $exists: false }
    });

    const detectionStats = {
      known: knownCount,
      unknown: unknownCount
    };

    // Most frequent visitors
    const frequentVisitors = await KnownFace.find()
      .sort({ visitCount: -1 })
      .limit(10)
      .select('name category visitCount lastSeen')
      .lean();

    // Risk score trend (last 24 hours) - simplified
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const riskTrend = await Event.aggregate([
      {
        $match: { timestamp: { $gte: oneDayAgo } }
      },
      {
        $group: {
          _id: { $hour: "$timestamp" },
          avg_risk: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ["$riskLevel", "low"] }, then: 1 },
                  { case: { $eq: ["$riskLevel", "medium"] }, then: 2 },
                  { case: { $eq: ["$riskLevel", "high"] }, then: 3 }
                ],
                default: 0
              }
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          hour: { $concat: [{ $toString: "$_id" }, ":00"] },
          avg_risk: 1,
          _id: 0
        }
      }
    ]);

    // Current risk score
    const currentRisk = await calculateRiskScore();

    res.json({
      eventsByDay,
      eventsByType,
      detectionStats,
      frequentVisitors,
      riskTrend,
      currentRisk
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get intrusion attempts
router.get('/intrusions', authenticateToken, async (req, res) => {
  try {
    const intrusions = await Event.find({
      type: { $in: ['intruder', 'unknown_face', 'forced_entry'] }
    }).sort({ timestamp: -1 }).limit(50).lean();

    res.json(intrusions);
  } catch (error) {
    console.error('Intrusions error:', error);
    res.status(500).json({ error: 'Failed to get intrusions' });
  }
});

// Export logs
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const events = await Event.find().sort({ timestamp: -1 }).lean();
    const faces = await KnownFace.find().lean();
    
    const exportData = {
      exportDate: new Date().toISOString(),
      events,
      knownFaces: faces,
      totalEvents: events.length,
      totalKnownFaces: faces.length
    };

    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
