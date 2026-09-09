const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const usersRepo = require('./users.repository');
const clientsRepo = require('../clients/clients.repository');
const { NotFoundError, BadRequestError, ConflictError, ForbiddenError } = require('../../core/errors');
const auditService = require('../audit/audit.service');

async function listUsers(actor) {
  const allUsers = await usersRepo.getAllUsers();
  const allClients = await clientsRepo.getAllClients();

  // Super Admin (rank 1): Sees all users grouped by client
  if (actor.roleRank === 1 || actor.role === 'super admin') {
    const clientsWithUsers = allClients.map(c => {
      const clientUsers = allUsers.filter(u => u.client_ids.includes(c.id));
      return {
        client: c,
        users: clientUsers
      };
    });

    // Users with no client assigned
    const unassignedUsers = allUsers.filter(u => !u.client_ids || u.client_ids.length === 0);
    if (unassignedUsers.length > 0) {
      clientsWithUsers.push({
        client: { id: 'unassigned', name: 'Unassigned Users', db_key: 'unassigned' },
        users: unassignedUsers
      });
    }

    return {
      groupedByClient: clientsWithUsers,
      allUsers
    };
  }

  // Admin (rank 2): Sees only users belonging to their assigned client scope
  const actorClientIds = actor.clientIds || [];
  const scopedUsers = allUsers.filter(u =>
    u.client_ids.some(cid => actorClientIds.includes(cid))
  );

  return {
    groupedByClient: actorClientIds.map(cid => {
      const c = allClients.find(client => client.id === cid) || { id: cid, name: 'Assigned Client' };
      return {
        client: c,
        users: scopedUsers.filter(u => u.client_ids.includes(cid))
      };
    }),
    allUsers: scopedUsers
  };
}

async function getUser(id, actor) {
  const user = await usersRepo.getUserById(id);
  if (!user) {
    throw new NotFoundError(`User with ID '${id}' not found`);
  }

  // Super Admin (rank 1) can view any user
  if (actor.roleRank === 1 || actor.role === 'super admin') {
    return user;
  }

  // Admin (rank 2) can view users in their client scope
  const hasCommonClient = (actor.clientIds || []).some(cid => user.client_ids.includes(cid));
  if (!hasCommonClient && actor.id !== user.id) {
    throw new ForbiddenError(`Access denied to user '${id}' outside assigned client scope`);
  }

  return user;
}

async function createUser(data, actor) {
  if (!data.username || !data.username.trim()) {
    throw new BadRequestError('Username is required');
  }
  if (!data.password || !data.password.trim()) {
    throw new BadRequestError('Password is required');
  }

  const existing = await usersRepo.findUserByUsername(data.username);
  if (existing) {
    throw new ConflictError(`Username '${data.username}' is already taken`);
  }

  const targetRoleName = (data.role || 'user').trim().toLowerCase();
  const targetRoleInfo = await usersRepo.getRoleIdByName(targetRoleName);

  // Authorization Check: Admin (rank 2) cannot create Super Admin (rank 1) or escalate role above actor
  if (targetRoleInfo.rank < actor.roleRank) {
    throw new ForbiddenError(`Cannot create user with higher role rank (${targetRoleInfo.rank}) than actor rank (${actor.roleRank})`);
  }

  let clientIds = data.clientIds || [];
  if (actor.roleRank > 1) {
    // Force client scope to actor's client scope
    clientIds = clientIds.filter(cid => (actor.clientIds || []).includes(cid));
    if (clientIds.length === 0 && actor.clientIds && actor.clientIds.length > 0) {
      clientIds = [actor.clientIds[0]];
    }
  }

  const now = new Date().toISOString();
  const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');

  const newUser = await usersRepo.createUser({
    id,
    username: data.username.trim(),
    fullName: data.fullName || data.username.trim(),
    passwordHash,
    roleId: targetRoleInfo.id,
    phone: data.phone || data.mobile || null,
    email: data.email || null,
    address: data.address || null,
    createdAt: now,
    updatedAt: now
  }, clientIds);

  await auditService.logAudit({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    clientId: clientIds[0] || null,
    entityType: 'users',
    entityId: id,
    operation: 'create_user',
    outcome: 'success',
    beforeState: null,
    afterState: newUser,
    details: { username: newUser.username, role: targetRoleName, clientIds }
  });

  return newUser;
}

async function updateUser(id, data, actor) {
  const existing = await getUser(id, actor);

  if (data.role) {
    const targetRoleInfo = await usersRepo.getRoleIdByName(data.role);
    if (targetRoleInfo.rank < actor.roleRank) {
      throw new ForbiddenError(`Cannot assign role rank (${targetRoleInfo.rank}) higher than actor rank (${actor.roleRank})`);
    }
    data.roleId = targetRoleInfo.id;
  }

  if (data.password) {
    data.passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');
  }

  const updated = await usersRepo.updateUser(id, data, data.clientIds);

  await auditService.logAudit({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    entityType: 'users',
    entityId: id,
    operation: 'update_user',
    outcome: 'success',
    beforeState: existing,
    afterState: updated,
    details: { changes: data }
  });

  return updated;
}

async function deleteUser(id, actor) {
  const existing = await getUser(id, actor);

  if (existing.role_rank < actor.roleRank) {
    throw new ForbiddenError(`Cannot delete user with higher role rank than actor`);
  }

  await usersRepo.deleteUser(id);

  await auditService.logAudit({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    entityType: 'users',
    entityId: id,
    operation: 'delete_user',
    outcome: 'success',
    beforeState: existing,
    afterState: null
  });

  return { message: `User '${existing.username}' deleted successfully` };
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
};
