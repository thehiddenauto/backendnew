const multer = require('multer');
const path = require('path');

// Simple storage service with basic functionality
class StorageService {
  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET || 'influencore-uploads';
  }

  // Mock upload function
  async uploadFile(buffer, key, contentType, metadata = {}) {
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock URL
      const baseUrl = process.env.AWS_S3_BUCKET_URL || 'https://your-bucket.s3.amazonaws.com';
      return `${baseUrl}/${key}`;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  // Mock S3 upload (for backward compatibility)
  async uploadToS3(buffer, key, contentType, metadata = {}) {
    return await this.uploadFile(buffer, key, contentType, metadata);
  }

  // Generate unique file key
  generateFileKey(userId, type, originalName) {
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `${type}/${userId}/${timestamp}_${sanitizedName}${extension}`;
  }

  // Mock storage stats
  async getUserStorageStats(userId) {
    return {
      totalSize: 0,
      fileCount: 0,
      provider: 'mock'
    };
  }
}

// Multer configuration for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3'
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 5
  }
});

// Create singleton instance
const storageService = new StorageService();

// Export functions
const uploadFile = async (buffer, key, contentType, metadata) => {
  return await storageService.uploadFile(buffer, key, contentType, metadata);
};

const uploadToS3 = async (buffer, key, contentType, metadata) => {
  return await storageService.uploadToS3(buffer, key, contentType, metadata);
};

const generateFileKey = (userId, type, originalName) => {
  return storageService.generateFileKey(userId, type, originalName);
};

const getUserStorageStats = async (userId) => {
  return await storageService.getUserStorageStats(userId);
};

module.exports = {
  upload,
  uploadFile,
  uploadToS3,
  generateFileKey,
  getUserStorageStats,
  StorageService
};
