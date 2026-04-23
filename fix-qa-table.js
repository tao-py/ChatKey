const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixQaRecordsTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ChatKey@2024'
  });
  
  await connection.query('USE ai_qa_comparison');
  
  console.log('🔧 修复 qa_records 表结构...');
  
  // 添加缺失字段
  try {
    await connection.query('ALTER TABLE qa_records ADD COLUMN error TEXT AFTER status');
    console.log('✅ 添加 error 字段');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ error 字段已存在');
    } else {
      console.error('❌ 添加 error 字段失败:', e.message);
    }
  }
  
  try {
    await connection.query('ALTER TABLE qa_records ADD COLUMN duration INT DEFAULT 0 AFTER error');
    console.log('✅ 添加 duration 字段');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ duration 字段已存在');
    } else {
      console.error('❌ 添加 duration 字段失败:', e.message);
    }
  }
  
  try {
    await connection.query('ALTER TABLE qa_records ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
    console.log('✅ 添加 updated_at 字段');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ updated_at 字段已存在');
    } else {
      console.error('❌ 添加 updated_at 字段失败:', e.message);
    }
  }
  
  // 验证结果
  const [columns] = await connection.query('DESCRIBE qa_records');
  console.log('\n📋 修复后的表结构:');
  console.log(JSON.stringify(columns, null, 2));
  
  await connection.end();
  console.log('\n✅ 表结构修复完成！');
}

fixQaRecordsTable().catch(console.error);