const express = require('express');
const router = express.Router();
const clientsController = require('./clients.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { requireRole, requirePermission, enforceClientScope } = require('../../middleware/rbac.middleware');

router.get('/public', clientsController.listPublicClientsController);

router.use(authMiddleware);

router.get('/', requirePermission('view_admin_clients'), clientsController.listClientsController);
router.get('/:id', enforceClientScope, clientsController.getClientController);
router.post('/', requireRole(1), requirePermission('create_client'), clientsController.createClientController);
router.patch('/:id', requireRole(2), enforceClientScope, clientsController.updateClientController);
router.delete('/:id', requireRole(1), clientsController.deleteClientController);

module.exports = router;
