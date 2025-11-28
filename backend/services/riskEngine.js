import { Event, Setting } from '../database/init.js';

export async function calculateRiskScore() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = await Event.find({
      timestamp: { $gte: oneHourAgo }
    }).lean();

    let score = 0;

    // Count high-risk events
    const highRiskEvents = recentEvents.filter(e => e.riskLevel === 'high').length;
    const mediumRiskEvents = recentEvents.filter(e => e.riskLevel === 'medium').length;
    const unknownFaces = recentEvents.filter(e => e.type === 'unknown_face').length;

    score += highRiskEvents * 20;
    score += mediumRiskEvents * 10;
    score += unknownFaces * 15;

    // Check for repeated unknown faces
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const unknownInShortTime = await Event.countDocuments({
      type: 'unknown_face',
      timestamp: { $gte: tenMinutesAgo }
    });

    if (unknownInShortTime > 2) {
      score += 30;
    }

    // Night time bonus (10 PM - 6 AM)
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 6) {
      score += 10;
    }

    // Cap at 100
    score = Math.min(100, score);

    // Update in database
    await Setting.findOneAndUpdate(
      { key: 'risk_score' },
      { key: 'risk_score', value: String(score) },
      { upsert: true }
    );

    return {
      score,
      level: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
      factors: {
        highRiskEvents,
        mediumRiskEvents,
        unknownFaces,
        nightTime: hour >= 22 || hour <= 6
      }
    };
  } catch (error) {
    console.error('Risk calculation error:', error);
    return { score: 0, level: 'low', factors: {} };
  }
}

export async function analyzeVisitorPattern(personId) {
  try {
    const visits = await Event.find({ personId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    if (visits.length === 0) {
      return { pattern: 'new', frequency: 'rare' };
    }

    // Calculate visit frequency
    const firstVisit = new Date(visits[visits.length - 1].timestamp);
    const lastVisit = new Date(visits[0].timestamp);
    const daysBetween = (lastVisit - firstVisit) / (1000 * 60 * 60 * 24);
    const visitsPerDay = visits.length / (daysBetween || 1);

    let frequency = 'rare';
    if (visitsPerDay > 2) frequency = 'daily';
    else if (visitsPerDay > 0.5) frequency = 'frequent';
    else if (visitsPerDay > 0.1) frequency = 'occasional';

    // Detect unusual patterns
    const nightVisits = visits.filter(v => {
      const hour = new Date(v.timestamp).getHours();
      return hour >= 22 || hour <= 6;
    }).length;

    const unusual = nightVisits > visits.length * 0.3;

    return {
      pattern: unusual ? 'suspicious' : 'normal',
      frequency,
      totalVisits: visits.length,
      nightVisits,
      daysBetween: Math.round(daysBetween)
    };
  } catch (error) {
    console.error('Pattern analysis error:', error);
    return { pattern: 'unknown', frequency: 'unknown' };
  }
}

export function detectDisguise(faceData) {
  // Simulated disguise detection
  const suspiciousFeatures = [];
  
  if (Math.random() > 0.8) {
    suspiciousFeatures.push('mask_detected');
  }
  if (Math.random() > 0.85) {
    suspiciousFeatures.push('sunglasses_detected');
  }
  if (Math.random() > 0.9) {
    suspiciousFeatures.push('hat_detected');
  }

  return {
    disguised: suspiciousFeatures.length > 0,
    features: suspiciousFeatures,
    confidence: Math.random() * 0.3 + 0.7
  };
}
