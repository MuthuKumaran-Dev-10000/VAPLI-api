const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { successResponse } = require('../../core/response');

// Ensure uploads/qr directory exists
const uploadDir = path.join(__dirname, '../../../uploads/qr');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const assetId = (req.body.asset_id || req.query.asset_id || '').toString().trim().replaceAll(/[^a-zA-Z0-9_-]/g, '');
    const assetName = (req.body.asset_name || req.query.asset_name || '').toString().trim().replaceAll(/[^a-zA-Z0-9_-]/g, '_');
    
    let filename;
    if (assetId && assetName) {
      filename = `${assetId}_${assetName}.png`;
    } else if (assetId) {
      filename = `${assetId}.png`;
    } else if (assetName) {
      filename = `${assetName}.png`;
    } else {
      filename = `qr_${Date.now()}.png`;
    }
    
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post('/qr', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No image file uploaded' } });
    }
    
    const host = req.get('host') || '127.0.0.1:3000';
    const protocol = req.protocol || 'http';
    const relativePath = `/uploads/qr/${req.file.filename}`;
    const fullUrl = `${protocol}://${host}${relativePath}`;
    
    console.log(`[UPLOADS] Saved QR image to ${req.file.path} → ${fullUrl}`);
    
    return successResponse(res, {
      url: fullUrl,
      path: relativePath,
      filename: req.file.filename,
      size: req.file.size
    }, 201);
  } catch (e) {
    next(e);
  }
});

router.delete('/qr', (req, res, next) => {
  try {
    const { url, filename } = req.body || {};
    let targetFile = filename;
    if (!targetFile && url) {
      const parts = url.split('/');
      targetFile = parts[parts.length - 1];
    }
    if (targetFile) {
      const safeFilename = path.basename(targetFile);
      const filePath = path.join(uploadDir, safeFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[UPLOADS] Deleted QR image ${filePath}`);
      }
    }
    return successResponse(res, { message: 'Image deleted successfully' }, 200);
  } catch (e) {
    next(e);
  }
});

// Readings upload handler
const readingsBaseDir = path.join(__dirname, '../../../uploads/readings');
if (!fs.existsSync(readingsBaseDir)) {
  fs.mkdirSync(readingsBaseDir, { recursive: true });
}
['violation_image', 'auto_capture_image', 'manual_capture_image'].forEach(cat => {
  const catDir = path.join(readingsBaseDir, cat);
  if (!fs.existsSync(catDir)) {
    fs.mkdirSync(catDir, { recursive: true });
  }
});

const readingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let category = (req.body.category || req.query.category || 'manual_capture_image')
      .toString().trim().replaceAll(/[^a-zA-Z0-9_-]/g, '_');
    if (!category) category = 'manual_capture_image';
    const destDir = path.join(readingsBaseDir, category);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const defaultDateStr = `${dd}_${mm}_${yyyy}`;

    const dateStr = (req.body.date_str || req.query.date_str || defaultDateStr)
      .toString().trim().replaceAll(/[^a-zA-Z0-9_-]/g, '_');
    const assetId = (req.body.asset_id || req.query.asset_id || 'noasset')
      .toString().trim().replaceAll(/[^a-zA-Z0-9_-]/g, '');
    const readingId = (req.body.reading_id || req.query.reading_id || 'noreading')
      .toString().trim().replaceAll(/[^a-zA-Z0-9_-]/g, '');
    const imageId = (req.body.image_id || req.query.image_id || Date.now())
      .toString().trim().replaceAll(/[^a-zA-Z0-9_-]/g, '');

    const ext = path.extname(file.originalname) || '.png';
    const filename = `${dateStr}_${assetId}_${readingId}_${imageId}${ext}`;
    cb(null, filename);
  }
});

const uploadReading = multer({
  storage: readingStorage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

router.post('/readings', uploadReading.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No image file uploaded' } });
    }

    let category = (req.body.category || req.query.category || 'manual_capture_image')
      .toString().trim().replaceAll(/[^a-zA-Z0-9_-]/g, '_');
    if (!category) category = 'manual_capture_image';

    const paramId = (req.body.param_id || req.query.param_id || req.body.image_id || '').toString();

    const host = req.get('host') || '127.0.0.1:3000';
    const protocol = req.protocol || 'http';
    const relativePath = `/uploads/readings/${category}/${req.file.filename}`;
    const fullUrl = `${protocol}://${host}${relativePath}`;

    console.log(`[UPLOADS] Saved reading image → ${fullUrl}`);

    return successResponse(res, {
      url: fullUrl,
      path: relativePath,
      filename: req.file.filename,
      category: category,
      param_id: paramId,
      size: req.file.size
    }, 201);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
