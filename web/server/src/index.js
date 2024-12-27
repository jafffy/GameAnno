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
const archiver = require('archiver');

const app = express();
const port = process.env.PORT || 5000;
const API_URL = process.env.API_URL || `http://localhost:${port}`;

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
  methods: ['GET', 'POST', 'DELETE'],
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
    
    // Resize the image and get metadata
    const metadata = await sharp(req.file.path)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFile(path.join(UPLOADS_DIR, resizedFilename))
      .then(() => sharp(path.join(UPLOADS_DIR, resizedFilename)).metadata());

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
      filename: resizedFilename,
      width: metadata.width,
      height: metadata.height,
      url: `${API_URL}/uploads/${resizedFilename}`
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validation middleware for export endpoint
const validateExport = [
  body('filename').isString().notEmpty()
];

app.post('/api/export', validateExport, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    // Create a timestamp for the export directory
    const timestamp = new Date().toISOString().slice(0,19).replace(/[:]/g, '');
    const exportDir = path.join(__dirname, '..', '..', '..', 'exports', timestamp);
    await fsPromises.mkdir(exportDir, { recursive: true });

    // Create a write stream for the ZIP file
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    const zipPath = path.join(exportDir, 'export.zip');
    const output = fs.createWriteStream(zipPath);

    // Listen for archive errors
    archive.on('error', (err) => {
      throw err;
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add original image
    const imagePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(imagePath)) {
      archive.file(imagePath, { name: 'original.png' });
    }

    // Add annotations
    const annotationsPath = path.join(ANNOTATIONS_DIR, 'current', `${filename.replace(path.extname(filename), '')}.json`);
    if (fs.existsSync(annotationsPath)) {
      const annotationsData = await fsPromises.readFile(annotationsPath, 'utf8');
      const annotations = JSON.parse(annotationsData);

      // Create annotated image
      const image = await sharp(imagePath);
      const metadata = await image.metadata();
      const { width, height } = metadata;

      const svgBuffer = Buffer.from(`
        <svg width="${width}" height="${height}">
          ${annotations.annotations.map(ann => {
            const [x1, y1, x2, y2] = ann.coordinates;
            return `<rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" 
                     fill="none" stroke="red" stroke-width="2"/>`;
          }).join('')}
        </svg>
      `);

      const annotatedImageBuffer = await sharp(imagePath)
        .composite([{
          input: svgBuffer,
          top: 0,
          left: 0,
        }])
        .toBuffer();

      // Add annotated image to archive
      archive.append(annotatedImageBuffer, { name: 'annotated.png' });
      
      // Add annotations JSON
      archive.append(JSON.stringify(annotations, null, 2), { name: 'annotations.json' });
    }

    // Finalize the archive
    await archive.finalize();

    // Wait for the output stream to finish
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });

    // Send the zip file
    res.download(zipPath, `export_${timestamp}.zip`, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        // Clean up the export directory on error
        fs.rm(exportDir, { recursive: true }, (rmErr) => {
          if (rmErr) console.error('Error cleaning up export directory:', rmErr);
        });
      } else {
        // Clean up the export directory after successful download
        fs.rm(exportDir, { recursive: true }, (rmErr) => {
          if (rmErr) console.error('Error cleaning up export directory:', rmErr);
        });
      }
    });
  } catch (error) {
    console.error('Error in export:', error);
    res.status(500).json({ error: 'Failed to create export' });
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

// Get all images
app.get('/api/images', async (req, res) => {
  try {
    const files = await fsPromises.readdir(UPLOADS_DIR);
    const images = [];

    for (const file of files) {
      if (file.startsWith('resized-file-')) {
        try {
          const stats = await fsPromises.stat(path.join(UPLOADS_DIR, file));
          const metadata = await sharp(path.join(UPLOADS_DIR, file)).metadata();
          
          images.push({
            filename: file,
            url: `${API_URL || `http://localhost:${port}`}/uploads/${file}`,
            width: metadata.width,
            height: metadata.height,
            lastModified: stats.mtime
          });
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
        }
      }
    }

    // Sort by last modified, newest first
    images.sort((a, b) => b.lastModified - a.lastModified);
    
    res.json(images);
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ error: 'Error listing images' });
  }
});

// Delete an image and its annotations
app.delete('/api/images/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Delete the image file
    const imagePath = path.join(UPLOADS_DIR, filename);
    await fsPromises.unlink(imagePath);
    
    // Delete the annotations file
    const baseFilename = filename.replace(/\.[^/.]+$/, "");
    let annotationsPath = path.join(ANNOTATIONS_DIR, 'current', `${baseFilename}.json`);
    
    // If not found and filename starts with 'resized-', try without the prefix
    if (!fs.existsSync(annotationsPath) && filename.startsWith('resized-')) {
      const originalBasename = filename.replace('resized-', '').replace(/\.[^/.]+$/, "");
      annotationsPath = path.join(ANNOTATIONS_DIR, 'current', `${originalBasename}.json`);
    }

    try {
      if (fs.existsSync(annotationsPath)) {
        await fsPromises.unlink(annotationsPath);
        console.log('Annotations file deleted:', annotationsPath);
      } else {
        console.log('No annotations file found to delete');
      }
    } catch (error) {
      console.error('Error deleting annotations file:', error);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Error deleting image' });
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