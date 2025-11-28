import express from 'express';
import { Event, KnownFace, Setting } from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendTelegramAlert } from '../services/telegram.js';

const router = express.Router();

// Detect person in specific room
router.post('/detect', authenticateToken, async (req, res) => {
  try {
    const { personName, room, isKnown } = req.body;

    if (!personName || !room) {
      return res.status(400).json({ error: 'Person name and room required' });
    }

    let personId = null;
    let riskLevel = 'low';
    let eventType = 'detection';

    if (isKnown) {
      // Find known person
      const knownPerson = await KnownFace.findOne({ name: personName });
      
      if (knownPerson) {
        personId = knownPerson._id;
        
        // Update visit count and last seen
        await KnownFace.findByIdAndUpdate(personId, {
          $inc: { visitCount: 1 },
          lastSeen: new Date()
        });

        eventType = 'known_face';
        riskLevel = 'low';
      }
    } else {
      // Unknown person - HIGH RISK
      eventType = 'unknown_face';
      riskLevel = 'high';

      // Create pending face for approval
      const pendingFace = await KnownFace.create({
        name: personName || 'Unknown Person',
        category: 'unknown',
        approved: false,
        detectedAt: new Date(),
        createdAt: new Date(),
        accessAllowed: false
      });

      personId = pendingFace._id;
      
      console.log(`📋 Created pending face for approval: ${personName}, ID: ${pendingFace._id}`);

      // Update risk score
      const currentRisk = await Setting.findOne({ key: 'risk_score' });
      const newScore = Math.min(100, parseInt(currentRisk?.value || 0) + 30);
      await Setting.findOneAndUpdate(
        { key: 'risk_score' },
        { value: String(newScore) },
        { upsert: true }
      );

      // Send Telegram alert with pending ID for approval
      const alertMessage = `🚨 *SECURITY ALERT*\n\n` +
        `⚠️ Unknown Person Detected!\n\n` +
        `📍 Location: ${room.toUpperCase()}\n` +
        `👤 Person: ${personName}\n` +
        `⏰ Time: ${new Date().toLocaleString()}\n` +
        `🔴 Risk Level: HIGH\n\n` +
        `✅ To approve this person, send:\n` +
        `/approve ${pendingFace._id} [RealName]\n\n` +
        `Example: /approve ${pendingFace._id} John Doe\n\n` +
        `Or check dashboard to approve/reject`;
      
      await sendTelegramAlert(alertMessage);
      
      console.log(`🚨 Unknown person "${personName}" detected in ${room}! Alert sent to Telegram!`);
    }

    // Create person detection event
    const event = await Event.create({
      type: eventType,
      room,
      personName,
      personId,
      riskLevel,
      description: isKnown 
        ? `${personName} detected in ${room}`
        : `⚠️ Unknown person (${personName}) detected in ${room}`
    });

    // Automatically create motion event when person is detected
    await Event.create({
      type: 'motion',
      room,
      riskLevel: 'low',
      description: `Motion detected in ${room} (${personName} entered)`
    });

    console.log(`✅ Detection logged: ${personName} in ${room} (${isKnown ? 'Known' : 'Unknown'})`);
    console.log(`✅ Motion automatically triggered in ${room}`);

    res.json({
      success: true,
      event: event.toObject(),
      alert: !isKnown
    });
  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ error: 'Failed to log detection' });
  }
});

// Detect motion in room
router.post('/motion', authenticateToken, async (req, res) => {
  try {
    const { room } = req.body;

    if (!room) {
      console.error('❌ Motion detection: Room parameter missing');
      return res.status(400).json({ error: 'Room required' });
    }

    console.log(`🔴 Motion detected in: ${room}`);

    const event = await Event.create({
      type: 'motion',
      room,
      riskLevel: 'low',
      description: `Motion detected in ${room}`
    });

    console.log(`✅ Motion event created, ID: ${event._id}`);

    res.json({ 
      success: true, 
      event: event.toObject(),
      message: `Motion detected in ${room}` 
    });
  } catch (error) {
    console.error('❌ Motion detection error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to log motion',
      details: error.message 
    });
  }
});

// Clear motion in room (also removes people from room)
router.post('/clear-motion', authenticateToken, async (req, res) => {
  try {
    const { room } = req.body;

    if (!room) {
      console.error('❌ Clear motion: Room parameter missing');
      return res.status(400).json({ error: 'Room required' });
    }

    console.log(`🔄 Clearing motion and people from: ${room}`);

    // Create motion_cleared event (this also implies people left the room)
    const event = await Event.create({
      type: 'motion_cleared',
      room,
      riskLevel: 'low',
      description: `Motion cleared in ${room} - Room empty`
    });

    console.log(`✅ Motion cleared in ${room}, event ID: ${event._id}`);

    res.json({ 
      success: true, 
      event: event.toObject(),
      message: `Motion cleared in ${room}` 
    });
  } catch (error) {
    console.error('❌ Clear motion error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to clear motion',
      details: error.message 
    });
  }
});

// Detect unknown person with image
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { sendTelegramAlertWithImage } from '../services/telegram.js';
import { UnknownFace } from '../database/init.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './backend/uploads/unknown';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `unknown_${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

