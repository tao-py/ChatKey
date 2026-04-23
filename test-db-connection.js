const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  console.log('测试数据库连接...');
  console.log(`主机: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`用户: ${process.env.DB_USER}`);
  console.log(`数据库: ${process.env.DB_NAME}`);
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'ChatKey@2024',
      connectTimeout: 30000
    });
    
    console.log('✅ 连接成功！');
    const [rows] = await connection.query('SELECT 1+1 AS result');
    console.log('查询结果:', rows);
    await connection.end();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    console.error('错误码:', error.code);
  }
}

testConnection();