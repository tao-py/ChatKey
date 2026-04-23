const http = require('http');
const { spawn } = require('child_process');

// 1. 启动API服务
console.log('🚀 启动API网关...');
const apiProcess = spawn('node', ['run_api.js'], {
  cwd: __dirname,
  stdio: 'pipe'
});

apiProcess.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  if (text.includes('running on port')) {
    console.log('\n✅ API服务已启动，开始测试...');
    setTimeout(runTests, 2000);
  }
});

apiProcess.stderr.on('data', (data) => {
  console.error('API Error:', data.toString());
});

// 2. 运行测试
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 ChatKey API 功能测试');
  console.log('='.repeat(60) + '\n');

  const baseURL = 'http://localhost:8080';

  // 测试用例
  const tests = [
    {
      name: '健康检查',
      method: 'GET',
      path: '/health',
      expected: 'healthy'
    },
    {
      name: '模型列表',
      method: 'GET',
      path: '/v1/models',
      expected: 'ai-comparison'
    },
    {
      name: 'Provider信息',
      method: 'GET',
      path: '/providers',
      expected: 'providers'
    },
    {
      name: '统计信息',
      method: 'GET',
      path: '/stats',
      expected: 'metrics'
    },
    {
      name: '系统状态',
      method: 'GET',
      path: '/system/status',
      expected: 'uptime'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await makeRequest(test.method, baseURL + test.path);
      if (result.includes(test.expected) || result.includes('"status":"healthy"')) {
        console.log(`✅ ${test.name} - PASS`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - FAIL (未找到期望内容)`);
        console.log(`   响应: ${result.substring(0, 200)}...`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      failed++;
    }
  }

  // 测试聊天请求（需要API key）
  console.log('\n📤 测试聊天请求...');
  try {
    const chatResponse = await makeRequest('POST', baseURL + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-key'
      },
      body: JSON.stringify({
        model: 'ai-comparison',
        messages: [{ role: 'user', content: '你好，请简单介绍一下你自己' }],
        stream: false
      })
    });
    
    if (chatResponse.includes('choices') || chatResponse.includes('error')) {
      console.log(`✅ 聊天请求 - 收到响应`);
      console.log(`   响应片段: ${chatResponse.substring(0, 300)}...`);
      passed++;
    } else {
      console.log(`❌ 聊天请求 - 响应格式错误`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ 聊天请求 - ERROR: ${error.message}`);
    failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);
  console.log('='.repeat(60));

  // 关闭API服务
  console.log('\n🔒 关闭API服务...');
  apiProcess.kill();
  process.exit(failed > 0 ? 1 : 0);
}

function makeRequest(method, url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;
    
    const optionsObj = {
      method: method,
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      headers: options.headers || {}
    };

    if (data) {
      optionsObj.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(optionsObj, (res) => {
      let chunks = '';
      res.on('data', chunk => chunks += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(chunks);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${chunks.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}