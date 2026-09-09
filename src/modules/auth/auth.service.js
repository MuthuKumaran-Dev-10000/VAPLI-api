const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepo = require('./auth.repository');
const { UnauthorizedError, BadRequestError } = require('../../core/errors');
const auditService = require('../audit/audit.service');

function hashVapliLegacyPassword(password) {
  const salt = 'LubeMonitor_Salt_2024_$ecure!';
  const salted = salt + ':' + password;
  const digest = crypto.createHash('sha256').update(salted).digest('hex');
  return crypto.createHash('sha256').update(digest + salt).digest('hex');
}

function verifyPassword(plainPassword, storedHash) {
  if (!storedHash) return false;

  // 1. Check legacy VAPLI salted double-SHA256 hash
  if (hashVapliLegacyPassword(plainPassword).toLowerCase() === storedHash.toLowerCase()) {
    return true;
  }

  // 2. Check plain SHA256 hash
  const sha256Hash = crypto.createHash('sha256').update(plainPassword).digest('hex');
  if (sha256Hash.toLowerCase() === storedHash.toLowerCase()) {
    return true;
  }

  // 3. Check Bcrypt
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compareSync(plainPassword, storedHash);
  }

  // 4. Direct plaintext match
  return plainPassword === storedHash;
}

async function login(username, password) {
  if (!username || !password) {
    throw new BadRequestError('Username and password are required');
  }

  const user = await authRepo.findUserByUsername(username);
  if (!user) {
    throw new UnauthorizedError('Invalid username or password');
  }

  const isValidPassword = verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    await auditService.logAudit({
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role_name || 'user',
      entityType: 'auth',
      entityId: user.id,
      operation: 'login',
      outcome: 'failure',
      details: { reason: 'Invalid password' }
    });
    throw new UnauthorizedError('Invalid username or password');
  }

  const roleName = (user.role_name || user.role || 'user').trim().toLowerCase();
  const roleRank = user.role_rank || (roleName === 'super admin' ? 1 : roleName === 'admin' ? 2 : 3);

  const clientIds = await authRepo.getUserClientIds(user.id);
  const privileges = await authRepo.getUserPrivileges(user.id, roleName);

  await authRepo.updateLastLogin(user.id);

  await auditService.logAudit({
    actorId: user.id,
    actorUsername: user.username,
    actorRole: roleName,
    entityType: 'auth',
    entityId: user.id,
    operation: 'login',
    outcome: 'success',
    details: { role: roleName, clientCount: clientIds.length }
  });

  const payload = {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: roleName,
    roleRank: roleRank,
    clientIds,
    privileges
  };

  const secret = process.env.JWT_SECRET || 'vapli_jwt_secret_key_super_secure_2026!';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  const token = jwt.sign(payload, secret, { expiresIn });

  return {
    user: payload,
    token
  };
}

module.exports = {
  login,
  hashVapliLegacyPassword
};
