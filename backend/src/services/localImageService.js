const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { itemsDir, categoriesDir, tempDir } = require('../config/localStorage');

class LocalImageService {
  constructor() {
    this.baseUrl = process.env.BASE_URL || '';
  }

  async processAndSaveImage(file, uploadType = 'items') {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      const targetDir = uploadType === 'categories' ? categoriesDir : itemsDir;
      const filename = file.filename;
      const finalPath = path.join(targetDir, filename);
      
      // Create a temporary file path for processing
      const tempFilename = `temp_${Date.now()}_${filename}`;
      const tempPath = path.join(tempDir, tempFilename);
      
      // Process image with sharp for optimization
      await sharp(file.path)
        .resize(800, 600, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85 })
        .toFile(tempPath);
      
      // Move processed file to final destination
      if (fs.existsSync(tempPath)) {
        fs.renameSync(tempPath, finalPath);
      }
      
      // Remove original temporary file if it exists and is different
      if (fs.existsSync(file.path) && file.path !== finalPath) {
        fs.unlinkSync(file.path);
      }

      const imageUrl = `/uploads/${uploadType}/${filename}`;
      
      return {
        success: true,
        imageUrl,
        filename,
        size: fs.statSync(finalPath).size
      };
    } catch (error) {
      console.error('Error processing image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteImage(imageUrl) {
    try {
      if (!imageUrl) {
        return { success: true };
      }

      // Extract filename from URL
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const uploadType = urlParts[urlParts.length - 2];
      
      const targetDir = uploadType === 'categories' ? categoriesDir : itemsDir;
      const filePath = path.join(targetDir, filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getImagePath(imageUrl) {
    if (!imageUrl) return null;
    
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const uploadType = urlParts[urlParts.length - 2];
    
    const targetDir = uploadType === 'categories' ? categoriesDir : itemsDir;
    return path.join(targetDir, filename);
  }

  imageExists(imageUrl) {
    const imagePath = this.getImagePath(imageUrl);
    return imagePath && fs.existsSync(imagePath);
  }
}

module.exports = new LocalImageService();