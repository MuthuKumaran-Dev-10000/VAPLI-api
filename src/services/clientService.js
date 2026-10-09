const clientRepository = require('../repositories/clientRepository');
const tankRepository = require('../repositories/tankRepository');
const dashboardRepository = require('../repositories/dashboardRepository');
const logger = require('../utils/logger');

const SYSTEM_KEYS = [
  'alerts',
  'completed_tasks',
  'dashboard_stats',
  'readings',
  'system_settings',
  'tank_tree',
  'tanks'
];

class ClientService {
  async getClients() {
    const all = await clientRepository.findAll();
    return all.filter(c => !SYSTEM_KEYS.includes(c.id) && !SYSTEM_KEYS.includes(c.db_key));
  }

  async getClientById(clientId) {
    const client = await clientRepository.findById(clientId);
    if (!client) {
      throw { statusCode: 404, code: 'CLIENT_NOT_FOUND', message: `Client '${clientId}' not found` };
    }
    return client;
  }

  async bootstrapTenant(clientId) {
    logger.debug(`Bootstrapping tenant state for client: ${clientId}`);
    const client = await this.getClientById(clientId);
    const meta = await clientRepository.getMeta(client.id);
    const settings = await clientRepository.getSettings(client.id);
    const systemSettings = await clientRepository.getSystemSettings(client.id);
    const treeNodes = await tankRepository.getTreeNodes(client.id);
    const tanks = await tankRepository.getTanks(client.id);
    const dashboardStats = await dashboardRepository.getDashboardStats(client.id);

    return {
      client,
      meta,
      settings,
      systemSettings,
      treeNodes,
      tanks,
      dashboardStats
    };
  }

  async createClient(data) {
    if (!data.name) {
      throw { statusCode: 400, code: 'INVALID_INPUT', message: 'Client name is required' };
    }
    let dbKey = (data.db_key || data.name).toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    if (!dbKey) dbKey = 'client_' + Date.now();

    const existing = await clientRepository.findById(dbKey);
    if (existing) {
      dbKey = `${dbKey}_${Date.now().toString().slice(-4)}`;
    }

    const id = data.id || 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    await clientRepository.create({ ...data, id, db_key: dbKey });

    // Ensure client has default admin user with privileges_json created
    const userRepository = require('../repositories/userRepository');
    const adminUsername = `${dbKey}admin`;
    const existingUser = await userRepository.findByUsername(adminUsername);
    if (!existingUser) {
      const crypto = require('../utils/crypto');
      const hash = await crypto.hashPassword('Admin123');
      await userRepository.create({
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        username: adminUsername,
        password_hash: hash,
        display_name: `${data.name} Admin`,
        role: 'admin',
        client_id: id,
        client_ids: [id],
        is_active: 1
      });
    }

    return await this.getClientById(id);
  }

  async updateClient(clientId, updates) {
    await this.getClientById(clientId);
    await clientRepository.update(clientId, updates);
    return await this.getClientById(clientId);
  }

  async deleteClient(clientId) {
    await this.getClientById(clientId);
    await clientRepository.delete(clientId);
  }

  /**
   * Upsert one client_settings row. Supports nested keys with slashes
   * (e.g. report_format/param_colors/foo merges into report_format JSON).
   */
  async updateClientSetting(clientId, key, value) {
    await this.getClientById(clientId);
    if (!key || typeof key !== 'string') {
      throw { statusCode: 400, code: 'INVALID_INPUT', message: 'Setting key is required' };
    }
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      throw { statusCode: 400, code: 'INVALID_INPUT', message: 'Setting key is required' };
    }

    if (trimmedKey.includes('/')) {
      const parts = trimmedKey.split('/').filter(Boolean);
      const rootKey = parts[0];
      const settings = await clientRepository.getSettings(clientId);
      let root = settings[rootKey];
      if (root && typeof root === 'string') {
        try {
          root = JSON.parse(root);
        } catch (_) {
          root = {};
        }
      }
      if (!root || typeof root !== 'object' || Array.isArray(root)) {
        root = {};
      }
      let cursor = root;
      for (let i = 1; i < parts.length - 1; i++) {
        const seg = parts[i];
        if (!cursor[seg] || typeof cursor[seg] !== 'object' || Array.isArray(cursor[seg])) {
          cursor[seg] = {};
        }
        cursor = cursor[seg];
      }
      cursor[parts[parts.length - 1]] = value;
      await clientRepository.setSetting(clientId, rootKey, root);
      return { key: rootKey, value: root };
    }

    await clientRepository.setSetting(clientId, trimmedKey, value);
    return { key: trimmedKey, value };
  }
}

module.exports = new ClientService();
