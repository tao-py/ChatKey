/**
 * 统一配置管理中心
 * 基于 openclaw-zero-token 的配置设计理念
 * 支持分层配置、热重载、配置验证和审计日志
 */

const fs = require('fs').promises;
const path = require('path');

// 配置源接口
class ConfigurationSource {
  async get(key) {
    throw new Error('get() must be implemented');
  }
  async set(key, value) {
    throw new Error('set() must be implemented');
  }
  async watch(key, callback) {
    throw new Error('watch() must be implemented');
  }
}

// 环境变量配置源（最高优先级）
class EnvironmentSource extends ConfigurationSource {
  async get(key) {
    const envKey = key.replace(/\./g, '_').toUpperCase();
    return process.env[envKey];
  }

  async set(key, value) {
    const envKey = key.replace(/\./g, '_').toUpperCase();
    process.env[envKey] = value;
  }
}

// 文件配置源
class FileSource extends ConfigurationSource {
  constructor(filePath) {
    super();
    this.filePath = filePath;
    this.config = null;
    this.watchers = new Map();
  }

  async load() {
    try {
      const exists = await fs.access(this.filePath).then(() => true).catch(() => false);
      if (exists) {
        const content = await fs.readFile(this.filePath, 'utf-8');
        this.config = JSON.parse(content);
      } else {
        this.config = {};
      }
    } catch (error) {
      console.warn(`Failed to load config from ${this.filePath}:`, error.message);
      this.config = {};
    }
  }

  async get(key) {
    if (!this.config) await this.load();
    return this.getNestedValue(this.config, key);
  }

  async set(key, value) {
    if (!this.config) await this.load();
    this.setNestedValue(this.config, key, value);
    await this.save();
  }

  async save() {
    await fs.writeFile(this.filePath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  getNestedValue(obj, key) {
    return key.split('.').reduce((current, part) => 
      current && current[part] !== undefined ? current[part] : undefined, obj);
  }

  setNestedValue(obj, key, value) {
    const parts = key.split('.');
    const last = parts.pop();
    const target = parts.reduce((current, part) => {
      if (!current[part]) current[part] = {};
      return current[part];
    }, obj);
    target[last] = value;
  }
}

// 数据库配置源
class DatabaseSource extends ConfigurationSource {
  constructor(dbManager) {
    super();
    this.dbManager = dbManager;
  }

  async get(key) {
    // 这里需要根据 key 从数据库读取相应配置
    // 简化实现：从 config 表读取
    try {
      const rows = await this.dbManager.all(
        'SELECT config_value FROM config WHERE config_key = ?',
        [key]
      );
      return rows.length > 0 ? JSON.parse(rows[0].config_value) : undefined;
    } catch {
      return undefined;
    }
  }

  async set(key, value) {
    await this.dbManager.run(
      'INSERT INTO config (config_key, config_value, updated_at) VALUES (?, ?, NOW()) ' +
      'ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW()',
      [key, JSON.stringify(value), JSON.stringify(value)]
    );
  }
}

// 配置验证器
class ConfigValidator {
  static validate(schema, config) {
    const errors = [];
    
    for (const [key, rules] of Object.entries(schema)) {
      const value = this.getNestedValue(config, key);
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required config "${key}" is missing`);
        continue;
      }
      
      if (value !== undefined) {
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`Config "${key}" must be a string`);
        }
        if (rules.type === 'number' && typeof value !== 'number') {
          errors.push(`Config "${key}" must be a number`);
        }
        if (rules.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Config "${key}" must be a boolean`);
        }
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Config "${key}" must be >= ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Config "${key}" must be <= ${rules.max}`);
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`Config "${key}" must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }
    
    return errors;
  }

  static getNestedValue(obj, key) {
    return key.split('.').reduce((current, part) => 
      current && current[part] !== undefined ? current[part] : undefined, obj);
  }
}

// 配置管理器主类
class ConfigManager {
  constructor(dbManager) {
    this.sources = [];
    this.cache = new Map();
    this.cacheTTL = new Map();
    this.defaultTTL = 30000; // 30秒
    this.validators = new Map();
    this.listeners = new Map();
    this.auditLog = [];
    this.dbManager = dbManager;
    
    // 初始化配置源（优先级从低到高）
    this.setupSources();
    
    // 注册配置验证器
    this.setupValidators();
    
    // 启动缓存清理定时器
    setInterval(() => this.cleanCache(), 60000);
  }

  setupSources() {
    // 优先级 1: 文件配置（最低）
    const configPath = path.join(__dirname, '..', '..', 'config.json');
    this.sources.push(new FileSource(configPath));
    
    // 优先级 2: 数据库配置
    if (this.dbManager) {
      this.sources.push(new DatabaseSource(this.dbManager));
    }
    
    // 优先级 3: 环境变量（最高）
    this.sources.push(new EnvironmentSource());
  }

