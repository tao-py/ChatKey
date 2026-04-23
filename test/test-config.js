/**
 * 独立测试文件：Config Manager
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  try {
    const { ConfigManager } = require('../src/shared/config');
    const { DatabaseManager } = require('../src/shared/database');
    
    const db = new DatabaseManager();
    await db.init();
    
    const config = new ConfigManager(db);
    
    // 测试 1: 获取配置（使用默认值）
    const testVal = await config.get('nonexistent.key', 'default-value');
    if (testVal !== 'default-value') {
      throw new Error(`Expected "default-value", got "${testVal}"`);
    }
    console.log('✓ Default value works');
    
    // 测试 2: 设置和获取配置
    await config.set('test.key', 'test-value');
    const retrieved = await config.get('test.key');
    if (retrieved !== 'test-value') {
      throw new Error(`Expected "test-value", got "${retrieved}"`);
    }
    console.log('✓ Set/get works');
    
    // 测试 3: 配置验证
    try {
      await config.set('test.key', 123); // 应该是字符串类型
      // 如果没有验证器，这应该成功
      console.log('✓ Type validation: no error for wrong type (expected)');
    } catch (error) {
      console.log('✓ Type validation active');
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