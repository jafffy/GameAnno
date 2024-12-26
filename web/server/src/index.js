const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const { body, validationResult } = require('express-validator');

const app = express();
const port = process.env.PORT || 5000;

// Security middleware with relaxed settings for development
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '25mb' }));

// Ensure upload directories exist
const createRequiredDirectories = async () => {
  try {
    await fs.mkdir('./uploads', { recursive: true });
    await fs.mkdir('./annotations', { recursive: true });
    console.log('Required directories created successfully');
  } catch (err) {
    console.error('Error creating directories:', err);
  }
};

createRequiredDirectories();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File uploaded:', req.file);

    const image = sharp(req.file.path);
    const metadata = await image.metadata();
    
    // Resize image if larger than 720p while maintaining aspect ratio
    if (metadata.height > 720 || metadata.width > 1280) {
      const resizedPath = path.join('uploads', `resized-${req.file.filename}`);
      await image
        .resize(1280, 720, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(resizedPath);
      
      // Delete original file
      await fs.unlink(req.file.path);
      
      return res.json({
        filename: path.basename(resizedPath),
        width: metadata.width,
        height: metadata.height
      });
    }

    res.json({
      filename: req.file.filename,
      width: metadata.width,
      height: metadata.height
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Error processing upload: ' + error.message });
  }
});

// Validation middleware for export endpoint
const validateExport = [
  body('annotations').isArray(),
  body('imageData').isObject(),
  body('imageData.filename').isString(),
  body('imageData.width').isInt({ min: 1 }),
  body('imageData.height').isInt({ min: 1 }),
  body('sceneId').isString()
];

app.post('/api/export', validateExport, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { annotations, imageData, sceneId } = req.body;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const exportDir = path.join('annotations', timestamp);
    
    await fs.mkdir(exportDir, { recursive: true });
    
    // Sanitize and validate file paths
    const sanitizedSceneId = sceneId.replace(/[^a-zA-Z0-9-_]/g, '');
    const sanitizedFilename = imageData.filename.replace(/[^a-zA-Z0-9-_.]/g, '');
    
    // Save metadata
    const metadata = {
      scene_id: sanitizedSceneId,
      timestamp: timestamp,
      image_size: {
        width: imageData.width,
        height: imageData.height
      },
      annotations: annotations
    };
    
    await fs.writeFile(
      path.join(exportDir, `${sanitizedSceneId}.json`),
      JSON.stringify(metadata, null, 2)
    );
    
    // Validate source file exists before copying
    const sourcePath = path.join('uploads', sanitizedFilename);
    try {
      await fs.access(sourcePath);
    } catch (error) {
      throw new Error('Source file not found');
    }
    
    // Copy original and annotated images
    await fs.copyFile(
      sourcePath,
      path.join(exportDir, `${sanitizedSceneId}_original${path.extname(sanitizedFilename)}`)
    );
    
    res.json({
      success: true,
      exportPath: exportDir
    });
  } catch (error) {
    console.error('Error exporting annotations:', error);
    res.status(500).json({ error: 'Error exporting annotations: ' + error.message });
  }
});

// Serve static files
app.use('/uploads', express.static('uploads'));
app.use('/annotations', express.static('annotations'));

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 