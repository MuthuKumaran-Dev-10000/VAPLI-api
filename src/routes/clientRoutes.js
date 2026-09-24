const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { verifyTenantAccess } = require('../middleware/tenantMiddleware');

// Public route for client selector at login
router.get('/', clientController.getClients.bind(clientController));

// Protected routes
router.use(authenticateToken);
router.post('/', clientController.createClient.bind(clientController));

router.get('/:clientId', verifyTenantAccess, clientController.getClientById.bind(clientController));
router.put('/:clientId', verifyTenantAccess, clientController.updateClient.bind(clientController));
router.delete('/:clientId', verifyTenantAccess, clientController.deleteClient.bind(clientController));
router.get('/:clientId/bootstrap', verifyTenantAccess, clientController.bootstrap.bind(clientController));

module.exports = router;
