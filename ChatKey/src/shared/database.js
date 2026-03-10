const mysql = require('mysql2/promise');
const { open } = require('sqlite');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.db = null; // 用于SQLite
    this.config = this.getDbConfig();
    this.type = process.env.DB_TYPE || 'mysql'; // 添加数据库类型判断
  }

  // 初始化数据库连接
  async init() {
    if (this.type === 'mysql') {
      this.pool = mysql.createPool(this.config);
    } else if (this.type === 'sqlite') {
      this.db = await open(this.config);
    }
  }

  // 获取数据库连接或池
  getConnection() {
    if (this.type === 'mysql') {
      return this.pool;
    } else if (this.type === 'sqlite') {
      return this.db;
    }
    throw new Error(`不支持的数据库类型: ${this.type}`);
  }

  // 获取数据库配置
  getDbConfig() {
    if (this.type === 'mysql') {
      return {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'chatkey',
        port: parseInt(process.env.DB_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      };
    } else if (this.type === 'sqlite') {
      return {
        filename: process.env.DB_FILE || './chatkey.sqlite',
        driver: require('sqlite3').Database
      };
    }
    throw new Error(`不支持的数据库类型: ${this.type}`);
  }

  // 关闭数据库连接
  async close() {
    if (this.type === 'mysql' && this.pool) {
      await this.pool.end();
    } else if (this.type === 'sqlite' && this.db) {
      await this.db.close();
    }
  }
}

// 导出 DatabaseManager 类以避免未使用错误
module.exports = DatabaseManager;