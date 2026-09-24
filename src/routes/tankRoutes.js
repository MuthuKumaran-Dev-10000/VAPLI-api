const express = require('express');
const router = express.Router({ mergeParams: true });
const tankController = require('../controllers/tankController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { verifyTenantAccess } = require('../middleware/tenantMiddleware');

router.use(authenticateToken);
router.use(verifyTenantAccess);

router.get('/tank-tree', tankController.getTankTree.bind(tankController));
router.post('/tank-tree', tankController.saveTreeNode.bind(tankController));
router.delete('/tank-tree/:nodeId', tankController.deleteTreeNode.bind(tankController));

router.get('/tanks', tankController.getTanks.bind(tankController));
router.post('/tanks', tankController.createTank.bind(tankController));
router.get('/tanks/:tankId', tankController.getTankById.bind(tankController));
router.put('/tanks/:tankId', tankController.updateTank.bind(tankController));
router.delete('/tanks/:tankId', tankController.deleteTank.bind(tankController));

router.get('/tanks/:tankId/parameters', tankController.getTankParameters.bind(tankController));

module.exports = router;
