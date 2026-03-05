// 浏览器自动化测试
const { BrowserAutomation } = require('../src/main/browser-automation');

async function testBrowserAutomation() {
  console.log('🧪 开始浏览器自动化测试');
  
  // 检查是否在Electron环境中运行
  if (!process.versions.electron) {
    console.log('⚠️  浏览器自动化测试需要在Electron环境中运行');
    console.log('ℹ️  请在Electron应用中运行此测试，或使用 npm run dev 启动开发环境');
    return;
  }
  
  const automation = new BrowserAutomation();
  
  try {
    // 初始化
    console.log('1. 初始化浏览器自动化...');
    await automation.init();
    console.log('✅ 浏览器自动化初始化成功');
    
    // 获取测试网站配置
    console.log('2. 获取AI网站配置...');
    const sites = await automation.dbManager.getAiSites();
    console.log(`✅ 找到 ${sites.length} 个AI网站配置`);
    
    // 测试单个网站（使用第一个启用的网站）
    const enabledSites = sites.filter(site => site.enabled);
    if (enabledSites.length === 0) {
      console.log('⚠️ 没有启用的AI网站，测试跳过');
      return;
    }
    
    const testSite = enabledSites[0];
    console.log(`3. 测试网站: ${testSite.name} (${testSite.url})`);
    
    // 测试简单问题
    const testQuestion = '你好，请简单介绍一下你自己。';
    console.log(`4. 发送测试问题: ${testQuestion}`);
    
    const result = await automation.sendQuestionToSiteWithRetry(testSite, testQuestion, 1);
    
    if (result.status === 'success') {
      console.log('✅ 网站响应成功');
      console.log(`📄 回答长度: ${result.answer.length} 字符`);
      console.log(`📝 回答预览: ${result.answer.substring(0, 100)}...`);
    } else {
      console.log('❌ 网站响应失败');
      console.log(`🔍 错误信息: ${result.error}`);
    }
    
    // 测试多个网站并发
    console.log('5. 测试多网站并发处理...');
    const multiResults = await automation.sendQuestionToMultipleSites(testQuestion, enabledSites.slice(0, 2));
    
    const successCount = multiResults.filter(r => r.status === 'success').length;
    const failedCount = multiResults.filter(r => r.status === 'failed').length;
    
    console.log(`✅ 并发测试完成 - 成功: ${successCount}, 失败: ${failedCount}`);
    
    // 显示详细结果
    multiResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.site}: ${result.status === 'success' ? '✅' : '❌'}`);
      if (result.status === 'success') {
        console.log(`      回答长度: ${result.answer.length} 字符`);
      } else {
        console.log(`      错误: ${result.error}`);
      }
    });
    
    console.log('\n🎉 浏览器自动化测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 清理资源
    console.log('6. 清理资源...');
    await automation.close();
    console.log('✅ 资源清理完成');
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testBrowserAutomation().catch(console.error);
}

module.exports = { testBrowserAutomation };