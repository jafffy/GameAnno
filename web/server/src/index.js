const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
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
    await fsPromises.mkdir(UPLOADS_DIR, { recursive: true });
    await fsPromises.mkdir(ANNOTATIONS_DIR, { recursive: true });
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
    console.log('Required directories created successfully');
  } catch (err) {
    console.error('Error creating directories:', err);
  }
};

// Initialize or load custom tags
const initializeCustomTags = async () => {
  try {
    await fsPromises.access(CUSTOM_TAGS_FILE);
    console.log('Custom tags file exists');
  } catch {
    console.log('Creating new custom tags file');
    try {
      // File doesn't exist, create it with default structure
      await fsPromises.writeFile(CUSTOM_TAGS_FILE, JSON.stringify({
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
    const data = await fsPromises.readFile(CUSTOM_TAGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading custom tags:', error);
    return { categories: [], interaction_types: [] };
  }
};

// Save custom tags
const saveCustomTags = async (tags) => {
  try {
    await fsPromises.writeFile(CUSTOM_TAGS_FILE, JSON.stringify(tags, null, 2));
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
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR)
  },
  filename: function (req, file, cb) {
    // Get the file extension
    const ext = path.extname(file.originalname);
    // Use a consistent name based on the original filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    cb(null, `file-${safeName}`);
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
    console.log('File uploaded:', req.file);
    
    // Get the original file extension
    const ext = path.extname(req.file.originalname);
    // Create consistent filename for the resized image
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const resizedFilename = `resized-file-${safeName}`;
    
    // Resize the image
    await sharp(req.file.path)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFile(path.join(UPLOADS_DIR, resizedFilename));

    // Create empty annotations file if it doesn't exist
    const annotationsPath = path.join(ANNOTATIONS_DIR, 'current', `${resizedFilename.replace(ext, '')}.json`);
    if (!fs.existsSync(path.dirname(annotationsPath))) {
      await fsPromises.mkdir(path.dirname(annotationsPath), { recursive: true });
    }
    
    if (!fs.existsSync(annotationsPath)) {
      const emptyAnnotations = {
        filename: resizedFilename,
        last_modified: new Date().toISOString(),
        annotations: []
      };
      await fsPromises.writeFile(annotationsPath, JSON.stringify(emptyAnnotations, null, 2));
      console.log('Created empty annotations file at:', annotationsPath);
    }

    // Delete the original uploaded file
    await fsPromises.unlink(req.file.path);

    res.json({ 
      success: true,
      filename: resizedFilename
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ success: false, error: error.message });
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
    
    await fsPromises.mkdir(exportDir, { recursive: true });
    
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
    
    await fsPromises.writeFile(
      path.join(exportDir, `${sanitizedSceneId}.json`),
      JSON.stringify(metadata, null, 2)
    );
    
    // Validate source file exists before copying
    const sourcePath = path.join(UPLOADS_DIR, sanitizedFilename);
    try {
      await fsPromises.access(sourcePath);
    } catch (error) {
      throw new Error('Source file not found');
    }
    
    // Copy original and annotated images
    await fsPromises.copyFile(
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

// Save annotations for a specific image
app.post('/api/annotations/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { annotations } = req.body;

    console.log('Received save request for:', filename);
    console.log('Annotations to save:', annotations);

    if (!annotations || !Array.isArray(annotations)) {
      console.log('Invalid annotations data received');
      return res.status(400).json({ error: 'Invalid annotations data' });
    }

    // Create annotations directory if it doesn't exist
    const annotationsDir = path.join(ANNOTATIONS_DIR, 'current');
    await fsPromises.mkdir(annotationsDir, { recursive: true });

    // Save annotations with metadata
    const annotationData = {
      filename,
      last_modified: new Date().toISOString(),
      annotations: annotations.map(anno => ({
        bounding_box_id: anno.bounding_box_id,
        coordinates: anno.coordinates,
        categories: anno.categories || [],
        is_interactive: anno.is_interactive || false,
        interaction_type: anno.interaction_type || [],
        notes: anno.notes || ''
      }))
    };

    // Remove any file extension and handle resized prefix
    const baseFilename = filename.replace(/\.[^/.]+$/, "");
    const annotationPath = path.join(annotationsDir, `${baseFilename}.json`);
    
    console.log('Saving annotations to:', annotationPath);
    console.log('Annotation data to save:', JSON.stringify(annotationData, null, 2));
    
    await fsPromises.writeFile(annotationPath, JSON.stringify(annotationData, null, 2));
    console.log('Successfully saved annotations');

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving annotations:', error);
    res.status(500).json({ error: 'Failed to save annotations' });
  }
});

// Get annotations for a specific image
app.get('/api/annotations/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log('Loading annotations for:', filename);
    
    // Remove any file extension and handle resized prefix
    const baseFilename = filename.replace(/\.[^/.]+$/, "");
    const annotationsPath = path.join(ANNOTATIONS_DIR, 'current', `${baseFilename}.json`);
    
    console.log('Looking for annotations at:', annotationsPath);

    try {
      const data = await fsPromises.readFile(annotationsPath, 'utf8');
      console.log('Found annotations file:', data);
      const parsedData = JSON.parse(data);
      console.log('Parsed annotations:', parsedData);
      res.json({ annotations: parsedData.annotations });
    } catch (error) {
      // If file not found with resized prefix, try without it
      if (error.code === 'ENOENT' && filename.startsWith('resized-')) {
        const originalFilename = filename.replace('resized-', '');
        const originalBasename = originalFilename.replace(/\.[^/.]+$/, "");
        const originalPath = path.join(ANNOTATIONS_DIR, 'current', `${originalBasename}.json`);
        
        try {
          const data = await fsPromises.readFile(originalPath, 'utf8');
          console.log('Found annotations in original file:', data);
          const parsedData = JSON.parse(data);
          console.log('Parsed annotations from original:', parsedData);
          return res.json({ annotations: parsedData.annotations });
        } catch (originalError) {
          console.log('Error reading original annotations:', originalError.code);
          return res.status(404).json({ message: 'No annotations found for this image' });
        }
      }
      
      console.log('Error reading annotations:', error.code);
      if (error.code === 'ENOENT') {
        res.status(404).json({ message: 'No annotations found for this image' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error loading annotations:', error);
    res.status(500).json({ error: 'Error loading annotations' });
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