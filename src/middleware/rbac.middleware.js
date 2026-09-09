const { ForbiddenError } = require('../core/errors');

// Role Ranks:
// 1 = super admin
// 2 = admin
// 3 = user

function requireRole(minRoleRank) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User identity context missing'));
    }

    // Role rank 1 (super admin) <= minRoleRank (e.g., 2 for admin)
    if (req.user.roleRank > minRoleRank) {
      return next(new ForbiddenError(`Insufficient role privileges. Required rank <= ${minRoleRank}`));
    }
    next();
  };
}

function requirePermission(permissionCode) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User identity context missing'));
    }

    // Super admin (rank 1) bypasses individual privilege code checks
    if (req.user.roleRank === 1 || req.user.role === 'super admin') {
      return next();
    }

    const hasPermission = req.user.privileges[permissionCode] === true;
    if (!hasPermission) {
      return next(new ForbiddenError(`Permission '${permissionCode}' required for this operation`));
    }

    next();
  };
}

function enforceClientScope(req, res, next) {
  if (!req.user) {
    return next(new ForbiddenError('User identity context missing'));
  }

  // Super admin (rank 1) can access any client
  if (req.user.roleRank === 1 || req.user.role === 'super admin') {
    return next();
  }

  const targetClientId = req.params.clientId || req.params.id || req.query.clientId || req.body.clientId;

  if (targetClientId) {
    const userClientIds = req.user.clientIds || [];
    if (!userClientIds.includes(targetClientId)) {
      return next(new ForbiddenError(`Access denied to client '${targetClientId}' outside assigned scope`));
    }
  }

  next();
}

module.exports = {
  requireRole,
  requirePermission,
  enforceClientScope
};
