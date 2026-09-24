const express = require('express');
const router = express.Router({ mergeParams: true });
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { verifyTenantAccess } = require('../middleware/tenantMiddleware');

router.use(authenticateToken);
router.use(verifyTenantAccess);

router.get('/dashboard/stats', dashboardController.getDashboardStats.bind(dashboardController));
router.get('/dashboard/trends', dashboardController.getDashboardTrends.bind(dashboardController));

module.exports = router;
