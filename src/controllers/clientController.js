const clientService = require('../services/clientService');

class ClientController {
  async getClients(req, res, next) {
    try {
      const clients = await clientService.getClients();
      res.json({ success: true, data: clients });
    } catch (err) {
      next(err);
    }
  }

  async getClientById(req, res, next) {
    try {
      const client = await clientService.getClientById(req.params.clientId);
      res.json({ success: true, data: client });
    } catch (err) {
      next(err);
    }
  }

  async bootstrap(req, res, next) {
    try {
      const data = await clientService.bootstrapTenant(req.params.clientId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createClient(req, res, next) {
    try {
      const client = await clientService.createClient(req.body);
      res.status(201).json({ success: true, data: client });
    } catch (err) {
      next(err);
    }
  }

  async updateClient(req, res, next) {
    try {
      const client = await clientService.updateClient(req.params.clientId, req.body);
      res.json({ success: true, data: client });
    } catch (err) {
      next(err);
    }
  }

  async deleteClient(req, res, next) {
    try {
      await clientService.deleteClient(req.params.clientId);
      res.json({ success: true, message: 'Client deleted' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClientController();
