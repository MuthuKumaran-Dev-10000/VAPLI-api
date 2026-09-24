const tankRepository = require('../repositories/tankRepository');
const logger = require('../utils/logger');

class TankService {
  async getTankTree(clientId) {
    const nodes = await tankRepository.getTreeNodes(clientId);
    return nodes;
  }

  async getTanks(clientId) {
    return await tankRepository.getTanks(clientId);
  }

  async getTankById(clientId, tankId) {
    const tank = await tankRepository.getTankById(clientId, tankId);
    if (!tank) {
      throw { statusCode: 404, code: 'TANK_NOT_FOUND', message: `Tank '${tankId}' not found for client '${clientId}'` };
    }
    return tank;
  }

  async getTankParameters(clientId, tankId) {
    await this.getTankById(clientId, tankId);
    return await tankRepository.getTankParameters(clientId, tankId);
  }

  async createTank(clientId, tankData) {
    if (!tankData.tank_code || !tankData.tank_name) {
      throw { statusCode: 400, code: 'INVALID_INPUT', message: 'tank_code and tank_name are required' };
    }
    const id = tankData.id || 'tank_' + Date.now();
    await tankRepository.createTank({ ...tankData, id, client_id: clientId });
    return await this.getTankById(clientId, id);
  }

  async updateTank(clientId, tankId, updates) {
    await this.getTankById(clientId, tankId);
    await tankRepository.updateTank(clientId, tankId, updates);
    return await this.getTankById(clientId, tankId);
  }

  async deleteTank(clientId, tankId) {
    await this.getTankById(clientId, tankId);
    await tankRepository.deleteTank(clientId, tankId);
    return { success: true };
  }

  async saveTreeNode(clientId, nodeData) {
    const id = nodeData.id || 'node_' + Date.now();
    await tankRepository.saveTreeNode({ ...nodeData, id, client_id: clientId });
    return { success: true, id };
  }

  async deleteTreeNode(clientId, nodeId) {
    await tankRepository.deleteTreeNode(clientId, nodeId);
    return { success: true };
  }
}

module.exports = new TankService();
