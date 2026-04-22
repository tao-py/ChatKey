/**
 * 数据库管理器 - 统一实现
 * 整合了基础功能和业务操作方法
 */

const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.dbType = process.env.DB_TYPE || 'mysql';
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ai_qa_comparison',
      connectionLimit: parseInt(process.env.DB_POOL_SIZE) || 10,
      queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0
    };
    this.sqlitePath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'ai_qa.db');
    this.initialized = false;
    this.migrations = [];
   }

   async init() {
     console.log(`Initializing DatabaseManager (${this.dbType})`);
     
     try {
       if (this.dbType === 'mysql') {
         await this.initMySQL();
       } else if (this.dbType === 'sqlite') {
         await this.initSQLite();
       } else {
         throw new Error(`Unsupported database type: ${this.dbType}`);
       }
       
       // 标记为已初始化（在迁移之前）
       this.initialized = true;
       
       // 运行迁移
       await this.runMigrations();
       
       console.log('DatabaseManager initialized successfully');
     } catch (error) {
       console.error('Database initialization failed:', error);
        throw error;
      }
    }

  async initMySQL() {
    console.log('Connecting to MySQL...');
    
    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      waitForConnections: true,
      connectionLimit: this.config.connectionLimit,
      queueLimit: this.config.queueLimit,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      charset: 'utf8mb4'
    });

    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('MySQL connection established');
    } catch (error) {
      if (error.code === 'ER_BAD_DB_ERROR') {
        console.log(`Database "${this.config.database}" not found, creating...`);
        await this.createDatabase();
        this.pool = mysql.createPool({
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          password: this.config.password,
          database: this.config.database,
          waitForConnections: true,
          connectionLimit: this.config.connectionLimit,
          queueLimit: this.config.queueLimit,
          enableKeepAlive: true,
          keepAliveInitialDelay: 0,
          charset: 'utf8mb4'
        });
      } else {
        throw error;
      }
    }
  }

  async initSQLite() {
    console.log('Connecting to SQLite...');
    
    const dbDir = path.dirname(this.sqlitePath);
    await fs.mkdir(dbDir, { recursive: true });
    
    this.pool = new sqlite3.Database(this.sqlitePath, (err) => {
      if (err) {
        console.error('Failed to connect to SQLite:', err);
        throw err;
      }
      console.log('SQLite connection established');
    });
    
    await this.run('PRAGMA foreign_keys = ON;');
    await this.run('PRAGMA journal_mode = WAL;');
    await this.run('PRAGMA synchronous = NORMAL;');
    await this.run('PRAGMA cache_size = 10000;');
  }

  async createDatabase() {
    const { host, port, user, password, database } = this.config;
    const tempPool = mysql.createPool({
      host,
      port,
      user,
      password,
      connectionLimit: 1
    });

    try {
      const connection = await tempPool.getConnection();
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` 
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      connection.release();
      console.log(`Database "${database}" created successfully`);
    } finally {
      await tempPool.end();
    }
  }

  async runMigrations() {
    console.log('Running database migrations...');
    
    const migrations = [
      {
        version: 1,
        name: 'create_base_tables',
        up: async (db) => {
          await db.query(`
            CREATE TABLE IF NOT EXISTS ai_sites (
              id INT AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              url VARCHAR(500) NOT NULL,
              selector TEXT NOT NULL,
              input_selector TEXT NOT NULL,
              submit_selector TEXT NOT NULL,
              enabled TINYINT(1) DEFAULT 1,
              config LONGTEXT,
              provider_type VARCHAR(100) DEFAULT 'generic',
              auth_config LONGTEXT,
              version VARCHAR(20) DEFAULT '1.0',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_enabled (enabled),
              INDEX idx_provider_type (provider_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
          
          await db.query(`
            CREATE TABLE IF NOT EXISTS qa_records (
              id INT AUTO_INCREMENT PRIMARY KEY,
              question TEXT NOT NULL,
              answers LONGTEXT NOT NULL,
              status VARCHAR(50) DEFAULT 'completed',
              error TEXT,
              duration INT DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_status (status),
              INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
          
          await db.query(`
            CREATE TABLE IF NOT EXISTS api_config (
              id INT AUTO_INCREMENT PRIMARY KEY,
              api_key VARCHAR(100) UNIQUE,
              port INT DEFAULT 8080,
              enabled TINYINT(1) DEFAULT 1,
              rate_limit INT DEFAULT 100,
              rate_window INT DEFAULT 60000,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_enabled (enabled)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
          
          await db.query(`
            CREATE TABLE IF NOT EXISTS cookies (
              id INT AUTO_INCREMENT PRIMARY KEY,
              site_key VARCHAR(255) NOT NULL,
              cookies_data LONGTEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uk_site_key (site_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
          
          await db.query(`
            CREATE TABLE IF NOT EXISTS config (
              id INT AUTO_INCREMENT PRIMARY KEY,
              config_key VARCHAR(255) UNIQUE NOT NULL,
              config_value LONGTEXT,
              config_type VARCHAR(50) DEFAULT 'json',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_key (config_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
          
          await db.query(`
            CREATE TABLE IF NOT EXISTS audit_log (
              id INT AUTO_INCREMENT PRIMARY KEY,
              operation VARCHAR(50) NOT NULL,
              target_type VARCHAR(100),
              target_id INT,
              old_value LONGTEXT,
              new_value LONGTEXT,
              user VARCHAR(100),
              ip_address VARCHAR(45),
              user_agent TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_operation (operation),
              INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
          
          await db.query(`
            CREATE TABLE IF NOT EXISTS metrics (
              id INT AUTO_INCREMENT PRIMARY KEY,
              metric_name VARCHAR(100) NOT NULL,
              metric_value DOUBLE NOT NULL,
              tags LONGTEXT,
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_metric_name (metric_name),
              INDEX idx_timestamp (timestamp)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
        }
      },
      {
        version: 2,
        name: 'create_indexes',
        up: async (db) => {
          try {
            await db.query(`
              CREATE INDEX idx_question_search ON qa_records(question(100));
            `);
          } catch (error) {
            // 索引可能已存在，忽略错误
          }
          
          try {
            await db.query(`
              CREATE INDEX idx_metrics_time ON metrics(timestamp, metric_name);
            `);
          } catch (error) {
            // 忽略
          }
        }
      },
      {
        version: 3,
        name: 'seed_default_data',
        up: async (db) => {
          // 插入默认AI网站
          console.log('  Migration 3: Checking ai_sites table...');
          
          // 先验证表是否存在
          try {
            const countResult = await db.query('SELECT COUNT(*) as cnt FROM ai_sites');
            console.log('  Debug: ai_sites count result:', JSON.stringify(countResult));
            const currentCount = countResult.length > 0 ? countResult[0].cnt || countResult[0].count : 0;
            console.log(`  Current ai_sites count: ${currentCount}`);
            
            if (currentCount === 0) {
              const defaultSites = [
                {
                  name: 'DeepSeek',
                  url: 'https://chat.deepseek.com',
                  selector: '[data-testid="conversation-turn-content"], .message-content',
                  input_selector: 'textarea[placeholder*="输入"], textarea[placeholder*="输入问题"]',
                  submit_selector: 'button[type="submit"], button[class*="send"]',
                  enabled: 1,
                  config: JSON.stringify({ waitTime: 3000 }),
                  provider_type: 'deepseek-web'
                },
                {
                  name: '通义千问',
                  url: 'https://tongyi.aliyun.com',
                  selector: '.message-content, .chat-message-content',
                  input_selector: 'textarea[placeholder*="输入"], textarea[placeholder*="问题"]',
                  submit_selector: 'button[type="submit"], button[class*="send"]',
                  enabled: 1,
                  config: JSON.stringify({ waitTime: 3000 }),
                  provider_type: 'qwen-web'
                },
                {
                  name: '豆包',
                  url: 'https://www.doubao.com',
                  selector: '.message-content',
                  input_selector: 'textarea[placeholder*="输入"]',
                  submit_selector: 'button[type="submit"]',
                  enabled: 0,
                  config: JSON.stringify({ waitTime: 4000 }),
                  provider_type: 'doubao-web'
                },
                {
                  name: '文心一言',
                  url: 'https://yiyan.baidu.com',
                  selector: '.message-content',
                  input_selector: 'textarea[placeholder*="输入"]',
                  submit_selector: 'button[type="submit"]',
                  enabled: 0,
                  config: JSON.stringify({ waitTime: 4000 }),
                  provider_type: 'yiyan-web'
                }
              ];
              
              for (const site of defaultSites) {
                await db.query(`
                  INSERT INTO ai_sites (name, url, selector, input_selector, submit_selector, 
                                        enabled, config, provider_type) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [site.name, site.url, site.selector, site.input_selector, site.submit_selector, 
                    site.enabled, site.config, site.provider_type]);
              }
              console.log('  ✓ Default AI sites inserted');
            } else {
              console.log('  ⊙ AI sites already exist, skipping');
            }
          } catch (err) {
            console.error('  ✗ Migration 3 error:', err.message);
            throw err;
          }
          
          // 插入默认API配置
          try {
            const [configs] = await db.query('SELECT COUNT(*) as cnt FROM api_config');
            const configCount = configs.length > 0 ? configs[0].cnt || configs[0].count : 0;
            
            if (configCount === 0) {
              const apiKey = db.generateApiKey();
              await db.query(`
                INSERT INTO api_config (api_key, port, enabled, rate_limit, rate_window) 
                VALUES (?, ?, ?, ?, ?)
              `, [apiKey, 8080, 1, 100, 60000]);
              console.log('  ✓ Default API config inserted');
            } else {
              console.log('  ⊙ API config already exists');
            }
          } catch (err) {
            console.error('  ✗ API config error:', err.message);
            throw err;
          }
        }
      },
      {
        version: 4,
        name: 'create_cache_tables',
        up: async (db) => {
          // 创建 response_cache 表
          await db.query(`
            CREATE TABLE IF NOT EXISTS response_cache (
              id INT AUTO_INCREMENT PRIMARY KEY,
              question_hash VARCHAR(64) NOT NULL,
              question_text TEXT,
              response_data LONGTEXT NOT NULL,
              hit_count INT DEFAULT 0,
              expires_at TIMESTAMP NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uk_question_hash (question_hash),
              INDEX idx_expires (expires_at),
              INDEX idx_hit_count (hit_count)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
          
          // 创建 provider_metrics 表
          await db.query(`
            CREATE TABLE IF NOT EXISTS provider_metrics (
              id INT AUTO_INCREMENT PRIMARY KEY,
              provider_type VARCHAR(100) NOT NULL,
              site_id INT,
              metric_name VARCHAR(100) NOT NULL,
              metric_value DOUBLE NOT NULL,
              tags LONGTEXT,
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_provider_metric (provider_type, metric_name, timestamp),
              INDEX idx_timestamp (timestamp)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
          
          // 创建 circuit_breaker_state 表
          await db.query(`
            CREATE TABLE IF NOT EXISTS circuit_breaker_state (
              id INT AUTO_INCREMENT PRIMARY KEY,
              circuit_key VARCHAR(255) NOT NULL,
              state ENUM('closed', 'open', 'half-open') DEFAULT 'closed',
              failures INT DEFAULT 0,
              last_failure_at TIMESTAMP NULL,
              last_success_at TIMESTAMP NULL,
              opened_at TIMESTAMP NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uk_circuit_key (circuit_key),
              INDEX idx_state (state)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
          `);
        }
      }
    ];

    this.migrations = migrations;
    
    let currentVersion = await this.getCurrentVersion();
    
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        try {
          await migration.up(this);
          await this.setVersion(migration.version);
          console.log(`Migration ${migration.version} completed`);
        } catch (error) {
          console.error(`Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }
    
    console.log('All migrations completed');
  }

  async getCurrentVersion() {
    try {
      let tables;
      
      if (this.dbType === 'mysql') {
        // MySQL: 查询 information_schema
        tables = await this.query(`
          SELECT TABLE_NAME 
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'migrations'
        `);
      } else {
        // SQLite: 查询 sqlite_master
        tables = await this.query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"
        );
      }
      
      if (tables.length === 0) {
        // 创建 migrations 表（如果不存在）
        await this.query(`
          CREATE TABLE IF NOT EXISTS migrations (
            version INT PRIMARY KEY,
            name VARCHAR(255),
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        return 0;
      }
      
      const [rows] = await this.query('SELECT MAX(version) as version FROM migrations');
      return rows[0].version || 0;
    } catch (error) {
      console.warn('Could not get migration version, assuming 0:', error.message);
      return 0;
    }
  }

  async setVersion(version) {
    await this.query(
      'INSERT INTO migrations (version) VALUES (?) ON DUPLICATE KEY UPDATE version = ?',
      [version, version]
    );
  }

  async query(sql, params = []) {
    if (!this.initialized) throw new Error('Database not initialized');

    if (this.dbType === 'mysql') {
      // mysql2 的 execute 返回 [rows, fields] 对于 SELECT，[result] 对于其他
      const result = await this.pool.execute(sql, params);
      // 检查第一个元素是否是行数组
      if (Array.isArray(result[0])) {
        return result[0]; // SELECT 返回的行
      } else {
        // 非查询语句返回空数组
        return [];
      }
    } else {
      return new Promise((resolve, reject) => {
        this.pool.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
  }

  async get(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async all(sql, params = []) {
    return await this.query(sql, params);
  }

  async run(sql, params = []) {
    if (!this.initialized) throw new Error('Database not initialized');

    if (this.dbType === 'mysql') {
      const [result] = await this.pool.execute(sql, params);
      return result;
    } else {
      return new Promise((resolve, reject) => {
        this.pool.run(sql, params, function(err, result) {
          if (err) reject(err);
          else resolve({ insertId: this.lastID, changes: this.changes });
        });
      });
    }
  }

  async transaction(callback) {
    if (this.dbType === 'mysql') {
      const connection = await this.pool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.pool.serialize(() => {
          this.pool.run('BEGIN TRANSACTION', (err) => {
            if (err) return reject(err);
            
            callback(this.pool)
              .then(result => {
                this.pool.run('COMMIT', (err) => {
                  if (err) return reject(err);
                  resolve(result);
                });
              })
              .catch(error => {
                this.pool.run('ROLLBACK', () => reject(error));
              });
          });
        });
      });
    }
  }

  async healthCheck() {
    try {
      const start = Date.now();
      await this.query('SELECT 1');
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  async getStats() {
    if (this.dbType === 'mysql') {
      const [status] = await this.query('SHOW STATUS LIKE "Connections"');
      const [threads] = await this.query('SHOW STATUS LIKE "Threads_connected"');
      return {
        type: 'mysql',
        totalConnections: parseInt(status[0].Value) || 0,
        activeConnections: parseInt(threads[0].Value) || 0,
        poolSize: this.config.connectionLimit
      };
    } else {
      return { type: 'sqlite', mode: 'file-based' };
    }
  }

  generateApiKey() {
    return `sk-${Date.now()}-${Buffer.from(Math.random().toString(36)).toString('hex').slice(0, 24)}`;
  }

  async close() {
    try {
      if (this.pool) {
        if (this.dbType === 'mysql') {
          await this.pool.end();
        } else {
          await new Promise(resolve => {
            this.pool.close((err) => {
              if (err) console.warn('Error closing SQLite:', err);
              resolve();
            });
          });
        }
        console.log('Database connection closed');
      }
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }

  async backup(backupPath) {
    if (this.dbType === 'mysql') {
      throw new Error('MySQL backup requires external tool');
    } else {
      const dbFile = this.sqlitePath;
      await fs.copyFile(dbFile, backupPath);
      console.log(`Database backed up to ${backupPath}`);
    }
  }

  async restore(backupPath) {
    if (this.dbType === 'sqlite') {
      await fs.copyFile(backupPath, this.sqlitePath);
      console.log(`Database restored from ${backupPath}`);
    } else {
      throw new Error('MySQL restore requires external tool');
    }
  }

  // ============ 业务操作方法 ============

  // AI网站相关操作
  async getAiSites() {
    return await this.all('SELECT * FROM ai_sites ORDER BY id');
  }

  async getEnabledAiSites() {
    return await this.all('SELECT * FROM ai_sites WHERE enabled = 1 ORDER BY id');
  }

  async saveAiSite(siteData) {
    if (siteData.id) {
      await this.run(`
        UPDATE ai_sites 
        SET name = ?, url = ?, selector = ?, input_selector = ?, submit_selector = ?, 
            enabled = ?, config = ?, provider_type = ?, auth_config = ?
        WHERE id = ?
      `, [
        siteData.name, siteData.url, siteData.selector, siteData.input_selector,
        siteData.submit_selector, siteData.enabled ? 1 : 0, 
        JSON.stringify(siteData.config || {}),
        siteData.provider_type || 'generic',
        JSON.stringify(siteData.auth_config || {}),
        siteData.id
      ]);
      return siteData.id;
    } else {
      const result = await this.run(`
        INSERT INTO ai_sites (name, url, selector, input_selector, submit_selector, 
                              enabled, config, provider_type, auth_config)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        siteData.name, siteData.url, siteData.selector, siteData.input_selector,
        siteData.submit_selector, siteData.enabled ? 1 : 0,
        JSON.stringify(siteData.config || {}),
        siteData.provider_type || 'generic',
        JSON.stringify(siteData.auth_config || {})
      ]);
      return result.insertId;
    }
  }

  async deleteAiSite(siteId) {
    await this.run('DELETE FROM ai_sites WHERE id = ?', [siteId]);
  }

  // 问答记录相关操作
  async saveQaRecord(recordData) {
    if (recordData.id) {
      await this.run(`
        UPDATE qa_records 
        SET question = ?, answers = ?, status = ?, error = ?, duration = ?
        WHERE id = ?
      `, [
        recordData.question,
        JSON.stringify(recordData.answers || []),
        recordData.status,
        recordData.error || null,
        recordData.duration || 0,
        recordData.id
      ]);
      return recordData.id;
    } else {
      const result = await this.run(`
        INSERT INTO qa_records (question, answers, status, error, duration)
        VALUES (?, ?, ?, ?, ?)
      `, [
        recordData.question,
        JSON.stringify(recordData.answers || []),
        recordData.status || 'pending',
        recordData.error || null,
        recordData.duration || 0
      ]);
      return result.insertId;
    }
  }

  async getHistory(limit = 50, offset = 0) {
    return await this.all(`
      SELECT * FROM qa_records 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);
  }

  async deleteHistoryRecord(recordId) {
    await this.run('DELETE FROM qa_records WHERE id = ?', [recordId]);
  }

  // API配置相关操作
  async getApiConfig() {
    return await this.get('SELECT * FROM api_config WHERE enabled = 1 LIMIT 1');
  }

  async saveApiConfig(configData) {
    if (configData.id) {
      await this.run(`
        UPDATE api_config 
        SET api_key = ?, port = ?, enabled = ?, rate_limit = ?, rate_window = ?
        WHERE id = ?
      `, [
        configData.api_key,
        configData.port || 8080,
        configData.enabled ? 1 : 0,
        configData.rate_limit || 100,
        configData.rate_window || 60000,
        configData.id
      ]);
      return configData.id;
    } else {
      const result = await this.run(`
        INSERT INTO api_config (api_key, port, enabled, rate_limit, rate_window)
        VALUES (?, ?, ?, ?, ?)
      `, [
        configData.api_key || this.generateApiKey(),
        configData.port || 8080,
        configData.enabled ? 1 : 0,
        configData.rate_limit || 100,
        configData.rate_window || 60000
      ]);
      return result.insertId;
    }
  }

  // Cookie相关操作
  async saveCookies(siteKey, cookies) {
    await this.run(`
      INSERT INTO cookies (site_key, cookies_data) 
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE cookies_data = ?, updated_at = NOW()
    `, [siteKey, JSON.stringify(cookies), JSON.stringify(cookies)]);
  }

  async loadCookies(siteKey) {
    const rows = await this.all(
      'SELECT cookies_data FROM cookies WHERE site_key = ? ORDER BY updated_at DESC LIMIT 1',
      [siteKey]
    );
    return rows.length > 0 ? JSON.parse(rows[0].cookies_data) : null;
  }

  // 审计日志
  async logAudit(operation, targetType, targetId, oldValue, newValue, user, ip, userAgent) {
    await this.run(`
      INSERT INTO audit_log (operation, target_type, target_id, old_value, new_value, user, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      operation,
      targetType,
      targetId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      user,
      ip,
      userAgent
    ]);
  }

  // 性能指标
  async recordMetric(name, value, tags = {}) {
    await this.run(`
      INSERT INTO metrics (metric_name, metric_value, tags)
      VALUES (?, ?, ?)
    `, [name, value, JSON.stringify(tags)]);
  }

  // 统计查询
  async getStatsSummary() {
    const [siteStats] = await this.query(`
      SELECT 
        COUNT(*) as total,
        SUM(enabled) as enabled,
        COUNT(CASE WHEN enabled = 0 THEN 1 END) as disabled
      FROM ai_sites
    `);
    
    const [recordStats] = await this.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(duration) as avg_duration
      FROM qa_records
    `);
    
    return {
      sites: siteStats[0],
      records: recordStats[0]
    };
  }
}

module.exports = { DatabaseManager };