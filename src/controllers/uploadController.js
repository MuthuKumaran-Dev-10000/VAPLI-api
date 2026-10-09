const uploadService = require('../services/uploadService');

class UploadController {
  async handleUpload(req, res, next) {
    try {
      const clientDbKey = req.body.clientDbKey || req.headers['x-client-db-key'] || 'global';
      const category = req.params.category || req.body.category || req.body.folder || 'general';
      const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
      const host = req.get('x-forwarded-host') || req.get('host') || '';
      const requestOrigin = host ? `${proto}://${host}` : '';
      const result = await uploadService.processUploadedFile(
        req.file,
        clientDbKey,
        category,
        requestOrigin,
      );
      res.json({ success: true, secure_url: result.url, url: result.url, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UploadController();
