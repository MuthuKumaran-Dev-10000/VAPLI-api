const crypto = require('crypto');
const clientsRepo = require('./clients.repository');
const { NotFoundError, BadRequestError, ConflictError } = require('../../core/errors');
const auditService = require('../audit/audit.service');

async function listClients(user) {
  const allClients = await clientsRepo.getAllClients();

  // Super Admin (rank 1) sees all clients
  if (user.roleRank === 1 || user.role === 'super admin') {
    return allClients;
  }

  // Admin (rank 2) / User sees only assigned clients
  const userClientIds = user.clientIds || [];
  return allClients.filter(c => userClientIds.includes(c.id));
}

async function listPublicClients() {
  const allClients = await clientsRepo.getAllClients();
  return allClients
    .filter(c => c.isActive !== false && c.is_active !== 0)
    .map(c => ({
      id: c.id,
      name: c.name,
      dbKey: c.dbKey || c.db_key || c.id,
      description: c.description || ''
    }));
}

async function getClient(id, user) {
  const client = await clientsRepo.getClientById(id);
  if (!client) {
    throw new NotFoundError(`Client with ID '${id}' not found`);
  }

  if (user.roleRank !== 1 && !user.clientIds.includes(id)) {
    throw new NotFoundError(`Client with ID '${id}' not found or unauthorized`);
  }

  return client;
}

async function createClient(data, actor) {
  if (!data.name || !data.name.trim()) {
    throw new BadRequestError('Client name is required');
  }

  const dbKey = (data.dbKey || data.name).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const existing = await clientsRepo.findClientByDbKey(dbKey);
  if (existing) {
    throw new ConflictError(`Client with database key '${dbKey}' already exists`);
  }

  const now = new Date().toISOString();
  const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const newClient = await clientsRepo.createClient({
    id,
    name: data.name.trim(),
    dbKey,
    description: data.description || '',
    rootFolderId: data.rootFolderId || null,
    createdAt: now,
    updatedAt: now
  });

  await auditService.logAudit({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    clientId: id,
    clientName: newClient.name,
    entityType: 'clients',
    entityId: id,
    operation: 'create_client',
    outcome: 'success',
    beforeState: null,
    afterState: newClient,
    details: { name: newClient.name, dbKey }
  });

  return newClient;
}

async function updateClient(id, data, actor) {
  const existing = await getClient(id, actor);

  const updated = await clientsRepo.updateClient(id, data);

  await auditService.logAudit({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    clientId: id,
    clientName: updated.name,
    entityType: 'clients',
    entityId: id,
    operation: 'update_client',
    outcome: 'success',
    beforeState: existing,
    afterState: updated,
    details: { changes: data }
  });

  return updated;
}

async function deleteClient(id, actor) {
  const existing = await getClient(id, actor);

  await clientsRepo.deleteClient(id);

  await auditService.logAudit({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    clientId: id,
    clientName: existing.name,
    entityType: 'clients',
    entityId: id,
    operation: 'delete_client',
    outcome: 'success',
    beforeState: existing,
    afterState: null
  });

  return { message: `Client '${existing.name}' deleted successfully` };
}

module.exports = {
  listClients,
  listPublicClients,
  getClient,
  createClient,
  updateClient,
  deleteClient
};
