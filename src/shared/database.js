const mysql = require('mysql2/promise');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.config = this.getDbConfig();
  }

  getDbConfig() {
    // 从环境变量获取配置，支持开发和生产环境
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'ai_qa_comparison',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    };
    
    console.log('MySQL配置:', { 
      ...config, 
      password: config.password ? '***' : 'empty' 
    });
    
    return config;
  }

  async init() {
    try {
      // 创建连接池
      this.pool = mysql.createPool(this.config);
      
      // 测试连接
      const connection = await this.pool.getConnection();
      console.log('MySQL数据库连接成功');
      connection.release();
      
      // 创建数据库（如果不存在）
      await this.createDatabaseIfNotExists();
      
      // 创建表
      await this.createTables();
      
      // 插入默认数据
      await this.insertDefaultSites();
      
      return true;
    } catch (error) {
      console.error('MySQL数据库初始化失败:', error);
      throw error;
    }
  }

  async createDatabaseIfNotExists() {
    // 创建数据库连接（不带数据库名）
    const tempConfig = { ...this.config };
    delete tempConfig.database;
    const tempPool = mysql.createPool(tempConfig);
    
    try {
      await tempPool.execute(
        `CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`数据库 ${this.config.database} 已就绪`);
    } finally {
      await tempPool.end();
    }
  }

  async createTables() {
    const tables = [
      // AI网站配置表
      `CREATE TABLE IF NOT EXISTS ai_sites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        selector TEXT NOT NULL,
        input_selector TEXT NOT NULL,
        submit_selector TEXT NOT NULL,
        enabled TINYINT(1) DEFAULT 1,
        config LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_enabled (enabled),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      
      // 问答记录表
      `CREATE TABLE IF NOT EXISTS qa_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        answers LONGTEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      
      // API配置表
      `CREATE TABLE IF NOT EXISTS api_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        api_key VARCHAR(100) UNIQUE,
        port INT DEFAULT 8080,
        enabled TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    for (const tableSql of tables) {
      try {
        await this.execute(tableSql);
        console.log(`表创建成功: ${tableSql.split(' ')[2]}`);
      } catch (error) {
        console.error(`创建表失败:`, error.message);
        throw error;
      }
    }
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
      try {
        const rows = await this.execute('SELECT id FROM ai_sites WHERE name = ?', [site.name]);
        if (rows.length === 0) {
          await this.execute(
            'INSERT INTO ai_sites (name, url, selector, input_selector, submit_selector, enabled, config) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [site.name, site.url, site.selector, site.input_selector, site.submit_selector, site.enabled, site.config]
          );
          console.log(`已插入默认网站: ${site.name}`);
        }
      } catch (error) {
        console.error(`插入默认网站 ${site.name} 失败:`, error);
      }
    }
  }

  // 基础数据库操作方法
  async execute(sql, params = []) {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }
    
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('数据库执行错误:', { sql, params, error: error.message });
      throw error;
    }
  }

  async run(sql, params = []) {
    const rows = await this.execute(sql, params);
    return {
      id: rows.insertId,
      changes: rows.affectedRows,
      rows: rows
    };
  }

  async get(sql, params = []) {
    const rows = await this.execute(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async all(sql, params = []) {
    const rows = await this.execute(sql, params);
    return rows;
  }

  // AI网站管理
  async getAiSites() {
    try {
      const sites = await this.all('SELECT * FROM ai_sites ORDER BY created_at DESC');
      return sites.map(site => {
        let config = {};
        if (site.config) {
          try {
            config = JSON.parse(site.config);
          } catch (error) {
            console.error('解析config JSON失败:', error, '原始config:', site.config);
            config = {};
          }
        }
        return {
          ...site,
          enabled: site.enabled === 1, // 将整数转换为布尔值
          config
        };
      });
    } catch (error) {
      console.error('获取AI网站列表失败:', error);
      return [];
    }
  }

  async saveAiSite(siteData) {
    const { id, name, url, selector, input_selector, submit_selector, enabled, config } = siteData;
    
    // 处理config字段，确保是有效的JSON字符串
    const configStr = config ? JSON.stringify(config) : '{}';
    // 将enabled布尔值转换为整数
    const enabledInt = enabled ? 1 : 0;
    
    if (id) {
      // 更新现有记录
      return await this.run(
        'UPDATE ai_sites SET name = ?, url = ?, selector = ?, input_selector = ?, submit_selector = ?, enabled = ?, config = ? WHERE id = ?',
        [name, url, selector, input_selector, submit_selector, enabledInt, configStr, id]
      );
    } else {
      // 插入新记录
      return await this.run(
        'INSERT INTO ai_sites (name, url, selector, input_selector, submit_selector, enabled, config) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, url, selector, input_selector, submit_selector, enabledInt, configStr]
      );
    }
  }

  async deleteAiSite(siteId) {
    return await this.run('DELETE FROM ai_sites WHERE id = ?', [siteId]);
  }

  // 问答记录管理
  async getHistory() {
    try {
      const records = await this.all('SELECT * FROM qa_records ORDER BY created_at DESC LIMIT 100');
      return records.map(record => ({
        ...record,
        answers: JSON.parse(record.answers)
      }));
    } catch (error) {
      console.error('获取历史记录失败:', error);
      return [];
    }
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
    try {
      let config = await this.get('SELECT * FROM api_config ORDER BY id DESC LIMIT 1');
      if (!config) {
        // 创建默认配置
        const defaultKey = this.generateApiKey();
        await this.run('INSERT INTO api_config (api_key, port, enabled) VALUES (?, 8080, 1)', [defaultKey]);
        config = await this.get('SELECT * FROM api_config ORDER BY id DESC LIMIT 1');
      }
      return config;
    } catch (error) {
      console.error('获取API配置失败:', error);
      // 返回默认配置
      return {
        api_key: this.generateApiKey(),
        port: 8080,
        enabled: 1
      };
    }
  }

  async saveApiConfig(config) {
    const { api_key, port, enabled } = config;
    const existing = await this.get('SELECT id FROM api_config LIMIT 1');
    
    if (existing) {
      return await this.run(
        'UPDATE api_config SET api_key = ?, port = ?, enabled = ? WHERE id = ?',
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

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('MySQL连接池已关闭');
    }
  }
}

module.exports = { DatabaseManager };