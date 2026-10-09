const dashboardRepository = require('../repositories/dashboardRepository');

function parseJsonField(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeTankStatRow(row) {
  const lastReading =
    parseJsonField(row.last_reading_json) ||
    parseJsonField(row.last_reading) ||
    {};
  const paramStats =
    parseJsonField(row.param_stats_json) ||
    parseJsonField(row.param_stats) ||
    {};
  let lastCapturedAt = row.last_captured_at;
  if (lastCapturedAt instanceof Date) {
    lastCapturedAt = lastCapturedAt.toISOString();
  }
  return {
    ...row,
    tank_id: row.tank_id,
    count: row.count_value ?? row.count ?? 0,
    last_captured_at: lastCapturedAt,
    last_captured_by:
      row.last_captured_by_name ?? row.last_captured_by ?? null,
    last_reading: lastReading,
    param_stats: paramStats,
    last_duplicate_reason: row.last_duplicate_reason ?? null,
  };
}

class DashboardService {
  async getDashboardStats(clientId) {
    const data = await dashboardRepository.getDashboardStats(clientId);
    return {
      ...data,
      tanksStats: (data.tanksStats || []).map(normalizeTankStatRow),
    };
  }

  async getDashboardTrends(clientId, tankId) {
    return await dashboardRepository.getDashboardTrends(clientId, tankId);
  }
}

module.exports = new DashboardService();
