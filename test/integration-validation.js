/**
 * ChatKey 系统集成验证脚本
 * 验证核心功能和网页自动化流程
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runIntegrationTests() {
  console.log('🚀 ChatKey 集成测试开始\n');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    console.log(`\n📋 ${name}`);
    try {
      await fn();
      console.log(`   ✅ PASS`);
      passed++;
    } catch (error) {
      console.error(`   ❌ FAIL:`, error.message);
      failed++;
    }
  }

  // 测试 1: 数据库连接和迁移
  await test('数据库初始化', async () => {
    const { DatabaseManager } = require('../src/shared/database');
    const db = new DatabaseManager();
    await db.init();
    
    const tables = await db.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()"
    );
    const tableNames = tables.map(t => t.TABLE_NAME);
    
    const required = ['ai_sites', 'qa_records', 'api_config', 'response_cache'];
    for (const req of required) {
      if (!tableNames.includes(req)) {
        throw new Error(`Missing table: ${req}`);
      }
    }
    
    console.log(`   发现 ${tables.length} 个表`);
    await db.close();
  });

  // 测试 2: Provider 注册
  await test('Provider 注册系统', async () => {
    const { providerRegistry } = require('../src/shared/providers');
    const types = providerRegistry.getRegisteredTypes();
    
    if (types.length < 4) throw new Error(`Expected 4+ providers, got ${types.length}`);
    
    for (const type of types) {
      const info = providerRegistry.getProviderInfo(type);
      if (!info.capabilities) throw new Error(`Provider ${type} missing capabilities`);
    }
    
    console.log(`   已注册 ${types.length} 个 Provider`);
  });

  // 测试 3: 配置管理
  await test('配置管理', async () => {
    const { ConfigManager } = require('../src/shared/config');
    const { DatabaseManager } = require('../src/shared/database');
    
    const db = new DatabaseManager();
    await db.init();
    const config = new ConfigManager(db);
    
    await config.set('test.key1', 'value1');
    const v1 = await config.get('test.key1');
    if (v1 !== 'value1') throw new Error('Config get/set failed');
    
    const v2 = await config.get('nonexistent', 'default');
    if (v2 !== 'default') throw new Error('Default value failed');
    
    await db.close();
    console.log(`   配置读写正常`);
  });

  // 测试 4: AnswerAdapter 格式化
  await test('回答格式化', async () => {
    const { AnswerAdapter } = require('../src/main/answer-adapter');
    
    const testCases = [
      { text: '```python\nprint(1)\n```', expectCode: true, expectLang: 'python' },
      { text: '```javascript\nconst x=1;\n```', expectCode: true, expectLang: 'javascript' },
      { text: '你好世界', expectCode: false, expectLang: 'zh' },
      { text: 'Hello world', expectCode: false, expectLang: 'en' },
      { text: 'Hello 世界', expectCode: false, expectLang: 'mixed' }
    ];
    
    for (const tc of testCases) {
      const result = AnswerAdapter.adapt(tc.text, 'test');
      const hasCode = result.codeBlocks && result.codeBlocks.length > 0;
      if (hasCode !== tc.expectCode) {
        throw new Error(`Code detection failed: ${tc.text.substring(0, 20)}`);
      }
      if (tc.expectLang && result.language !== tc.expectLang) {
        throw new Error(`Lang mismatch: expected ${tc.expectLang}, got ${result.language}`);
      }
    }
    
    console.log(`   通过 ${testCases.length} 个格式化测试`);
  });

  // 测试 5: 浏览器自动化初始化
  await test('浏览器自动化初始化', async () => {
    const { BrowserAutomation } = require('../src/main/browser-automation');
    const auto = new BrowserAutomation();
    
    await auto.init();
    const status = await auto.getStatus();
    
    if (!status.initialized) throw new Error('Browser not initialized');
    if (!status.pages) throw new Error('Pages status missing');
    
    await auto.close();
    console.log(`   浏览器状态正常`);
  });

  // 测试 6: 缓存系统
  await test('缓存系统', async () => {
    const { QuestionProcessor } = require('../src/main/question-processor');
    const processor = new QuestionProcessor();
    await processor.init();
    
    const hash1 = processor.responseCache.hashQuestion('test');
    const hash2 = processor.responseCache.hashQuestion('test');
    const hash3 = processor.responseCache.hashQuestion('different');
    
    if (hash1 !== hash2) throw new Error('Hash mismatch for same question');
    if (hash1 === hash3) throw new Error('Hash collision');
    
    await processor.close();
    console.log(`   缓存哈希正常`);
  });

  // 测试 7: 熔断器
  await test('熔断器机制', async () => {
    const { QuestionProcessor } = require('../src/main/question-processor');
    const processor = new QuestionProcessor();
    await processor.init();
    
    const cb = processor.circuitBreaker;
    const key = 'test-circuit';
    
    if (cb.isOpen(key)) throw new Error('Circuit should be closed initially');
    
    for (let i = 0; i < 6; i++) {
      cb.recordFailure(key);
    }
    
    if (!cb.isOpen(key)) throw new Error('Circuit should be open after threshold failures');
    
    await processor.close();
    console.log(`   熔断器正常 (阈值: 5)`);
  });

  // 测试 8: API 网关路由
  await test('API 网关路由', async () => {
    const { ApiGateway } = require('../src/api/server');
    const gateway = new ApiGateway();
    
    const routes = [];
    gateway.app._router.stack.forEach(layer => {
      if (layer.route) {
        routes.push(`${Object.keys(layer.route.methods)[0]} ${layer.route.path}`);
      }
    });
    
    const expectedPaths = ['/health', '/v1/chat/completions', '/v1/models', '/providers', '/stats'];
    for (const ep of expectedPaths) {
      if (!routes.some(r => r.includes(ep))) {
        throw new Error(`Missing route: ${ep}`);
      }
    }
    
    console.log(`   注册了 ${routes.length} 个路由`);
  });

  // 测试 9: 回答聚合逻辑
  await test('回答聚合逻辑', async () => {
    const { ApiGateway } = require('../src/api/server');
    const gateway = new ApiGateway();
    
    const mockResults = [
      { site: 'DeepSeek', status: 'success', answer: 'DeepSeek 回答', adaptedAnswer: { formattedText: 'DS 回答' } },
      { site: '通义千问', status: 'success', answer: '通义回答', adaptedAnswer: { formattedText: '通义回答' } }
    ];
    
    const aggregated = gateway.aggregateAnswers(mockResults);
    
    if (!aggregated.includes('DeepSeek')) throw new Error('Missing DeepSeek in aggregation');
    if (!aggregated.includes('通义千问')) throw new Error('Missing Tongyi in aggregation');
    
    console.log(`   聚合逻辑正常`);
  });

  // 测试 10: 性能指标
  await test('性能指标收集', async () => {
    const { QuestionProcessor } = require('../src/main/question-processor');
    const processor = new QuestionProcessor();
    await processor.init();
    
    await processor.recordMetric('test.metric', 42, { foo: 'bar' });
    
    const stats = await processor.getStatsSummary();
    if (!stats) throw new Error('No stats returned');
    
    await processor.close();
    console.log(`   指标收集正常`);
  });

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
  
  if (failed === 0) {
    console.log('🎉 所有集成测试通过！ChatKey 系统运行正常。');
    console.log('\n✅ 关键特性已验证:');
    console.log('   • Provider 插件化架构');
    console.log('   • 统一配置管理');
    console.log('   • 智能回答格式化');
    console.log('   • 浏览器自动化');
    console.log('   • 缓存和熔断');
    console.log('   • API 网关');
  } else {
    console.log('⚠️  部分测试失败，请检查上述错误。');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// 运行测试
runIntegrationTests().catch(err => {
  console.error('测试运行器错误:', err);
  process.exit(1);
});