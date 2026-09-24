const express = require('express');
const router = express.Router({ mergeParams: true });
const alertController = require('../controllers/alertController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { verifyTenantAccess } = require('../middleware/tenantMiddleware');

router.use(authenticateToken);
router.use(verifyTenantAccess);

router.get('/alerts', alertController.getAlerts.bind(alertController));
router.put('/alerts/:alertId', alertController.updateAlert.bind(alertController));
router.put('/alerts/:alertId/ack', alertController.acknowledgeAlert.bind(alertController));
router.put('/alerts/:alertId/resolve', alertController.resolveAlert.bind(alertController));

router.get('/violations', alertController.getViolations.bind(alertController));
router.post('/completed-tasks', alertController.createCompletedTask.bind(alertController));
router.get('/completed-tasks', alertController.getCompletedTasks.bind(alertController));

module.exports = router;
