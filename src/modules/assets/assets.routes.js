const express = require('express');
const router = express.Router();
const assetsController = require('./assets.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

router.use(authMiddleware);

// Nodes (Tree)
router.get('/nodes', assetsController.getNodesController);
router.post('/nodes', assetsController.createNodeController);
router.patch('/nodes/:id', assetsController.updateNodeController);
router.delete('/nodes/:id', assetsController.deleteNodeController);

// Tanks (Assets)
router.get('/tanks', assetsController.getTanksController);
router.get('/tanks/:id', assetsController.getTankByIdController);
router.post('/tanks', assetsController.createTankController);
router.patch('/tanks/:id', assetsController.updateTankController);
router.post('/tanks/bulk-update', assetsController.bulkUpdateTanksController);
router.delete('/tanks/:id', assetsController.deleteTankController);

// Templates
router.get('/templates', assetsController.getTemplatesController);
router.post('/templates', assetsController.createTemplateController);
router.delete('/templates/:id', assetsController.deleteTemplateController);

module.exports = router;
