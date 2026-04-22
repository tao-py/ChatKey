/**
 * 数据库 Schema 更新 - 兼容旧版本 MySQL
 */

const mysql = require('mysql2/promise');

async function updateSchema() {
  console.log('Updating database schema for Provider system...');
  
  const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'tao@1999',
    multipleStatements: true
  };

  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    await connection.query('USE ai_qa_comparison;');
    
    // 检查并添加字段
    console.log('Updating ai_sites table...');
    
    // 检查字段是否存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ai_qa_comparison' 
        AND TABLE_NAME = 'ai_sites'
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('Existing columns:', existingColumns);
    
    // 添加 provider_type 字段
    if (!existingColumns.includes('provider_type')) {
      await connection.query(`
        ALTER TABLE ai_sites 
        ADD COLUMN provider_type VARCHAR(100) DEFAULT 'generic' AFTER config
      `);
      console.log('  ✓ Added provider_type column');
    } else {
      console.log('  ✓ provider_type already exists');
    }
    
    // 添加 auth_config 字段
    if (!existingColumns.includes('auth_config')) {
      await connection.query(`
        ALTER TABLE ai_sites 
        ADD COLUMN auth_config LONGTEXT AFTER provider_type
      `);
      console.log('  ✓ Added auth_config column');
    } else {
      console.log('  ✓ auth_config already exists');
    }
    
    // 添加 version 字段
    if (!existingColumns.includes('version')) {
      await connection.query(`
        ALTER TABLE ai_sites 
        ADD COLUMN version VARCHAR(20) DEFAULT '1.0' AFTER auth_config
      `);
      console.log('  ✓ Added version column');
    } else {
      console.log('  ✓ version already exists');
    }
    
    // 添加索引（如果不存在）
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'ai_qa_comparison' 
        AND TABLE_NAME = 'ai_sites'
    `);
    
    const existingIndexes = indexes.map(idx => idx.INDEX_NAME);
    
    if (!existingIndexes.includes('idx_provider_type')) {
      await connection.query(`
        CREATE INDEX idx_provider_type ON ai_sites(provider_type)
      `);
      console.log('  ✓ Added idx_provider_type index');
    } else {
      console.log('  ✓ idx_provider_type already exists');
    }
    
    // 2. 创建 response_cache 表
    console.log('Creating response_cache table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS response_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_hash VARCHAR(64) NOT NULL,
        question_text TEXT,
        response_data LONGTEXT NOT NULL,
        hit_count INT DEFAULT 0,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_question_hash (question_hash),
        INDEX idx_expires (expires_at),
        INDEX idx_hit_count (hit_count)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('  ✓ response_cache table created/verified');
    
    // 3. 创建 provider_metrics 表
    console.log('Creating provider_metrics table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS provider_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_type VARCHAR(100) NOT NULL,
        site_id INT,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DOUBLE NOT NULL,
        tags LONGTEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_provider_metric (provider_type, metric_name, timestamp),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('  ✓ provider_metrics table created/verified');
    
    // 4. 创建 circuit_breaker_state 表
    console.log('Creating circuit_breaker_state table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS circuit_breaker_state (
        id INT AUTO_INCREMENT PRIMARY KEY,
        circuit_key VARCHAR(255) NOT NULL,
        state ENUM('closed', 'open', 'half-open') DEFAULT 'closed',
        failures INT DEFAULT 0,
        last_failure_at TIMESTAMP NULL,
        last_success_at TIMESTAMP NULL,
        opened_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_circuit_key (circuit_key),
        INDEX idx_state (state)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('  ✓ circuit_breaker_state table created/verified');
    
    // 5. 更新现有记录的 provider_type
    console.log('Updating existing sites with provider types...');
    const siteUpdates = [
      { name: 'DeepSeek', type: 'deepseek-web' },
      { name: '通义千问', type: 'qwen-web' },
      { name: '豆包', type: 'doubao-web' },
      { name: '文心一言', type: 'yiyan-web' }
    ];
    
    for (const update of siteUpdates) {
      const [result] = await connection.query(
        'UPDATE ai_sites SET provider_type = ? WHERE name = ? AND (provider_type IS NULL OR provider_type = "generic")',
        [update.type, update.name]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✓ Updated ${update.name} -> ${update.type}`);
      } else {
        console.log(`  ⊙ ${update.name} already has provider type`);
      }
    }
    
    console.log('✅ Schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行
if (require.main === module) {
  updateSchema().catch(err => {
    console.error('Update failed:', err);
    process.exit(1);
  });
}

module.exports = { updateSchema };