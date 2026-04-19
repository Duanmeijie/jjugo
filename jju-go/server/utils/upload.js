const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('只支持jpg/png/jpeg/webp格式图片'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5
  }
});

async function processImages(files) {
  const processedPaths = [];
  for (const file of files) {
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
    const outputPath = path.join(uploadsDir, filename);
    
    if (file.buffer) {
      await sharp(file.buffer)
        .resize(800, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
    } else if (file.path) {
      await sharp(file.path)
        .resize(800, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
    processedPaths.push(`/uploads/${filename}`);
  }
  return processedPaths;
}

module.exports = { upload, processImages };