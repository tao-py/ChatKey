const mysql = require('mysql2/promise');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.db = null; // 用于SQLite
    this.config = this.getDbConfig();
    this.type = process.env.DB_TYPE || 'mysql'; // 添加数据库类型判断
  }

  getDbConfig() {
    // 从环境变量获取配置，支持开发和生产环境
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ai_qa_comparison',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    };
    
    console.log('数据库配置:', { 
      ...config, 
      password: config.password ? '***' : 'empty',
      type: process.env.DB_TYPE || 'mysql'
    });
    
    return config;
  }

  async init() {
    try {
      if (this.type === 'sqlite') {
        return await this.initSQLite();
      } else {
        return await this.initMySQL();
      }
    } catch (error) {
      console.error(`${this.type.toUpperCase()}数据库初始化失败:`, error);
      throw error;
    }
  }

  async initSQLite() {
    // 动态导入SQLite相关模块
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    
    try {
      // 检查是否已经连接
      if (this.db) {
        console.log('SQLite数据库已连接');
        return true;
      }
      
      // 打开SQLite数据库
      this.db = await open({
        filename: process.env.DB_PATH || './data.db',
        driver: sqlite3.Database
      });

      // 创建表
      await this.createSQLiteTables();

      // 插入默认数据
      await this.insertDefaultSites();

      console.log('SQLite数据库连接成功');
      return true;
    } catch (error) {
      console.error('SQLite数据库初始化失败:', error);
      throw error;
    }
  }

  async initMySQL() {
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

  async createSQLiteTables() {
    const tables = [
      // AI网站配置表
      `CREATE TABLE IF NOT EXISTS ai_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        selector TEXT NOT NULL,
        input_selector TEXT NOT NULL,
        submit_selector TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
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
        enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Cookies表 - 保存网站登录状态
      `CREATE TABLE IF NOT EXISTS cookies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_key TEXT NOT NULL,
        cookies_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(site_key)
      )`
    ];

    for (const tableSql of tables) {
      try {
        await this.db.exec(tableSql);
        console.log(`SQLite表创建成功: ${tableSql.split(' ')[2]}`);
      } catch (error) {
        console.error(`创建SQLite表失败:`, error.message);
        throw error;
      }
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      
      // Cookies表 - 保存网站登录状态
      `CREATE TABLE IF NOT EXISTS cookies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        site_key VARCHAR(255) NOT NULL,
        cookies_data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_site_key (site_key),
        INDEX idx_updated_at (updated_at),
        UNIQUE KEY uk_site_key (site_key)
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
        if (this.type === 'sqlite') {
          const rows = await this.db.all('SELECT id FROM ai_sites WHERE name = ?', [site.name]);
          if (rows.length === 0) {
            await this.db.run(
              'INSERT INTO ai_sites (name, url, selector, input_selector, submit_selector, enabled, config) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [site.name, site.url, site.selector, site.input_selector, site.submit_selector, site.enabled, site.config]
            );
            console.log(`已插入默认网站: ${site.name}`);
          }
        } else {
          const rows = await this.execute('SELECT id FROM ai_sites WHERE name = ?', [site.name]);
          if (rows.length === 0) {
            await this.execute(
              'INSERT INTO ai_sites (name, url, selector, input_selector, submit_selector, enabled, config) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [site.name, site.url, site.selector, site.input_selector, site.submit_selector, site.enabled, site.config]
            );
            console.log(`已插入默认网站: ${site.name}`);
          }
        }
      } catch (error) {
        console.error(`插入默认网站 ${site.name} 失败:`, error);
      }
    }
  }

  // 基础数据库操作方法
   async execute(sql, params = []) {
     if (this.type === 'sqlite') {
       // SQLite 操作
       if (sql.trim().toUpperCase().startsWith('SELECT')) {
         return await this.db.all(sql, params);
       } else {
         const result = await this.db.run(sql, params);
         return {
           insertId: result.lastID,
           affectedRows: result.changes
         };
       }
     } else {
       // MySQL 操作
       if (!this.pool) {
         throw new Error('数据库连接池未初始化');
       }
       
       try {
         // mysql2/promise 的 execute 返回 [rows, fields]
         const [rows, fields] = await this.pool.execute(sql, params);
         return {
           rows,
           insertId: fields?.insertId,
           affectedRows: fields?.affectedRows
         };
       } catch (error) {
         console.error('数据库执行错误:', { sql, params, error: error.message });
         throw error;
       }
     }
   }

  async run(sql, params = []) {
    if (this.type === 'sqlite') {
      const result = await this.db.run(sql, params);
      return {
        id: result.lastID,
        changes: result.changes,
        rows: result
      };
    } else {
      // MySQL 情况下，execute 返回的是查询结果
      const result = await this.execute(sql, params);
      return {
        id: result.insertId,
        changes: result.affectedRows,
        rows: result
      };
    }
  }

   async get(sql, params = []) {
     if (this.type === 'sqlite') {
       return await this.db.get(sql, params);
     } else {
       const result = await this.execute(sql, params);
       const rows = result.rows || result;
       return rows.length > 0 ? rows[0] : null;
     }
   }

   async all(sql, params = []) {
     if (this.type === 'sqlite') {
       return await this.db.all(sql, params);
     } else {
       const result = await this.execute(sql, params);
       return result.rows || result;
     }
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
          enabled: Boolean(site.enabled), // 将数字转换为布尔值
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

   async deleteHistoryRecord(recordId) {
     return await this.run('DELETE FROM qa_records WHERE id = ?', [recordId]);
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
     const { id, question, answers, status = 'completed' } = record;
     let answersString;
     try {
       answersString = JSON.stringify(answers);
     } catch (stringifyError) {
       console.error('Failed to stringify answers:', stringifyError);
       // 尝试清理answers中的循环引用或不可序列化的值
       const safeAnswers = this.makeSerializable(answers);
       answersString = JSON.stringify(safeAnswers);
     }
     
     if (id) {
       // 更新现有记录
       return await this.run(
         'UPDATE qa_records SET question = ?, answers = ?, status = ? WHERE id = ?',
         [question, answersString, status, id]
       );
     } else {
       // 插入新记录
       const result = await this.run(
         'INSERT INTO qa_records (question, answers, status) VALUES (?, ?, ?)',
         [question, answersString, status]
       );
       // 返回插入的ID，确保是数字类型
       return result && result.id ? result.id : null;
     }
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
     const existing = await this.get('SELECT id, api_key FROM api_config LIMIT 1');
     
     if (existing) {
       // 如果api_key没有变化，直接更新port和enabled
       // 如果api_key变了，需要检查新key是否已被其他记录使用
       if (existing.api_key !== api_key) {
         const duplicateCheck = await this.get('SELECT id FROM api_config WHERE api_key = ? AND id != ?', [api_key, existing.id]);
         if (duplicateCheck) {
           throw new Error(`API key '${api_key}' is already in use by another record`);
         }
       }
       return await this.run(
         'UPDATE api_config SET api_key = ?, port = ?, enabled = ? WHERE id = ?',
         [api_key, port, enabled, existing.id]
       );
     } else {
       // 插入新记录前检查是否已存在相同api_key
       const duplicateCheck = await this.get('SELECT id FROM api_config WHERE api_key = ?', [api_key]);
       if (duplicateCheck) {
         throw new Error(`API key '${api_key}' already exists`);
       }
       return await this.run(
         'INSERT INTO api_config (api_key, port, enabled) VALUES (?, ?, ?)',
         [api_key, port, enabled]
       );
     }
   }

  makeSerializable(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.makeSerializable(item));
    }
    
    // 处理普通对象
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Error) {
        result[key] = {
          message: value.message,
          stack: value.stack,
          name: value.name
        };
      } else if (value instanceof Date) {
        result[key] = value.toISOString();
      } else if (typeof value === 'function') {
        result[key] = '[Function]';
      } else if (typeof value === 'symbol') {
        result[key] = value.toString();
      } else if (value && typeof value === 'object') {
        // 递归处理嵌套对象，避免无限循环
        try {
          JSON.stringify(value); // 测试是否可序列化
          result[key] = this.makeSerializable(value);
        } catch {
          result[key] = '[Circular or non-serializable object]';
        }
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  generateApiKey() {
    const crypto = require('crypto');
    return 'ak-' + crypto.randomBytes(16).toString('hex');
  }

  async close() {
    if (this.type === 'sqlite' && this.db) {
      await this.db.close();
      console.log('SQLite数据库已关闭');
    } else if (this.pool) {
      await this.pool.end();
      console.log('MySQL连接池已关闭');
    }
  }
}

module.exports = { DatabaseManager };