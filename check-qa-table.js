const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ChatKey@2024'
  });
  
  await connection.query('USE ai_qa_comparison');
  
  console.log('📋 qa_records 表结构:');
  const [columns] = await connection.query('DESCRIBE qa_records');
  console.log(JSON.stringify(columns, null, 2));
  
  console.log('\n📊 表创建语句:');
  const [show] = await connection.query("SHOW CREATE TABLE qa_records");
  console.log(show[0]['Create Table']);
  
  await connection.end();
}

checkTable().catch(console.error);