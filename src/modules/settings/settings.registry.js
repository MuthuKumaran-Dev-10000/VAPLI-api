const {
  SessionTimeoutStrategy,
  DashboardDisplayStrategy,
  EmailReceiversStrategy,
  ReportFormatConfigStrategy,
  GenericKVStrategy
} = require('./setting.strategy');

/**
 * Open/Closed Principle Strategy Registry
 * 
 * Allows new setting keys and custom handlers to be registered dynamically
 * at runtime or plugin initialization without modifying core code.
 */
class SettingsRegistry {
  constructor() {
    this.strategies = new Map();
    this._registerDefaults();
  }

  _registerDefaults() {
    this.register(new SessionTimeoutStrategy());
    this.register(new DashboardDisplayStrategy());
    this.register(new EmailReceiversStrategy('report_receivers'));
    this.register(new EmailReceiversStrategy('alerts_receivers'));
    this.register(new EmailReceiversStrategy('missing_tanks_receivers'));
    this.register(new ReportFormatConfigStrategy());
  }

  /**
   * Register a custom strategy (Open for extension)
   */
  register(strategy) {
    if (!strategy.key) {
      throw new Error('Strategy must specify a valid setting key');
    }
    this.strategies.set(strategy.key, strategy);
  }

  /**
   * Resolve strategy for a given key, falling back to GenericKVStrategy
   */
  getStrategy(key) {
    if (this.strategies.has(key)) {
      return this.strategies.get(key);
    }
    return new GenericKVStrategy(key);
  }

  getAllKeys() {
    return Array.from(this.strategies.keys());
  }
}

module.exports = new SettingsRegistry();
