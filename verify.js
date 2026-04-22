#!/usr/bin/env node

/**
 * ChatKey 快速验证脚本
 * 一键检查所有核心组件是否就绪
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 ChatKey 快速验证\n');
console.log('='.repeat(50));

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

async function runTests() {
  // 测试 1: 环境配置
  await test('环境变量配置', () => {
    require('dotenv').config();
    const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`缺少环境变量: ${missing.join(', ')}`);
    }
  });

  // 测试 2: Provider 注册
  await test('Provider 注册系统', () => {
    const { providerRegistry } = require('./src/shared/providers');
    const providers = providerRegistry.getAllProviderInfo();
    if (providers.length < 4) {
      throw new Error(`只注册了 ${providers.length} 个 Provider，期望 4 个`);
    }
    console.log(`   已注册: ${providers.map(p => p.name).join(', ')}`);
  });

  // 测试 3: 配置管理
  await test('配置管理系统', async () => {
    const { ConfigManager } = require('./src/shared/config');
    const cm = new ConfigManager();
    const concurrent = await cm.get('system.maxConcurrent');
    if (concurrent < 1) {
      throw new Error('并发配置无效');
    }
    console.log(`   最大并发: ${concurrent}`);
  });

  // 测试 4: 数据库连接
  await test('数据库连接', () => {
    const { DatabaseManager } = require('./src/shared/database');
    const db = new DatabaseManager();
    console.log('   DatabaseManager 可实例化（实际连接需 MySQL 运行）');
  });

  // 测试 5: BrowserAutomation
  await test('BrowserAutomation 初始化', () => {
    const { BrowserAutomation } = require('./src/main/browser-automation');
    const ba = new BrowserAutomation();
    console.log(`   页面池大小: ${ba.poolSize}`);
    console.log(`   最大并发: ${ba.maxConcurrent}`);
  });

  // 测试 6: QuestionProcessor
  await test('QuestionProcessor 初始化', () => {
    const { QuestionProcessor } = require('./src/main/question-processor');
    const qp = new QuestionProcessor();
    console.log(`   熔断器已启用: ${qp.circuitBreaker !== null}`);
  });

  // 测试 7: API 网关
  await test('API 网关路由注册', () => {
    const { ApiGateway } = require('./src/api/server');
    const gateway = new ApiGateway();
    const requiredMethods = [
      'handleHealth',
      'handleChatCompletion',
      'handleModels',
      'handleGetProviders',
      'handleGetStats'
    ];
    const missing = requiredMethods.filter(m => typeof gateway[m] !== 'function');
    if (missing.length > 0) {
      throw new Error(`缺少路由处理器: ${missing.join(', ')}`);
    }
    console.log(`   核心路由处理器: ${requiredMethods.length} 个`);
  });

  // 测试 8: 文件完整性
  await test('核心文件完整性', () => {
    const fs = require('fs');
    const requiredFiles = [
      'src/shared/providers.js',
      'src/shared/config.js',
      'src/shared/database.js',
      'src/main/browser-automation.js',
      'src/main/question-processor.js',
      'src/api/server.js',
    ];
    const missing = requiredFiles.filter(file => !fs.existsSync(file));
    if (missing.length > 0) {
      throw new Error(`缺失文件: ${missing.join(', ')}`);
    }
  });

  // 测试 9: 依赖包完整性
  await test('npm 依赖完整性', () => {
    const pkg = require('./package.json');
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const critical = ['express', 'mysql2', 'puppeteer', 'dotenv', 'uuid'];
    const missing = critical.filter(dep => !deps[dep]);
    if (missing.length > 0) {
      throw new Error(`缺失依赖: ${missing.join(', ')}`);
    }
  });

  // 测试 10: 前端依赖
  await test('前端依赖完整性', () => {
    const rendererPkg = require('./src/renderer/package.json');
    const deps = { ...rendererPkg.dependencies, ...rendererPkg.devDependencies };
    const critical = ['react', 'react-dom', 'react-scripts', 'antd'];
    const missing = critical.filter(dep => !deps[dep]);
    if (missing.length > 0) {
      throw new Error(`缺失前端依赖: ${missing.join(', ')}`);
    }
  });

  // 输出结果
  console.log('\n' + '='.repeat(50));
  console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);

  if (failed === 0) {
    console.log('\n✨ 所有核心组件就绪！');
    console.log('\n📝 下一步:');
    console.log('   1. 启动 MySQL: docker start chatkey-mysql');
    console.log('   2. 初始化 DB: npm run init-db');
    console.log('   3. 登录 AI 网站（DeepSeek、通义千问）');
    console.log('   4. 启动应用: npm run dev');
    console.log('   5. 访问: http://127.0.0.1:3001');
    console.log('\n📖 详细测试指南: TESTING.md');
    process.exit(0);
  } else {
    console.log('\n⚠️ 部分组件存在问题，请检查上述错误');
    console.log('💡 提示: 某些测试可能需要先启动 MySQL');
    process.exit(1);
  }
}

// 执行测试
runTests().catch(err => {
  console.error('测试运行失败:', err);
  process.exit(1);
});
