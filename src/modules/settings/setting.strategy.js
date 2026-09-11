/**
 * Open/Closed Principle Design Pattern: Setting Strategies
 * 
 * AbstractSettingStrategy defines the contract for handling, validating,
 * and transforming setting data. New settings features can be added by
 * extending this base class without modifying existing service code.
 */
class AbstractSettingStrategy {
  constructor(key, category = 'general') {
    this.key = key;
    this.category = category;
  }

  validate(value) {
    return true;
  }

  transformRead(rawDbValue) {
    return rawDbValue;
  }

  transformWrite(value) {
    return value;
  }
}

/**
 * Strategy for Session Timeout settings
 */
class SessionTimeoutStrategy extends AbstractSettingStrategy {
  constructor() {
    super('session_timeout', 'security');
  }

  validate(value) {
    if (typeof value !== 'object' || value === null) return false;
    if (value.mode && !['none', 'minutes'].includes(value.mode)) return false;
    if (value.minutes && (typeof value.minutes !== 'number' || value.minutes < 1)) return false;
    return true;
  }

  transformRead(val) {
    if (!val) {
      return { mode: 'minutes', minutes: 60 };
    }
    return val;
  }

  transformWrite(val) {
    return {
      mode: val.mode || (val.noTimeout ? 'none' : 'minutes'),
      minutes: typeof val.minutes === 'number' ? val.minutes : 60,
      updated_at: new Date().toISOString()
    };
  }
}

/**
 * Strategy for Dashboard Display settings
 */
class DashboardDisplayStrategy extends AbstractSettingStrategy {
  constructor() {
    super('dashboard_display', 'ui');
  }

  transformRead(val) {
    if (!val) {
      return {
        show_inspection_values: true,
        show_completed_alerts: true,
        show_active_alerts: true,
        show_inspection_compliance: true
      };
    }
    return val;
  }

  transformWrite(val) {
    return {
      show_inspection_values: val.show_inspection_values ?? val.showInspectionValues ?? true,
      show_completed_alerts: val.show_completed_alerts ?? val.showCompletedAlerts ?? true,
      show_active_alerts: val.show_active_alerts ?? val.showActiveAlerts ?? true,
      show_inspection_compliance: val.show_inspection_compliance ?? val.showInspectionCompliance ?? true,
      updated_at: new Date().toISOString()
    };
  }
}

/**
 * Strategy for Email Automation Receivers
 */
class EmailReceiversStrategy extends AbstractSettingStrategy {
  constructor(key) {
    super(key, 'notifications');
  }

  transformRead(val) {
    if (!val) return { emailids: [] };
    if (Array.isArray(val)) return { emailids: val };
    if (typeof val === 'string') {
      const list = val.split(',').map(e => e.trim()).filter(Boolean);
      return { emailids: list };
    }
    return val;
  }

  transformWrite(val) {
    let emails = [];
    if (Array.isArray(val)) {
      emails = val.map(e => String(e).trim()).filter(Boolean);
    } else if (typeof val === 'string') {
      emails = val.split(',').map(e => e.trim()).filter(Boolean);
    } else if (val && Array.isArray(val.emailids)) {
      emails = val.emailids.map(e => String(e).trim()).filter(Boolean);
    } else if (val && typeof val.emailids === 'string') {
      emails = val.emailids.split(',').map(e => e.trim()).filter(Boolean);
    }
    return { emailids: emails, updated_at: new Date().toISOString() };
  }
}

/**
 * Strategy for Report Format Configuration
 */
class ReportFormatConfigStrategy extends AbstractSettingStrategy {
  constructor() {
    super('report_format', 'reports');
  }

  transformRead(val) {
    if (!val) return {};
    return val;
  }

  transformWrite(val) {
    return typeof val === 'object' && val !== null ? val : {};
  }
}

/**
 * Generic Fallback Strategy (Open for extension of arbitrary KV pairs)
 */
class GenericKVStrategy extends AbstractSettingStrategy {
  constructor(key) {
    super(key, 'general');
  }

  transformRead(val) {
    return val !== undefined ? val : null;
  }

  transformWrite(val) {
    return val;
  }
}

module.exports = {
  AbstractSettingStrategy,
  SessionTimeoutStrategy,
  DashboardDisplayStrategy,
  EmailReceiversStrategy,
  ReportFormatConfigStrategy,
  GenericKVStrategy
};
