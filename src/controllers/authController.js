const authService = require('../services/authService');
const auditService = require('../services/auditService');

class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);

      await auditService.log({
        actor_id: result.user.id,
        actor_name: result.user.display_name || result.user.username,
        actor_role: result.user.role,
        operation: 'LOGIN',
        outcome: 'SUCCESS',
        summary: `User '${result.user.username}' logged in successfully`
      });

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      if (req.user) {
        await auditService.log({
          actor_id: req.user.userId,
          actor_name: req.user.username,
          actor_role: req.user.role,
          operation: 'LOGOUT',
          outcome: 'SUCCESS',
          summary: `User '${req.user.username}' logged out`
        });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
