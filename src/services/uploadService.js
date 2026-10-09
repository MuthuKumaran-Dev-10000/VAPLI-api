const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

function resolvePublicBaseUrl(requestOrigin) {
  const env = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const isLoopback =
    !env ||
    env.includes('127.0.0.1') ||
    env.includes('localhost');
  if (!isLoopback) {
    return env;
  }
  const fromRequest = (requestOrigin || '').replace(/\/$/, '');
  if (fromRequest) {
    return fromRequest;
  }
  return env || 'http://127.0.0.1:8081';
}

class UploadService {
  async processUploadedFile(file, clientDbKey = 'global', category = 'general', requestOrigin = '') {
    if (!file) {
      throw { statusCode: 400, code: 'NO_FILE', message: 'No file was uploaded' };
    }

    const uploadRoot = process.env.UPLOAD_ROOT || './uploads';
    const validCategory = (category || 'general').replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
    const targetDir = path.join(uploadRoot, validCategory);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.png';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const targetPath = path.join(targetDir, fileName);

    fs.renameSync(file.path, targetPath);

    const relativePath = path.relative(uploadRoot, targetPath).replace(/\\/g, '/');
    const baseUrl = resolvePublicBaseUrl(requestOrigin);
    const publicUrl = `${baseUrl}/uploads/${relativePath}`;

    logger.info(`File uploaded successfully to ${validCategory}: ${fileName} (${publicUrl})`);

    return {
      fileName,
      relativePath,
      url: publicUrl,
      secure_url: publicUrl,
      size: file.size,
      mimeType: file.mimetype
    };
  }
}

module.exports = new UploadService();
