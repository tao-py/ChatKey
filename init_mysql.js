/**
 * 初始化MySQL数据库
 * 用于创建数据库和表结构
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
  console.log('开始初始化MySQL数据库...');
  
  // MySQL连接配置 - 从环境变量读取
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ChatKey@2024',
    connectTimeout: 30000
  };

  let connection;
  
  try {
    console.log('正在连接到MySQL服务器...');
    connection = await mysql.createConnection(config);
    console.log('连接成功！');
    
    // 创建数据库
    console.log('正在创建数据库 ai_qa_comparison...');
    await connection.query('CREATE DATABASE IF NOT EXISTS `ai_qa_comparison` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('数据库创建成功！');
    
    // 切换到目标数据库
    await connection.query('USE `ai_qa_comparison`;');
    
    // 创建AI网站配置表
    console.log('正在创建 ai_sites 表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`ai_sites\` (
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
    console.log('ai_sites 表创建成功！');
    
    // 创建问答记录表
    console.log('正在创建 qa_records 表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`qa_records\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        answers LONGTEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('qa_records 表创建成功！');
    
    // 创建API配置表
    console.log('正在创建 api_config 表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`api_config\` (
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
    console.log('api_config 表创建成功！');
    
    // 插入默认AI网站配置
    console.log('正在插入默认AI网站配置...');
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
      const [rows] = await connection.query(
        'SELECT id FROM ai_sites WHERE name = ?',
        [site.name]
      );
      
      if (rows.length === 0) {
        await connection.query(
          'INSERT INTO ai_sites (name, url, selector, input_selector, submit_selector, enabled, config) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [site.name, site.url, site.selector, site.input_selector, site.submit_selector, site.enabled, site.config]
        );
        console.log(`已插入默认网站: ${site.name}`);
      } else {
        console.log(`网站 ${site.name} 已存在，跳过`);
      }
    }
    
    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase().catch(err => {
    console.error('初始化失败:', err);
    process.exit(1);
  });
}

module.exports = { initDatabase };