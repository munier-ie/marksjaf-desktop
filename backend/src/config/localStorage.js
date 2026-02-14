const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Determine uploads directory based on environment
// In production (when packaged), use app.getPath('userData')
// In development, use the backend/uploads directory
let uploadDir;

if (process.env.IS_PACKAGED === 'true') {
  // Production: Use userData directory (passed from Electron main process)
  uploadDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
} else {
  // Development: Use local backend/uploads directory
  uploadDir = path.join(__dirname, '../../uploads');
}

const itemsDir = path.join(uploadDir, 'items');
const categoriesDir = path.join(uploadDir, 'categories');
const tempDir = path.join(uploadDir, 'temp');

console.log('📁 Uploads directory:', uploadDir);

// Create directories if they don't exist
[uploadDir, itemsDir, categoriesDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for local file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on upload type
    const uploadType = req.body.uploadType || 'items';
    const destDir = uploadType === 'categories' ? categoriesDir : itemsDir;
    cb(null, destDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

module.exports = { upload, uploadDir, itemsDir, categoriesDir, tempDir };