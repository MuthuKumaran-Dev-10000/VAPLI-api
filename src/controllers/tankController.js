const tankService = require('../services/tankService');

class TankController {
  async getTankTree(req, res, next) {
    try {
      const tree = await tankService.getTankTree(req.params.clientId);
      res.json({ success: true, data: tree });
    } catch (err) {
      next(err);
    }
  }

  async getTanks(req, res, next) {
    try {
      const tanks = await tankService.getTanks(req.params.clientId);
      res.json({ success: true, data: tanks });
    } catch (err) {
      next(err);
    }
  }

  async getTankById(req, res, next) {
    try {
      const tank = await tankService.getTankById(req.params.clientId, req.params.tankId);
      res.json({ success: true, data: tank });
    } catch (err) {
      next(err);
    }
  }

  async getTankParameters(req, res, next) {
    try {
      const params = await tankService.getTankParameters(req.params.clientId, req.params.tankId);
      res.json({ success: true, data: params });
    } catch (err) {
      next(err);
    }
  }

  async createTank(req, res, next) {
    try {
      const tank = await tankService.createTank(req.params.clientId, req.body);
      res.status(201).json({ success: true, data: tank });
    } catch (err) {
      next(err);
    }
  }

  async updateTank(req, res, next) {
    try {
      const tank = await tankService.updateTank(req.params.clientId, req.params.tankId, req.body);
      res.json({ success: true, data: tank });
    } catch (err) {
      next(err);
    }
  }

  async deleteTank(req, res, next) {
    try {
      const result = await tankService.deleteTank(req.params.clientId, req.params.tankId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async saveTreeNode(req, res, next) {
    try {
      const result = await tankService.saveTreeNode(req.params.clientId, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async deleteTreeNode(req, res, next) {
    try {
      const result = await tankService.deleteTreeNode(req.params.clientId, req.params.nodeId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TankController();
