const clientsService = require('./clients.service');
const { successResponse } = require('../../core/response');

async function listClientsController(req, res, next) {
  try {
    const clients = await clientsService.listClients(req.user);
    return successResponse(res, { clients }, 200);
  } catch (err) {
    next(err);
  }
}

async function listPublicClientsController(req, res, next) {
  try {
    const clients = await clientsService.listPublicClients();
    return successResponse(res, { clients }, 200);
  } catch (err) {
    next(err);
  }
}

async function getClientController(req, res, next) {
  try {
    const client = await clientsService.getClient(req.params.id, req.user);
    return successResponse(res, { client }, 200);
  } catch (err) {
    next(err);
  }
}

async function createClientController(req, res, next) {
  try {
    const client = await clientsService.createClient(req.body, req.user);
    return successResponse(res, { client }, 201);
  } catch (err) {
    next(err);
  }
}

async function updateClientController(req, res, next) {
  try {
    const client = await clientsService.updateClient(req.params.id, req.body, req.user);
    return successResponse(res, { client }, 200);
  } catch (err) {
    next(err);
  }
}

async function deleteClientController(req, res, next) {
  try {
    const result = await clientsService.deleteClient(req.params.id, req.user);
    return successResponse(res, result, 200);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listClientsController,
  listPublicClientsController,
  getClientController,
  createClientController,
  updateClientController,
  deleteClientController
};
