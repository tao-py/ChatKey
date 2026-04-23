const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSites() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ChatKey@2024'
  });
  
  await connection.query('USE ai_qa_comparison');
  
  const [sites] = await connection.query('SELECT id, name, provider_type, enabled FROM ai_sites');
  console.log('AI Sites 详细:');
  console.log(JSON.stringify(sites, null, 2));
  
  await connection.end();
}

checkSites().catch(console.error);