const assetsService = require('./assets.service');
const { successResponse } = require('../../core/response');
const auditService = require('../audit/audit.service');

class AssetsController {
  // Nodes
  async getNodesController(req, res, next) {
    try {
      const parentId = req.query.parent_id !== undefined ? (req.query.parent_id === 'null' ? null : req.query.parent_id) : undefined;
      let nodes;
      if (req.query.all === 'true') {
        nodes = await assetsService.getAllNodes();
      } else {
        nodes = await assetsService.getNodes(parentId !== undefined ? parentId : null);
      }
      return successResponse(res, { nodes }, 200);
    } catch (e) {
      next(e);
    }
  }

  async createNodeController(req, res, next) {
    try {
      const node = await assetsService.createNode(req.body);
      await auditService.logAction({
        req,
        entityType: 'tank_node',
        entityId: node.id,
        operation: 'create',
        afterState: node
      });
      return successResponse(res, { node }, 201);
    } catch (e) {
      next(e);
    }
  }

  async updateNodeController(req, res, next) {
    try {
      const before = await assetsService.getNodeById(req.params.id);
      const node = await assetsService.updateNode(req.params.id, req.body);
      await auditService.logAction({
        req,
        entityType: 'tank_node',
        entityId: req.params.id,
        operation: 'update',
        beforeState: before,
        afterState: node
      });
      return successResponse(res, { node }, 200);
    } catch (e) {
      next(e);
    }
  }

  async deleteNodeController(req, res, next) {
    try {
      const before = await assetsService.getNodeById(req.params.id);
      await assetsService.deleteNode(req.params.id);
      await auditService.logAction({
        req,
        entityType: 'tank_node',
        entityId: req.params.id,
        operation: 'delete',
        beforeState: before
      });
      return successResponse(res, { message: 'Node deleted successfully' }, 200);
    } catch (e) {
      next(e);
    }
  }

  // Tanks
  async getTanksController(req, res, next) {
    try {
      const tanks = await assetsService.getAllTanks();
      return successResponse(res, { tanks }, 200);
    } catch (e) {
      next(e);
    }
  }

  async getTankByIdController(req, res, next) {
    try {
      const tank = await assetsService.getTankById(req.params.id);
      if (!tank) return res.status(404).json({ success: false, error: { message: 'Tank not found' } });
      return successResponse(res, { tank }, 200);
    } catch (e) {
      next(e);
    }
  }

  async createTankController(req, res, next) {
    try {
      const tank = await assetsService.createTank(req.body);
      await auditService.logAction({
        req,
        entityType: 'tank',
        entityId: tank.id,
        operation: 'create',
        afterState: tank
      });
      return successResponse(res, { tank }, 201);
    } catch (e) {
      next(e);
    }
  }

  async updateTankController(req, res, next) {
    try {
      const before = await assetsService.getTankById(req.params.id);
      const tank = await assetsService.updateTank(req.params.id, req.body);
      await auditService.logAction({
        req,
        entityType: 'tank',
        entityId: req.params.id,
        operation: 'update',
        beforeState: before,
        afterState: tank
      });
      return successResponse(res, { tank }, 200);
    } catch (e) {
      next(e);
    }
  }

  async bulkUpdateTanksController(req, res, next) {
    try {
      const updates = req.body.tanks || [];
      const updatedTanks = [];
      for (const item of updates) {
        if (item.id) {
          const t = await assetsService.updateTank(item.id, item);
          updatedTanks.push(t);
        }
      }
      return successResponse(res, { tanks: updatedTanks, count: updatedTanks.length }, 200);
    } catch (e) {
      next(e);
    }
  }

  async deleteTankController(req, res, next) {
    try {
      const before = await assetsService.getTankById(req.params.id);
      await assetsService.deleteTank(req.params.id);
      await auditService.logAction({
        req,
        entityType: 'tank',
        entityId: req.params.id,
        operation: 'delete',
        beforeState: before
      });
      return successResponse(res, { message: 'Tank deleted successfully' }, 200);
    } catch (e) {
      next(e);
    }
  }

  // Templates
  async getTemplatesController(req, res, next) {
    try {
      const templates = await assetsService.getTemplates();
      return successResponse(res, { templates }, 200);
    } catch (e) {
      next(e);
    }
  }

  async createTemplateController(req, res, next) {
    try {
      const template = await assetsService.createTemplate(req.body);
      return successResponse(res, { template }, 201);
    } catch (e) {
      next(e);
    }
  }

  async deleteTemplateController(req, res, next) {
    try {
      await assetsService.deleteTemplate(req.params.id);
      return successResponse(res, { message: 'Template deleted' }, 200);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new AssetsController();
