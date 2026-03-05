const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = path.join(app.getPath('userData'), 'ai-qa-comparison.db');
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('数据库连接失败:', err);
          reject(err);
        } else {
          console.log('数据库连接成功');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // AI网站配置表
      `CREATE TABLE IF NOT EXISTS ai_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        selector TEXT NOT NULL,
        input_selector TEXT NOT NULL,
        submit_selector TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 问答记录表
      `CREATE TABLE IF NOT EXISTS qa_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answers TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // API配置表
      `CREATE TABLE IF NOT EXISTS api_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key TEXT UNIQUE,
        port INTEGER DEFAULT 8080,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const tableSql of tables) {
      await this.run(tableSql);
    }

    // 插入默认AI网站配置
    await this.insertDefaultSites();
  }

  async insertDefaultSites() {
    const defaultSites = [
      {
        name: 'DeepSeek',
        url: 'https://chat.deepseek.com',
        selector: '[data-testid="conversation-turn-content"]',
        input_selector: 'textarea[placeholder*="输入"]',
        submit_selector: 'button[type="submit"]',
        enabled: 1,
        config: JSON.stringify({ waitTime: 3000 })
      },
      {
        name: '通义千问',
        url: 'https://tongyi.aliyun.com',
        selector: '.message-content',
        input_selector: 'textarea[placeholder*="输入"]',
        submit_selector: 'button[type="submit"]',
        enabled: 1,
        config: JSON.stringify({ waitTime: 3000 })
      },
      {
        name: '豆包',
        url: 'https://www.doubao.com',
        selector: '.message-content',
        input_selector: 'textarea[placeholder*="输入"]',
        submit_selector: 'button[type="submit"]',
        enabled: 0, // 默认禁用，需要用户手动启用
        config: JSON.stringify({ waitTime: 4000 })
      },
      {
        name: '文心一言',
        url: 'https://yiyan.baidu.com',
        selector: '.message-content',
        input_selector: 'textarea[placeholder*="输入"]',
        submit_selector: 'button[type="submit"]',
        enabled: 0, // 默认禁用，需要用户手动启用
        config: JSON.stringify({ waitTime: 4000 })
      }
    ];

    for (const site of defaultSites) {
      const exists = await this.get('SELECT id FROM ai_sites WHERE name = ?', [site.name]);
      if (!exists) {
        await this.run(
          'INSERT INTO ai_sites (name, url, selector, input_selector, submit_selector, enabled, config) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [site.name, site.url, site.selector, site.input_selector, site.submit_selector, site.enabled, site.config]
        );
      }
    }
  }

  // 基础数据库操作方法
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // AI网站管理
  async getAiSites() {
    const sites = await this.all('SELECT * FROM ai_sites ORDER BY created_at DESC');
    return sites.map(site => ({
      ...site,
      config: site.config ? JSON.parse(site.config) : {}
    }));
  }

  async saveAiSite(siteData) {
    const { id, name, url, selector, input_selector, submit_selector, enabled, config } = siteData;
    
    if (id) {
      // 更新现有记录
      return await this.run(
        'UPDATE ai_sites SET name = ?, url = ?, selector = ?, input_selector = ?, submit_selector = ?, enabled = ?, config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, url, selector, input_selector, submit_selector, enabled, JSON.stringify(config), id]
      );
    } else {
      // 插入新记录
      return await this.run(
        'INSERT INTO ai_sites (name, url, selector, input_selector, submit_selector, enabled, config) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, url, selector, input_selector, submit_selector, enabled, JSON.stringify(config)]
      );
    }
  }

  async deleteAiSite(siteId) {
    return await this.run('DELETE FROM ai_sites WHERE id = ?', [siteId]);
  }

  // 问答记录管理
  async getHistory() {
    const records = await this.all('SELECT * FROM qa_records ORDER BY created_at DESC LIMIT 100');
    return records.map(record => ({
      ...record,
      answers: JSON.parse(record.answers)
    }));
  }

  async saveQaRecord(record) {
    const { question, answers, status = 'completed' } = record;
    return await this.run(
      'INSERT INTO qa_records (question, answers, status) VALUES (?, ?, ?)',
      [question, JSON.stringify(answers), status]
    );
  }

  // API配置管理
  async getApiConfig() {
    let config = await this.get('SELECT * FROM api_config ORDER BY id DESC LIMIT 1');
    if (!config) {
      // 创建默认配置
      const defaultKey = this.generateApiKey();
      await this.run('INSERT INTO api_config (api_key, port, enabled) VALUES (?, 8080, 1)', [defaultKey]);
      config = await this.get('SELECT * FROM api_config ORDER BY id DESC LIMIT 1');
    }
    return config;
  }

  async saveApiConfig(config) {
    const { api_key, port, enabled } = config;
    const existing = await this.get('SELECT id FROM api_config LIMIT 1');
    
    if (existing) {
      return await this.run(
        'UPDATE api_config SET api_key = ?, port = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [api_key, port, enabled, existing.id]
      );
    } else {
      return await this.run(
        'INSERT INTO api_config (api_key, port, enabled) VALUES (?, ?, ?)',
        [api_key, port, enabled]
      );
    }
  }

  generateApiKey() {
    const crypto = require('crypto');
    return 'ak-' + crypto.randomBytes(16).toString('hex');
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('数据库关闭失败:', err);
        } else {
          console.log('数据库连接已关闭');
        }
      });
    }
  }
}

module.exports = { DatabaseManager };