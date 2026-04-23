const mysql = require('mysql2/promise');
require('dotenv').config();

async function getValidApiKey() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ChatKey@2024'
  });

  await connection.query('USE ai_qa_comparison');
  
  const [rows] = await connection.query(
    'SELECT api_key FROM api_config WHERE enabled = 1 ORDER BY id DESC LIMIT 1'
  );
  
  if (rows.length > 0) {
    console.log('✅ 获取到有效API密钥:', rows[0].api_key);
    process.stdout.write(rows[0].api_key);
  } else {
    console.error('❌ 未找到有效的API配置');
    process.exit(1);
  }
  
  await connection.end();
}

getValidApiKey().catch(console.error);