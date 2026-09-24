const userRepository = require('../repositories/userRepository');
const clientRepository = require('../repositories/clientRepository');
const logger = require('../utils/logger');

async function verifyTenantAccess(req, res, next) {
  try {
    const clientIdParam = req.params.clientId || req.headers['x-client-id'] || req.query.clientId;
    if (!clientIdParam) {
      logger.warn('Tenant access check failed: Missing client ID', { path: req.originalUrl });
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CLIENT_ID',
          message: 'Client ID parameter is required'
        }
      });
    }

    // Resolve client
    const client = await clientRepository.findById(clientIdParam);
    if (!client) {
      logger.warn('Tenant access check failed: Client not found', { clientId: clientIdParam });
      return res.status(404).json({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: `Requested client '${clientIdParam}' does not exist`
        }
      });
    }

    req.tenant = client;

    // Super admin bypasses client grant check
    if (req.user && (req.user.role === 'super admin' || req.user.role === 'superadmin' || req.user.role === 'admin')) {
      logger.debug('Super admin tenant access granted', { userId: req.user.userId, clientId: client.id });
      return next();
    }

    // Regular user must have active grant
    if (req.user && req.user.userId) {
      const userClients = await userRepository.getUserClients(req.user.userId);
      const hasAccess = userClients.some(c => c.id === client.id || c.db_key === client.db_key);
      if (!hasAccess) {
        logger.warn('Tenant access denied: User not granted access to client', { userId: req.user.userId, clientId: client.id });
        return res.status(403).json({
          success: false,
          error: {
            code: 'TENANT_ACCESS_DENIED',
            message: `User does not have authorization to access client '${client.name}'`
          }
        });
      }
    }

    next();
  } catch (err) {
    logger.error('Error during tenant access verification', { error: err.message, stack: err.stack });
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message
      }
    });
  }
}

module.exports = { verifyTenantAccess };
