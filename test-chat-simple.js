const http = require('http');
const mysql = require('mysql2/promise');
require('dotenv').config();

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

async function testChat() {
  const apiKey = await getValidApiKey();
  console.log('🔑 API Key:', apiKey);
  
  const response = await makeRequest('POST', 'http://localhost:8080/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: {
      model: 'ai-comparison',
      messages: [{ role: 'user', content: '什么是Node.js？' }],
      stream: false
    }
  });
  
  console.log('\n📨 响应状态: 200');
  console.log('\n📄 完整响应:');
  console.log(JSON.stringify(JSON.parse(response), null, 2));
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

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

testChat().catch(console.error);