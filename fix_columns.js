const mysql = require('mysql2/promise');

async function addMissingColumns() {
  const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'tao@1999',
    database: 'ai_qa_comparison'
  };

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to MySQL');

    // 检查并添加 rate_limit 列
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'api_config' AND COLUMN_NAME = 'rate_limit'
    `, [config.database]);
    
    if (columns.length === 0) {
      await connection.query(`ALTER TABLE api_config ADD COLUMN rate_limit INT DEFAULT 100`);
      console.log('✓ Added rate_limit column');
    } else {
      console.log('⊝ rate_limit column already exists');
    }

    // 检查并添加 rate_window 列
    const [columns2] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'api_config' AND COLUMN_NAME = 'rate_window'
    `, [config.database]);
    
    if (columns2.length === 0) {
      await connection.query(`ALTER TABLE api_config ADD COLUMN rate_window INT DEFAULT 60000`);
      console.log('✓ Added rate_window column');
    } else {
      console.log('⊝ rate_window column already exists');
    }

    console.log('✅ All columns are now present');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

addMissingColumns().catch(console.error);