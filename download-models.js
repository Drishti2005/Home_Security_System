import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, 'public', 'models');

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

console.log('📥 Downloading face detection models...\n');

let downloaded = 0;

models.forEach(model => {
  const filePath = path.join(modelsDir, model);
  const file = fs.createWriteStream(filePath);
  
  https.get(baseUrl + model, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      downloaded++;
      console.log(`✅ Downloaded: ${model} (${downloaded}/${models.length})`);
      
      if (downloaded === models.length) {
        console.log('\n🎉 All models downloaded successfully!');
        console.log('📁 Models saved to: public/models/\n');
      }
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {});
    console.error(`❌ Error downloading ${model}:`, err.message);
  });
});
