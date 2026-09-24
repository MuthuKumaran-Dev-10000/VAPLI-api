const express = require('express');
const router = express.Router({ mergeParams: true });
const readingController = require('../controllers/readingController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { verifyTenantAccess } = require('../middleware/tenantMiddleware');

router.use(authenticateToken);
router.use(verifyTenantAccess);

router.get('/readings', readingController.getReadings.bind(readingController));
router.get('/tanks/:tankId/readings', readingController.getReadings.bind(readingController));
router.get('/tanks/:tankId/readings/last', readingController.getLastReading.bind(readingController));
router.get('/tanks/:tankId/parameters/:parameterId/previous', readingController.getPreviousCapture.bind(readingController));
router.post('/tanks/:tankId/readings', readingController.submitReading.bind(readingController));

module.exports = router;
