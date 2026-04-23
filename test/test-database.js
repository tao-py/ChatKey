/**
 * 独立测试文件：Database
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  try {
    const { DatabaseManager } = require('../src/shared/database');
    const db = new DatabaseManager();
    
    console.log('Initializing database...');
    await db.init();
    
    // 测试查询
    const result = await db.query('SELECT 1 as test');
    if (!result || result.length === 0) {
      throw new Error('Query returned no results');
    }
    console.log('✓ Basic query OK:', result[0]);
    
    // 测试表存在
    const tables = await db.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()"
    );
    console.log('✓ Tables:', tables.map(t => t.TABLE_NAME).join(', '));
    
    // 测试 AI 网站查询
    const sites = await db.getAiSites();
    console.log(`✓ Found ${sites.length} AI sites`);
    
    if (sites.length > 0) {
      console.log('  Site details:');
      sites.forEach(s => {
        console.log(`    - ${s.name} (${s.provider_type || 'generic'}, enabled: ${s.enabled})`);
      });
    }
    
    await db.close();
    console.log('✅ PASS');
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

run();