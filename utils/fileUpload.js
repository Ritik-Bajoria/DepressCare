const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/prescriptions');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'prescription-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Enhanced file filter with better validation
const fileFilter = (req, file, cb) => {
  // Check MIME type and file extension
  const isPDF = file.mimetype === 'application/pdf' && 
                path.extname(file.originalname).toLowerCase() === '.pdf';
  
  if (isPDF) {
    cb(null, true);
  } else {
    // Create error with consistent format
    const error = new Error('Invalid file format. Only PDF files are accepted.');
    error.status = 400;
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only allow single file upload
  }
});

// Error handling middleware
const handleUploadErrors = (err, req, res, next) => {
  if (err) {
    // Handle Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (err.code === 'INVALID_FILE_TYPE' || err.message.includes('PDF')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Only PDF files are accepted.'
      });
    }
    // Other Multer errors
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message
      });
    }
    // Generic errors
    return res.status(500).json({
      success: false,
      message: 'An error occurred during file upload'
    });
  }
  next();
};

module.exports = {
  upload,
  handleUploadErrors
};