const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixAll() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ChatKey@2024'
  });
  
  await connection.query('USE ai_qa_comparison');
  
  console.log('🔧 开始全面修复...\n');
  
  // 1. 修复 ai_sites 的 provider_type
  console.log('1️⃣  修复 provider_type 字段...');
  const updates = [
    ["deepseek-web", "DeepSeek"],
    ["qwen-web", "通义千问"],
    ["doubao-web", "豆包"],
    ["yiyan-web", "文心一言"],
    ["chatgpt-web", "ChatGPT"],
    ["claude-web", "Claude"],
    ["gemini-web", "Gemini"],
    ["grok-web", "Grok"],
    ["perplexity-web", "Perplexity"],
    ["kimi-web", "Kimi"],
    ["glm-web", "ChatGLM"]
  ];
  
  for (const [type, name] of updates) {
    const result = await connection.query(
      "UPDATE ai_sites SET provider_type = ? WHERE name = ? AND provider_type != ?",
      [type, name, type]
    );
    if (result.affectedRows > 0) {
      console.log(`   ✅ ${name} -> ${type}`);
    }
  }
  
  // 2. 启用更多平台
  console.log('\n2️⃣  启用更多AI平台...');
  const enableList = ['ChatGPT', 'Claude', 'Gemini', 'Grok', 'Perplexity', 'Kimi', 'ChatGLM'];
  for (const name of enableList) {
    await connection.query(
      "UPDATE ai_sites SET enabled = 1 WHERE name = ? AND enabled = 0",
      [name]
    );
    console.log(`   ✅ ${name} 已启用`);
  }
  
  // 3. 验证结果
  console.log('\n3️⃣  验证修复结果:');
  const [sites] = await connection.query(
    "SELECT name, provider_type, enabled FROM ai_sites ORDER BY id"
  );
  console.table(sites);
  
  // 4. 统计
  const enabledCount = sites.filter(s => s.enabled === 1).length;
  console.log(`\n📊 已启用平台: ${enabledCount}/${sites.length}`);
  
  await connection.end();
  console.log('\n✅ 修复完成！');
  console.log('\n💡 下一步:');
  console.log('   1. 运行: npm run debug:browser  (启动调试浏览器)');
  console.log('   2. 在打开的Chrome中登录各个AI平台');
  console.log('   3. 运行: npm run check:login    (验证登录状态)');
  console.log('   4. 重启API服务测试真实问答\n');
}

fixAll().catch(console.error);