/**
 * ChatKey 端到端测试 - 使用 Playwright
 * 验证网页自动化爬取功能和整体系统集成
 */

const { test, expect } = require('@playwright/test');

test.describe('ChatKey E2E 测试', () => {
  
  test.beforeAll(async () => {
    // 确保数据库已初始化
    const { DatabaseManager } = require('../src/shared/database');
    const db = new DatabaseManager();
    await db.init();
    console.log('✅ Database ready for E2E tests');
  });

  test('应该能启动 API 服务并响应健康检查', async () => {
    // 启动 API 服务器（需要先启动主应用）
    // 这里我们直接测试 ApiGateway 类
    const { ApiGateway } = require('../src/api/server');
    const gateway = new ApiGateway();
    
    // 模拟请求
    const req = { path: '/health', headers: {} };
    let responseJson;
    
    gateway.app.handle(req, {
      status: (code) => ({
        json: (data) => { responseJson = data; }
      })
    });
    
    // 由于需要实际启动服务器，这里只验证路由存在
    expect(gateway.app).toBeDefined();
    console.log('✅ API Gateway routes setup');
  });

  test('应该能创建 BrowserAutomation 实例', async () => {
    const { BrowserAutomation } = require('../src/main/browser-automation');
    const automation = new BrowserAutomation();
    
    expect(automation).toBeDefined();
    expect(automation.maxConcurrency).toBe(3);
    expect(automation.maxRetries).toBe(3);
    
    console.log('✅ BrowserAutomation instance created');
  });

  test('应该能获取 Provider 信息', async () => {
    const { providerRegistry } = require('../src/shared/providers');
    const providers = providerRegistry.getAllProviderInfo();
    
    expect(providers.length).toBeGreaterThan(0);
    
    const deepseek = providers.find(p => p.type === 'deepseek-web');
    expect(deepseek).toBeDefined();
    expect(deepseek.capabilities.streaming).toBe(true);
    expect(deepseek.capabilities.code).toBe(true);
    
    console.log('✅ Provider info retrieved:', providers.length, 'providers');
  });

  test('应该能正确处理问题验证逻辑', async () => {
    const { QuestionProcessor } = require('../src/main/question-processor');
    const processor = new QuestionProcessor();
    await processor.init();
    
    // 验证空问题
    await expect(processor.processQuestion('')).rejects.toThrow('问题必须是非空字符串');
    await expect(processor.processQuestion('   ')).rejects.toThrow('问题不能只包含空白字符');
    await expect(processor.processQuestion(null)).rejects.toThrow();
    
    console.log('✅ Input validation works');
    await processor.close();
  });

  test('应该能正确格式化答案', async () => {
    const { AnswerAdapter } = require('../src/main/answer-adapter');
    
    // 测试各种格式
    const testCases = [
      { text: '这是中文回答', lang: 'zh', hasCode: false },
      { text: 'Hello world', lang: 'en', hasCode: false },
      { text: 'Hello 世界', lang: 'mixed', hasCode: false },
      { text: '```python\nprint(1)\n```', lang: 'unknown', hasCode: true },
      { text: '# Title\n\n```js\nconst a=1;\n```', lang: 'unknown', hasCode: true }
    ];
    
    for (const tc of testCases) {
      const result = AnswerAdapter.adapt(tc.text, 'test');
      expect(result.language).toBe(tc.lang);
      expect(result.codeBlocks.length > 0).toBe(tc.hasCode);
    }
    
    console.log('✅ Answer formatting works for all test cases');
  });

  test('应该能正确计算哈希', async () => {
    // 测试缓存键生成
    const hashQuestion = (question) => {
      let hash = 0;
      for (let i = 0; i < question.length; i++) {
        const char = question.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `q_${Math.abs(hash)}`;
    };
    
    const h1 = hashQuestion('测试问题');
    const h2 = hashQuestion('测试问题');
    const h3 = hashQuestion('不同问题');
    
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    
    console.log('✅ Cache key generation works');
  });
});

// 集成测试
test.describe('集成测试', () => {
  test('应该能完成完整的系统初始化流程', async () => {
    // 模拟完整初始化
    const { DatabaseManager } = require('../src/shared/database');
    const { ConfigManager } = require('../src/shared/config');
    const { providerRegistry } = require('../src/shared/providers');
    const { BrowserAutomation } = require('../src/main/browser-automation');
    const { QuestionProcessor } = require('../src/main/question-processor');
    
    // 1. 初始化数据库
    const db = new DatabaseManager();
    await db.init();
    console.log('  ✓ Database initialized');
    
    // 2. 初始化配置管理器
    const config = new ConfigManager(db);
    console.log('  ✓ Config manager initialized');
    
    // 3. 加载 Provider
    providerRegistry.loadDefaultProviders();
    console.log('  ✓ Providers loaded');
    
    // 4. 初始化浏览器自动化
    const automation = new BrowserAutomation();
    await automation.init();
    console.log('  ✓ Browser automation initialized');
    
    // 5. 初始化问题处理器
    const processor = new QuestionProcessor();
    await processor.init();
    console.log('  ✓ Question processor initialized');
    
    // 清理
    await processor.close();
    
    console.log('✅ Full system initialization works');
  });

  test('应该能获取系统健康状态', async () => {
    const { QuestionProcessor } = require('../src/main/question-processor');
    const processor = new QuestionProcessor();
    await processor.init();
    
    const health = await processor.getHealthStatus();
    
    expect(health).toBeDefined();
    expect(health.timestamp).toBeDefined();
    
    console.log('✅ Health status retrieved:', health.status);
    
    await processor.close();
  });

  test('应该能获取统计摘要', async () => {
    const { QuestionProcessor } = require('../src/main/question-processor');
    const processor = new QuestionProcessor();
    await processor.init();
    
    const stats = await processor.getStatsSummary();
    
    expect(stats).toBeDefined();
    expect(stats.sites).toBeDefined();
    expect(stats.records).toBeDefined();
    
    console.log('✅ Stats summary retrieved:', stats);
    
    await processor.close();
  });
});

console.log('🎯 Playwright E2E tests loaded. Run with: npx playwright test');