const mysql = require('mysql2/promise');
const { open } = require('sqlite');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.db = null; // 用于SQLite
    this.config = this.getDbConfig();
    this.type = process.env.DB_TYPE || 'mysql'; // 添加数据库类型判断
  }
