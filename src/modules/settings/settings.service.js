const db = require('../../config/database');
const settingsRegistry = require('./settings.registry');
const reportFormatService = require('./report_format.service');

const memorySettings = new Map();

class SettingsService {
  /**
   * Normalize key names from Firebase paths or legacy keys
   * (e.g. 'settings/Report_Recievers/Emailids' -> 'report_receivers')
   */
  normalizeKey(key) {
    if (!key) return '';
    const cleanKey = String(key).trim();

    if (cleanKey.includes('Report_Recievers')) return 'report_receivers';
    if (cleanKey.includes('Alerts_Recievers')) return 'alerts_receivers';
    if (cleanKey.includes('Missing Tanks_Recievers')) return 'missing_tanks_receivers';
    if (cleanKey.includes('report_format')) return 'report_format';
    if (cleanKey.includes('dashboard_display')) return 'dashboard_display';
    if (cleanKey.includes('session')) return 'session_timeout';

    return cleanKey;
  }

  async getSetting(rawKey) {
    const key = this.normalizeKey(rawKey);
    const strategy = settingsRegistry.getStrategy(key);

    if (key === 'report_format') {
      const sqlConfigs = await reportFormatService.getConfigs();
      if (sqlConfigs && Object.keys(sqlConfigs).length > 0) {
        return strategy.transformRead(sqlConfigs);
      }
    }

    if (!db.pool) {
      const rawVal = memorySettings.get(key);
      return strategy.transformRead(rawVal);
    }

    const rows = await db.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = ?`,
      [key]
    );

    let rawVal;
    if (rows.length > 0) {
      try {
        rawVal = typeof rows[0].setting_value === 'string'
          ? JSON.parse(rows[0].setting_value)
          : rows[0].setting_value;
      } catch (_) {
        rawVal = rows[0].setting_value;
      }
    }

    return strategy.transformRead(rawVal);
  }

  async saveSetting(rawKey, value) {
    const key = this.normalizeKey(rawKey);
    const strategy = settingsRegistry.getStrategy(key);

    if (!strategy.validate(value)) {
      throw new Error(`Invalid value provided for setting: ${key}`);
    }

    const transformed = strategy.transformWrite(value);

    if (key === 'report_format' && typeof transformed === 'object' && transformed !== null) {
      await reportFormatService.saveConfigs(transformed);
    }

    const jsonStr = JSON.stringify(transformed);
    const category = strategy.category || 'general';
    const now = new Date().toISOString();

    if (!db.pool) {
      memorySettings.set(key, transformed);
      return transformed;
    }

    await db.query(
      `INSERT INTO system_settings (setting_key, setting_value, category, updated_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), category = VALUES(category), updated_at = VALUES(updated_at)`,
      [key, jsonStr, category, now]
    );

    return transformed;
  }

  async getAllSettings() {
    if (!db.pool) {
      const result = {};
      for (const [k, v] of memorySettings.entries()) {
        const strategy = settingsRegistry.getStrategy(k);
        result[k] = strategy.transformRead(v);
      }
      return result;
    }

    const rows = await db.query(`SELECT setting_key, setting_value FROM system_settings`);
    const dbMap = new Map();
    for (const r of rows) {
      try {
        dbMap.set(r.setting_key, typeof r.setting_value === 'string' ? JSON.parse(r.setting_value) : r.setting_value);
      } catch (_) {
        dbMap.set(r.setting_key, r.setting_value);
      }
    }

    const allKeys = new Set([...settingsRegistry.getAllKeys(), ...dbMap.keys()]);
    const result = {};

    for (const key of allKeys) {
      const strategy = settingsRegistry.getStrategy(key);
      const rawVal = dbMap.get(key);
      result[key] = strategy.transformRead(rawVal);
    }

    return result;
  }

  async bulkSaveSettings(settingsMap) {
    const result = {};
    for (const [k, v] of Object.entries(settingsMap)) {
      result[k] = await this.saveSetting(k, v);
    }
    return result;
  }
}

module.exports = new SettingsService();
