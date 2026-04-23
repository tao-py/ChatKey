const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkApiConfig() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ChatKey@2024'
  });

  await connection.query('USE ai_qa_comparison');
  
  const [rows] = await connection.query('SELECT * FROM api_config');
  console.log('API Config 表内容:');
  console.log(JSON.stringify(rows, null, 2));
  
  // 检查ai_sites
  const [sites] = await connection.query('SELECT id, name, enabled FROM ai_sites');
  console.log('\nAI Sites:');
  console.log(JSON.stringify(sites, null, 2));
  
  await connection.end();
}

checkApiConfig().catch(console.error);