router.post('/unknown-with-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log('📸 Unknown person with image endpoint called');
    console.log('Request body:', { room: req.body.room, personName: req.body.personName });
    console.log('File received:', req.file ? req.file.filename : 'NO FILE');
    
    const { room, personName, faceDescriptor } = req.body;
    const imagePath = req.file ? `/uploads/unknown/${req.file.filename}` : null;

    let descriptor = null;
    if (faceDescriptor) {
      try {
        descriptor = JSON.parse(faceDescriptor);
        console.log('✅ Face descriptor parsed successfully');
      } catch (e) {
        console.error('❌ Failed to parse face descriptor:', e);
      }
    }

    // Check if this unknown person was already detected
    let unknownPerson = null;
    let isNewUnknown = true;

    if (descriptor) {
      // Check against existing unknown faces
      const unknownFaces = await UnknownFace.find({ status: 'pending' });
      
      for (const unknown of unknownFaces) {
        if (unknown.faceDescriptor && unknown.faceDescriptor.length === descriptor.length) {
          const distance = euclideanDistance(descriptor, unknown.faceDescriptor);
          if (distance < 0.6) {
            // Same unknown person detected again
            unknownPerson = unknown;
            isNewUnknown = false;
            break;
          }
        }
      }
    }

    if (unknownPerson) {
      // Same person - don't send photo again
      unknownPerson.lastSeen = new Date();
      unknownPerson.detectionCount += 1;
      await unknownPerson.save();

      console.log(`ℹ️  Same unknown person detected again (${unknownPerson.detectionCount} times)`);
      console.log(`⏭️  Photo already sent - skipping Telegram alert`);

      res.json({
        success: true,
        isNewUnknown: false,
        unknownId: unknownPerson._id,
        detectionCount: unknownPerson.detectionCount,
        alertSent: false,
        imageSent: false
      });
    } else {
      // New unknown person - send photo
      console.log('🆕 NEW unknown person - sending photo to Telegram...');
      
      unknownPerson = await UnknownFace.create({
        faceDescriptor: descriptor,
        imagePath,
        alertSent: true,
        status: 'pending',
        firstSeen: new Date(),
        lastSeen: new Date(),
        detectionCount: 1
      });

      // Update risk score
      const currentRisk = await Setting.findOne({ key: 'risk_score' });
      const newScore = Math.min(100, parseInt(currentRisk?.value || 0) + 30);
      await Setting.findOneAndUpdate(
        { key: 'risk_score' },
        { value: String(newScore) },
        { upsert: true }
      );

      // Create event
      const event = await Event.create({
        type: 'unknown_face',
        room: room || 'camera_feed',
        personName: personName || 'Unknown Person',
        riskLevel: 'high',
        imagePath,
        description: `⚠️ NEW unknown person detected on live camera in ${room || 'camera feed'}`
      });

      // Send to Telegram with image
      const alertMessage = `🚨 *SECURITY ALERT*\n\n` +
        `⚠️ NEW Unknown Person Detected!\n\n` +
        `📍 Location: ${(room || 'camera_feed').toUpperCase()}\n` +
        `⏰ Time: ${new Date().toLocaleString()}\n` +
        `🔴 Risk Level: HIGH\n\n` +
        `📸 Image attached below\n\n` +
        `To add this person, use:\n` +
        `/addunknown ${unknownPerson._id} YourName`;

      if (imagePath) {
        // Fix path - remove leading slash and add backend prefix
        const fullPath = imagePath.startsWith('/') 
          ? `./backend${imagePath}` 
          : `./backend/${imagePath}`;
        
        console.log(`📸 Sending photo to Telegram: ${fullPath}`);
        
        // Check if file exists
        if (fs.existsSync(fullPath)) {
          console.log(`✅ File exists, sending to Telegram...`);
          await sendTelegramAlertWithImage(alertMessage, fullPath);
          console.log(`✅ Photo sent to Telegram successfully!`);
        } else {
          console.error(`❌ File not found: ${fullPath}`);
          console.log(`⚠️ Sending text alert without photo`);
          await sendTelegramAlert(alertMessage + '\n\n(Photo file not found)');
        }
      } else {
        console.log(`⚠️ No image path - sending text alert only`);
        await sendTelegramAlert(alertMessage);
      }

      console.log(`🚨 NEW unknown face detected! Photo sent to Telegram!`);

      res.json({
        success: true,
        isNewUnknown: true,
        unknownId: unknownPerson._id,
        event: event.toObject(),
        alertSent: true,
        imageSent: !!imagePath
      });
    }
  } catch (error) {
    console.error('Unknown detection error:', error);
    res.status(500).json({ error: 'Failed to log unknown detection' });
  }
});

// Helper function
function euclideanDistance(desc1, desc2) {
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}

// Get pending unknown faces
router.get('/unknown-pending', authenticateToken, async (req, res) => {
  try {
    const unknownFaces = await UnknownFace.find({ status: 'pending' })
      .sort({ firstSeen: -1 });
    res.json(unknownFaces);
  } catch (error) {
    console.error('Get unknown faces error:', error);
    res.status(500).json({ error: 'Failed to get unknown faces' });
  }
});

// Approve unknown face (add to known faces)
router.post('/unknown/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category } = req.body;

    const unknownFace = await UnknownFace.findById(id);
    if (!unknownFace) {
      return res.status(404).json({ error: 'Unknown face not found' });
    }

    // Add to known faces
    const knownFace = await KnownFace.create({
      name,
      category: category || 'guest',
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
      description: `${name} added from unknown faces`
    });

    console.log(`✅ Unknown face approved and added as ${name}`);

    res.json({
      success: true,
      knownFace: knownFace.toObject()
    });
  } catch (error) {
    console.error('Approve unknown error:', error);
    res.status(500).json({ error: 'Failed to approve unknown face' });
  }
});

export default router;
