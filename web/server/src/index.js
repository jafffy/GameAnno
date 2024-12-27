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
  origin: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '25mb' }));

// Define paths
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const ANNOTATIONS_DIR = path.join(__dirname, '..', 'annotations');
const DATA_DIR = path.join(__dirname, '..', 'data');
const CUSTOM_TAGS_FILE = path.join(DATA_DIR, 'custom_tags.json');

// Ensure required directories exist
const createRequiredDirectories = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(ANNOTATIONS_DIR, { recursive: true });
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('Required directories created successfully');
  } catch (err) {
    console.error('Error creating directories:', err);
  }
};

// Initialize or load custom tags
const initializeCustomTags = async () => {
  try {
    await fs.access(CUSTOM_TAGS_FILE);
    console.log('Custom tags file exists');
  } catch {
    console.log('Creating new custom tags file');
    try {
      // File doesn't exist, create it with default structure
      await fs.writeFile(CUSTOM_TAGS_FILE, JSON.stringify({
        categories: [],
        interaction_types: []
      }, null, 2));
      console.log('Custom tags file created successfully');
    } catch (err) {
      console.error('Error creating custom tags file:', err);
    }
  }
};

// Initialize server
const initializeServer = async () => {
  await createRequiredDirectories();
  await initializeCustomTags();
};

// Load custom tags
const loadCustomTags = async () => {
  try {
    const data = await fs.readFile(CUSTOM_TAGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading custom tags:', error);
    return { categories: [], interaction_types: [] };
  }
};

// Save custom tags
const saveCustomTags = async (tags) => {
  try {
    await fs.writeFile(CUSTOM_TAGS_FILE, JSON.stringify(tags, null, 2));
  } catch (error) {
    console.error('Error saving custom tags:', error);
    throw error;
  }
};

// Get custom tags
app.get('/api/custom-tags', async (req, res) => {
  try {
    const tags = await loadCustomTags();
    res.json(tags);
  } catch (error) {
    console.error('Error in GET /api/custom-tags:', error);
    res.status(500).json({ error: 'Error loading custom tags' });
  }
});

// Add new custom tag
app.post('/api/custom-tags', 
  body('type').isIn(['categories', 'interaction_types']),
  body('tag').isString().trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { type, tag } = req.body;
      const tags = await loadCustomTags();
      
      if (!tags[type].includes(tag)) {
        tags[type].push(tag);
        await saveCustomTags(tags);
      }
      
      res.json(tags);
    } catch (error) {
      console.error('Error in POST /api/custom-tags:', error);
      res.status(500).json({ error: 'Error adding custom tag' });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
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
  console.error('Error:', err);
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
      const resizedPath = path.join(UPLOADS_DIR, `resized-${req.file.filename}`);
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
    console.error('Error in POST /api/upload:', error);
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
    const exportDir = path.join(ANNOTATIONS_DIR, timestamp);
    
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
    const sourcePath = path.join(UPLOADS_DIR, sanitizedFilename);
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
    console.error('Error in POST /api/export:', error);
    res.status(500).json({ error: 'Error exporting annotations: ' + error.message });
  }
});

// Serve static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/annotations', express.static(ANNOTATIONS_DIR));

// Initialize and start server
initializeServer().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to initialize server:', err);
  process.exit(1);
}); 