  setupValidators() {
    // 注册所有配置验证规则
    this.validators.set('providers', {
      '*': {
        name: { type: 'string', required: true },
        baseUrl: { type: 'url', required: true },
        authType: { type: 'enum', values: ['cookie', 'localStorage', 'oauth', 'none'], default: 'cookie' },
        selectors: { type: 'object', default: {} }
      }
    });
    
    this.validators.set('gateway', {
      port: { type: 'number', min: 1, max: 65535, default: 8080 },
      rateLimit: {
        windowMs: { type: 'number', min: 1000, default: 60000 },
        maxRequests: { type: 'number', min: 1, default: 100 }
      }
    });
    
    this.validators.set('browser', {
      headless: { type: 'boolean', default: false },
      maxConcurrency: { type: 'number', min: 1, max: 10, default: 3 },
      timeout: { type: 'number', min: 1000, default: 30000 }
    });
  }

  async get(key, defaultValue = undefined) {
    // 1. 检查缓存
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    // 2. 按优先级从多个源获取
    for (const source of this.sources) {
      try {
        const value = await source.get(key);
        if (value !== undefined && value !== null) {
          // 3. 验证配置
          await this.validate(key, value);
          
          // 4. 缓存
          this.cache.set(key, {
            value,
            expires: Date.now() + this.defaultTTL,
            timestamp: Date.now()
          });
          
          return value;
        }
      } catch (error) {
        console.warn(`Config source ${source.constructor.name} failed for ${key}:`, error.message);
      }
    }

    return defaultValue;
  }

  async set(key, value) {
    // 验证新值
    await this.validate(key, value);
    
    // 保存到所有源（通常只保存到最高持久化源）
    const errors = [];
    for (const source of this.sources) {
      try {
        await source.set(key, value);
      } catch (error) {
        errors.push(`${source.constructor.name}: ${error.message}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Failed to set config: ${errors.join('; ')}`);
    }
    
    // 更新缓存
    this.cache.set(key, {
      value,
      expires: Date.now() + this.defaultTTL,
      timestamp: Date.now()
    });
    
    // 记录审计日志
    this.auditLog.push({
      operation: 'set',
      key,
      value,
      timestamp: new Date().toISOString(),
      user: process.env.USER || 'system'
    });
    
    // 通知监听器
    this.notifyListeners(key, value);
  }

  async validate(key, value) {
    // 查找匹配的验证器
    for (const [pattern, rules] of this.validators) {
      if (this.matchKey(key, pattern)) {
        const errors = ConfigValidator.validate(rules, { [key]: value });
        if (errors.length > 0) {
          throw new Error(`Config validation failed for "${key}": ${errors.join(', ')}`);
        }
      }
    }
  }

  matchKey(key, pattern) {
    if (pattern === '*') return true;
    const keyParts = key.split('.');
    const patternParts = pattern.split('.');
    if (keyParts.length !== patternParts.length) return false;
    return keyParts.every((part, i) => 
      patternParts[i] === '*' || patternParts[i] === part
    );
  }

  watch(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    // 返回取消订阅函数
    return () => {
      this.listeners.get(key).delete(callback);
    };
  }

  notifyListeners(key, value) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error(`Config listener error for ${key}:`, error);
        }
      });
    }
  }

  async reload(key) {
    this.cache.delete(key);
    return this.get(key);
  }

  async getAll() {
    const result = {};
    // 从所有源合并配置
    for (const source of this.sources) {
      try {
        // 这里简化实现，实际需要深度合并
        const allKeys = await this.getAllKeys(source);
        for (const key of allKeys) {
          if (!(key in result)) {
            result[key] = await this.get(key);
          }
        }
      } catch (error) {
        console.warn(`Failed to get config from ${source.constructor.name}:`, error);
      }
    }
    return result;
  }

  cleanCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }

  // 获取审计日志
  getAuditLog(filters = {}) {
    let logs = [...this.auditLog];
    if (filters.key) {
      logs = logs.filter(log => log.key === filters.key);
    }
    if (filters.user) {
      logs = logs.filter(log => log.user === filters.user);
    }
    if (filters.from) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.from));
    }
    return logs;
  }

  // 导出配置
  async export() {
    return await this.getAll();
  }

  // 导入配置
  async import(configData, dryRun = false) {
    const results = [];
    for (const [key, value] of Object.entries(configData)) {
      try {
        await this.validate(key, value);
        if (!dryRun) {
          await this.set(key, value);
        }
        results.push({ key, success: true });
      } catch (error) {
        results.push({ key, success: false, error: error.message });
      }
    }
    return results;
  }
}

module.exports = { ConfigManager, ConfigValidator };