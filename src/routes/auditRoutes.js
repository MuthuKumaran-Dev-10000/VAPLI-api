const express = require('express');
const router = express.Router({ mergeParams: true });
const auditController = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { verifyTenantAccess } = require('../middleware/tenantMiddleware');

router.use(authenticateToken);

router.get('/admin/audit-logs', auditController.getMasterLogs.bind(auditController));
router.get('/clients/:clientId/audit-logs', verifyTenantAccess, auditController.getTenantLogs.bind(auditController));
router.post('/clients/:clientId/audit-logs', verifyTenantAccess, auditController.createLog.bind(auditController));

module.exports = router;
