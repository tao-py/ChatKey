// 模拟浏览器环境调用后端 API
const http = require('http');

function fetch(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isPost = options && options.method === 'POST';
    
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: isPost ? 'POST' : 'GET',
      headers: options && options.headers ? options.headers : {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data)
        });
      });
    });
    
    req.on('error', reject);
    
    if (isPost && options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testBrowserMode() {
  console.log('=== 浏览器模式API测试 ===\n');
  
  const apiKey = 'sk-1776865896727-302e71623479633038657266';
  
  // 1. 获取 AI 网站配置
  console.log('1. 获取 AI 网站列表:');
  try {
    const providersRes = await fetch('http://localhost:8080/providers', {
      headers: { 'X-API-Key': apiKey }
    });
    if (!providersRes.ok) {
      const err = await providersRes.json();
      throw new Error('HTTP ' + providersRes.status + ': ' + (err.error ? err.error.message : 'Unknown'));
    }
    const providersData = await providersRes.json();
    const sites = providersData.sites || [];
    console.log('   ✅ 成功获取 ' + sites.length + ' 个AI网站');
    if (sites.length > 0) {
      console.log('   网站列表:', sites.map(s => s.name).join(', '));
    }
  } catch (e) {
    console.log('   ❌ 失败:', e.message);
  }
  
  // 2. 健康检查
  console.log('\n2. 健康检查:');
  try {
    const healthRes = await fetch('http://localhost:8080/health');
    const healthData = await healthRes.json();
    console.log('   ✅ 状态: ' + healthData.status);
  } catch (e) {
    console.log('   ❌ 失败:', e.message);
  }
  
  // 3. 测试提问
  console.log('\n3. 测试提问 (使用API key):');
  try {
    const chatRes = await fetch('http://localhost:8080/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        model: 'ai-comparison',
        messages: [{ role: 'user', content: '你好，请介绍一下你自己' }],
        stream: false
      })
    });
    
    if (chatRes.ok) {
      const chatData = await chatRes.json();
      const choices = chatData.choices || [];
      console.log('   ✅ 收到 ' + choices.length + ' 个回答');
      if (choices.length > 0 && choices[0].message && choices[0].message.content) {
        const content = choices[0].message.content;
        console.log('   回答预览: ' + content.substring(0, 100) + '...');
      }
    } else {
      const err = await chatRes.json();
      console.log('   ❌ 错误 ' + chatRes.status + ':', err.error ? err.error.message : 'Unknown');
    }
  } catch (e) {
    console.log('   ❌ 请求失败:', e.message);
  }
  
  console.log('\n=== 测试完成 ===');
}

testBrowserMode();
