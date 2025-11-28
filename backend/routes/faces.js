import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { KnownFace, Event } from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './backend/uploads/faces';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// Get pending faces (unknown faces waiting for approval) - MUST BE BEFORE /:id
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const pendingFaces = await KnownFace.find({ approved: false }).sort({ detectedAt: -1 }).lean();
    res.json(pendingFaces);
  } catch (error) {
    console.error('Get pending faces error:', error);
    res.status(500).json({ error: 'Failed to get pending faces' });
  }
});

// Approve pending face - MUST BE BEFORE /:id
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, accessAllowed } = req.body;

    const face = await KnownFace.findByIdAndUpdate(
      id,
      { 
        name,
        category: category || 'resident',
        accessAllowed: accessAllowed !== undefined ? accessAllowed : true,
        approved: true
      },
      { new: true }
    );

    if (!face) {
      return res.status(404).json({ error: 'Face not found' });
    }

    // Log approval event
    await Event.create({
      type: 'face_approved',
      personName: name,
      personId: face._id,
      description: `${name} approved and added to known faces`,
      riskLevel: 'low'
    });

    res.json({ success: true, face });
  } catch (error) {
    console.error('Approve face error:', error);
    res.status(500).json({ error: 'Failed to approve face' });
  }
});

// Get all known faces
router.get('/', authenticateToken, async (req, res) => {
  try {
    const faces = await KnownFace.find({ approved: { $ne: false } }).sort({ visitCount: -1 }).lean();
    res.json(faces);
  } catch (error) {
    console.error('Get faces error:', error);
    res.status(500).json({ error: 'Failed to get faces' });
  }
});

// Add known face
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, category, notes, faceDescriptor } = req.body;
    const imagePath = req.file ? `/uploads/faces/${req.file.filename}` : null;

    // Parse face descriptor if provided
    let descriptor = null;
    if (faceDescriptor) {
      try {
        descriptor = JSON.parse(faceDescriptor);
      } catch (e) {
        console.error('Failed to parse face descriptor:', e);
      }
    }

    const face = await KnownFace.create({
      name,
      category: category || 'guest',
      imagePath,
      faceDescriptor: descriptor,
      notes: notes || '',
      accessAllowed: true
    });

    // Log event
    await Event.create({
      type: 'face_added',
      personName: name,
      description: `${name} added to known faces`
    });

    console.log(`✅ Added ${name} with face descriptor: ${descriptor ? 'Yes' : 'No'}`);

    res.json({ 
      id: face._id, 
      name, 
      category, 
      imagePath,
      hasDescriptor: !!descriptor,
      success: true 
    });
  } catch (error) {
    console.error('Add face error:', error);
    res.status(500).json({ error: 'Failed to add face' });
  }
});

// Update known face
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, notes } = req.body;

    await KnownFace.findByIdAndUpdate(id, { name, category, notes });

    res.json({ success: true });
  } catch (error) {
    console.error('Update face error:', error);
    res.status(500).json({ error: 'Failed to update face' });
  }
});

// Delete known face
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const face = await KnownFace.findById(id);
    
    if (!face) {
      return res.status(404).json({ error: 'Face not found' });
    }

    const personName = face.name;

    // Delete image file if exists
    if (face.imagePath) {
      const filePath = `./backend${face.imagePath}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete the face from database
    await KnownFace.findByIdAndDelete(id);

    // Remove person from all events (clear personId and personName)
    await Event.updateMany(
      { personId: id },
      { $unset: { personId: '', personName: '' } }
    );

    // Log deletion event
    await Event.create({
      type: 'system',
      description: `${personName} removed from known faces`,
      riskLevel: 'low'
    });

    console.log(`✅ Deleted ${personName} and cleaned up events`);

    res.json({ success: true, message: `${personName} deleted successfully` });
  } catch (error) {
    console.error('Delete face error:', error);
    res.status(500).json({ error: 'Failed to delete face' });
  }
});

// Get face by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const face = await KnownFace.findById(req.params.id).lean();
    
    if (!face) {
      return res.status(404).json({ error: 'Face not found' });
    }

    res.json(face);
  } catch (error) {
    console.error('Get face error:', error);
    res.status(500).json({ error: 'Failed to get face' });
  }
});

export default router;


// Recognize face by descriptor
router.post('/recognize', authenticateToken, async (req, res) => {
  try {
    const { faceDescriptor } = req.body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ error: 'Face descriptor required' });
    }

    // Get all known faces with descriptors
    const knownFaces = await KnownFace.find({ 
      faceDescriptor: { $exists: true, $ne: null } 
    }).lean();

    if (knownFaces.length === 0) {
      return res.json({ 
        recognized: false, 
        message: 'No known faces in database' 
      });
    }

    // Find best match using Euclidean distance
    let bestMatch = null;
    let bestDistance = Infinity;
    const RECOGNITION_THRESHOLD = 0.6; // Lower = more strict

    for (const known of knownFaces) {
      if (!known.faceDescriptor || known.faceDescriptor.length !== faceDescriptor.length) {
        continue;
      }

      // Calculate Euclidean distance
      const distance = euclideanDistance(faceDescriptor, known.faceDescriptor);

      if (distance < bestDistance && distance < RECOGNITION_THRESHOLD) {
        bestDistance = distance;
        bestMatch = known;
      }
    }

    if (bestMatch) {
      // Update visit count and last seen
      await KnownFace.findByIdAndUpdate(bestMatch._id, {
        $inc: { visitCount: 1 },
        lastSeen: new Date()
      });

      res.json({
        recognized: true,
        person: {
          id: bestMatch._id,
          name: bestMatch.name,
          category: bestMatch.category,
          accessAllowed: bestMatch.accessAllowed,
          imagePath: bestMatch.imagePath
        },
        confidence: 1 - bestDistance,
        distance: bestDistance
      });
    } else {
      res.json({
        recognized: false,
        message: 'No match found',
        bestDistance
      });
    }
  } catch (error) {
    console.error('Recognition error:', error);
    res.status(500).json({ error: 'Failed to recognize face' });
  }
});

// Helper function to calculate Euclidean distance
function euclideanDistance(desc1, desc2) {
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}

// Update access permission
router.patch('/:id/access', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { accessAllowed } = req.body;

    const face = await KnownFace.findByIdAndUpdate(
      id,
      { accessAllowed },
      { new: true }
    );

    if (!face) {
      return res.status(404).json({ error: 'Face not found' });
    }

    res.json({ 
      success: true, 
      name: face.name,
      accessAllowed: face.accessAllowed 
    });
  } catch (error) {
    console.error('Update access error:', error);
    res.status(500).json({ error: 'Failed to update access' });
  }
});
