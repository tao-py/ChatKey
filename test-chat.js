const { spawn } = require('child_process');
const mysql = require('mysql2/promise');
require('dotenv').config();

let apiProcess;

async function getValidApiKey() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ChatKey@2024'
  });
  await connection.query('USE ai_qa_comparison');
  const [rows] = await connection.query(
    'SELECT api_key FROM api_config WHERE enabled = 1 ORDER BY id DESC LIMIT 1'
  );
  await connection.end();
  return rows.length > 0 ? rows[0].api_key : null;
}

async function main() {
  console.log('🚀 启动API服务...');
  apiProcess = spawn('node', ['run_api.js'], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  apiProcess.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
    if (text.includes('running on port') && !global.apiReady) {
      global.apiReady = true;
      console.log('\n✅ API已就绪，3秒后开始测试...');
    }
  });

  apiProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  // 等待API启动
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  if (!global.apiReady) {
    console.log('⚠️  API可能未正常启动，继续尝试测试...');
  }

  // 执行聊天测试
  console.log('\n' + '='.repeat(60));
  console.log('📤 核心功能测试：用户输入问题 → 获取AI回答');
  console.log('='.repeat(60) + '\n');

  const apiKey = await getValidApiKey();
  console.log('🔑 使用API密钥:', apiKey.substring(0, 30) + '...\n');

  try {
    const response = await makeRequest('POST', 'http://localhost:8080/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: {
        model: 'ai-comparison',
        messages: [{ role: 'user', content: '请用简单的话解释什么是Node.js，不超过100字' }],
        stream: false
      }
    });

    console.log('✅ 请求成功！\n');
    const parsed = JSON.parse(response);
    console.log('📋 响应结构:');
    console.log(`   - id: ${parsed.id}`);
    console.log(`   - model: ${parsed.model}`);
    console.log(`   - choices数量: ${parsed.choices.length}`);
    
    if (parsed.choices && parsed.choices.length > 0) {
      const content = parsed.choices[0].message.content;
      console.log(`   - 回答长度: ${content.length} 字符`);
      console.log(`\n📝 回答内容预览:\n${content.substring(0, 500)}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 功能验证结果:');
    console.log('✅ 用户问题发送成功');
    console.log('✅ API正确返回响应');
    console.log('✅ 回答内容已获取');
    console.log('⚠️  实际AI回答: 需要浏览器登录AI网站后获取真实回答');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.message.includes('500')) {
      console.log('\n🔍 500错误分析:');
      console.log('可能原因:');
      console.log('1. 浏览器自动化未初始化（需要Puppeteer）');
      console.log('2. 未登录AI网站（需要手动登录）');
      console.log('3. Provider配置问题');
      console.log('\n💡 解决方案: 运行完整应用npm run dev，在浏览器中登录AI网站');
    }
  } finally {
    // 关闭API
    setTimeout(() => {
      console.log('\n🔒 关闭API服务...');
      apiProcess.kill();
      process.exit(0);
    }, 1000);
  }
}

function makeRequest(method, url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = options.body ? JSON.stringify(options.body) : null;
    
    const reqOptions = {
      method: method,
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      headers: options.headers || {}
    };

    if (body) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = require('http').request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

main().catch(console.error);