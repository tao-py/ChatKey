const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixProviderTypes() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ChatKey@2024'
  });
  
  await connection.query('USE ai_qa_comparison');
  
  console.log('🔧 修复 provider_type 值...');
  
  // 更新 DeepSeek
  await connection.query(
    "UPDATE ai_sites SET provider_type = 'deepseek-web' WHERE name = 'DeepSeek'"
  );
  console.log('✅ DeepSeek -> deepseek-web');
  
  // 更新通义千问
  await connection.query(
    "UPDATE ai_sites SET provider_type = 'qwen-web' WHERE name = '通义千问'"
  );
  console.log('✅ 通义千问 -> qwen-web');
  
  // 更新豆包
  await connection.query(
    "UPDATE ai_sites SET provider_type = 'doubao-web' WHERE name = '豆包'"
  );
  console.log('✅ 豆包 -> doubao-web');
  
  // 更新文心一言
  await connection.query(
    "UPDATE ai_sites SET provider_type = 'yiyan-web' WHERE name = '文心一言'"
  );
  console.log('✅ 文心一言 -> yiyan-web');
  
  // 验证
  const [sites] = await connection.query('SELECT name, provider_type FROM ai_sites');
  console.log('\n📋 修复后的provider_type:');
  sites.forEach(s => console.log(`   ${s.name}: ${s.provider_type}`));
  
  await connection.end();
  console.log('\n✅ Provider类型修复完成！');
}

fixProviderTypes().catch(console.error);