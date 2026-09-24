const db = require('../config/db');

class DashboardRepository {
  async getDashboardStats(clientId) {
    const [stats] = await db.query(
      `SELECT ds.*, t.tank_name, t.tank_code FROM dashboard_stats ds
       JOIN tanks t ON ds.tank_id = t.id
       WHERE ds.client_id = ? AND t.is_active = 1`,
      [clientId]
    );

    const [activeAlertsCount] = await db.query(
      `SELECT COUNT(*) as count FROM alerts WHERE client_id = ? AND status = 'active'`,
      [clientId]
    );

    const [activeViolationsCount] = await db.query(
      `SELECT COUNT(*) as count FROM violations WHERE client_id = ? AND status = 'active'`,
      [clientId]
    );

    const [completedTasksCount] = await db.query(
      `SELECT COUNT(*) as count FROM completed_tasks WHERE client_id = ?`,
      [clientId]
    );

    return {
      tanksStats: stats,
      activeAlertsCount: activeAlertsCount[0].count,
      activeViolationsCount: activeViolationsCount[0].count,
      completedTasksCount: completedTasksCount[0].count
    };
  }

  async getDashboardTrends(clientId, tankId) {
    const [rows] = await db.query(
      `SELECT r.captured_at, r.final_level, rv.parameter_id, rv.numeric_value, rv.text_value
       FROM readings r
       LEFT JOIN reading_values rv ON r.id = rv.reading_id
       WHERE r.client_id = ? AND r.tank_id = ?
       ORDER BY r.captured_at ASC LIMIT 100`,
      [clientId, tankId]
    );
    return rows;
  }
}

module.exports = new DashboardRepository();
