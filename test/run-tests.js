// 测试运行器 - 运行所有测试
const { testBrowserAutomation } = require('./browser-automation.test');
const { testAnswerAdapter } = require('./answer-adapter.test');

async function runAllTests() {
  console.log('🚀 开始运行所有测试\n');
  
  const tests = [
    { name: '回答适配器测试', func: testAnswerAdapter },
    { name: '浏览器自动化测试', func: testBrowserAutomation }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n📋 ${test.name}`);
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    
    try {
      if (test.func.constructor.name === 'AsyncFunction') {
        await test.func();
      } else {
        test.func();
      }
      
      const duration = Date.now() - startTime;
      results.push({
        name: test.name,
        status: 'passed',
        duration
      });
      
      console.log(`\n✅ ${test.name} - 通过 (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      results.push({
        name: test.name,
        status: 'failed',
        duration,
        error: error.message
      });
      
      console.log(`\n❌ ${test.name} - 失败 (${duration}ms)`);
      console.log(`🔍 错误: ${error.message}`);
    }
  }
  
  // 测试总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  results.forEach(result => {
    const statusIcon = result.status === 'passed' ? '✅' : '❌';
    console.log(`${statusIcon} ${result.name} - ${result.status} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   🔍 ${result.error}`);
    }
  });
  
  console.log(`\n总计: ${passed} 通过, ${failed} 失败, 总耗时: ${totalDuration}ms`);
  
  if (failed > 0) {
    console.log('\n⚠️  部分测试失败，请检查错误信息。');
    process.exit(1);
  } else {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  }
}

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };