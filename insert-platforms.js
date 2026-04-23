const mysql = require('mysql2/promise');
require('dotenv').config();

async function insertAllPlatforms() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ChatKey@2024'
  });
  
  await connection.query('USE ai_qa_comparison');
  
  console.log('📥 插入所有AI平台配置...\n');
  
  // 所有平台配置
  const allPlatforms = [
    {
      name: 'DeepSeek',
      url: 'https://chat.deepseek.com',
      selector: '[data-testid="conversation-turn-content"], .message-content, [class*="markdown-body"]',
      input_selector: 'textarea[placeholder*="输入"], textarea',
      submit_selector: 'button[type="submit"], button[class*="send"]',
      provider_type: 'deepseek-web',
      enabled: 1,
      config: JSON.stringify({ waitTime: 60000 })
    },
    {
      name: '通义千问',
      url: 'https://chat2.qianwen.com/',
      selector: '.message-content, .chat-message-content, .output-content',
      input_selector: 'textarea[placeholder*="输入"], textarea',
      submit_selector: 'button[type="submit"], button[class*="send"]',
      provider_type: 'qwen-web',
      enabled: 1,
      config: JSON.stringify({ waitTime: 60000 })
    },
    {
      name: '豆包',
      url: 'https://www.doubao.com/chat/',
      selector: '.message-content, .assistant-message',
      input_selector: 'textarea[placeholder*="输入"], textarea',
      submit_selector: 'button[type="submit"]',
      provider_type: 'doubao-web',
      enabled: 0,
      config: JSON.stringify({ waitTime: 8000 })
    },
    {
      name: '文心一言',
      url: 'https://yiyan.baidu.com/',
      selector: '.message-content, .result-content',
      input_selector: 'textarea[placeholder*="输入"], textarea',
      submit_selector: 'button[type="submit"], button[class*="send"]',
      provider_type: 'yiyan-web',
      enabled: 0,
      config: JSON.stringify({ waitTime: 8000 })
    },
    {
      name: 'ChatGPT',
      url: 'https://chatgpt.com',
      selector: 'div[data-message-author-role="assistant"], [class*="markdown"], article',
      input_selector: '#prompt-textarea, textarea[placeholder], textarea, [contenteditable="true"]',
      submit_selector: '', // Enter键
      provider_type: 'chatgpt-web',
      enabled: 1,
      config: JSON.stringify({ waitTime: 90000, useEnterKey: true })
    },
    {
      name: 'Claude',
      url: 'https://claude.ai',
      selector: '[class*="message"] [class*="content"], article',
      input_selector: '[contenteditable="true"], textarea',
      submit_selector: '', // API提交
      provider_type: 'claude-web',
      enabled: 1,
      config: JSON.stringify({ waitTime: 90000, useAPI: true })
    },
    {
      name: 'Gemini',
      url: 'https://gemini.google.com/app',
      selector: 'model-response message-content, [data-message-author="model"] [class*="markdown"], article',
      input_selector: 'textarea[placeholder*="Gemini"], textarea[placeholder*="问问"], textarea, [contenteditable="true"], div[role="textbox"]',
      submit_selector: '', // Enter键
      provider_type: 'gemini-web',
      enabled: 1,
      config: JSON.stringify({ waitTime: 120000 })
    },
    {
      name: 'Grok',
      url: 'https://grok.com',
      selector: '[data-role="assistant"], [class*="assistant"], [class*="response"], article',
      input_selector: '[contenteditable="true"], textarea, div[role="textbox"]',
      submit_selector: '', // Enter键
      provider_type: 'grok-web',
      enabled: 1,
      config: JSON.stringify({ waitTime: 90000 })
    },
    {
      name: 'Perplexity',
      url: 'https://www.perplexity.ai',
      selector: '[class*="prose"], [class*="break-words"], article',
      input_selector: 'div[contenteditable="true"], [role="textbox"], textarea',
      submit_selector: '', // Enter键
      provider_type: 'perplexity-web',
      enabled: 1,
      config: JSON.stringify({ waitTime: 120000 })
    },
    {
      name: 'Kimi',
      url: 'https://www.kimi.com/',
      selector: '[class*="message"] [class*="content"], article',
      input_selector: 'textarea[placeholder*="输入"], textarea, [contenteditable="true"]',
      submit_selector: '', // API提交（Connect RPC）
      provider_type: 'kimi-web',
      enabled: 1,
      config: JSON.stringify({ waitTime: 60000, useAPI: true })
    },
    {
      name: 'ChatGLM',
      url: 'https://chatglm.cn',
      selector: '.message-content, .response-content, article',
      input_selector: 'textarea[placeholder*="输入"], textarea',
      submit_selector: '', // API提交
      provider_type: 'glm-web',
      enabled: 1,
      config: JSON.stringify({ waitTime: 60000, useAPI: true })
    }
  ];
  
  let inserted = 0;
  let skipped = 0;
  
  for (const platform of allPlatforms) {
    try {
      // 检查是否已存在
      const [existing] = await connection.query(
        'SELECT id FROM ai_sites WHERE name = ?',
        [platform.name]
      );
      
      if (existing.length > 0) {
        // 更新现有记录
        await connection.query(`
          UPDATE ai_sites SET 
            url = ?, selector = ?, input_selector = ?, 
            submit_selector = ?, provider_type = ?, enabled = ?, config = ?
          WHERE name = ?
        `, [
          platform.url, platform.selector, platform.input_selector,
          platform.submit_selector, platform.provider_type, platform.enabled, 
          platform.config, platform.name
        ]);
        console.log(`   🔄 ${platform.name}: 已更新`);
        skipped++;
      } else {
        // 插入新记录
        await connection.query(`
          INSERT INTO ai_sites 
            (name, url, selector, input_selector, submit_selector, provider_type, enabled, config)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          platform.name, platform.url, platform.selector, platform.input_selector,
          platform.submit_selector, platform.provider_type, platform.enabled, platform.config
        ]);
        console.log(`   ✅ ${platform.name}: 已插入`);
        inserted++;
      }
    } catch (err) {
      console.error(`   ❌ ${platform.name}: ${err.message}`);
    }
  }
  
  console.log(`\n📊 统计:`);
  console.log(`   新插入: ${inserted}`);
  console.log(`   更新: ${skipped}`);
  
  // 验证
  const [sites] = await connection.query(
    "SELECT name, provider_type, enabled FROM ai_sites ORDER BY id"
  );
  console.log(`\n📋 当前所有平台 (${sites.length}):`);
  sites.forEach(s => {
    const status = s.enabled === 1 ? '✅' : '⭕';
    console.log(`   ${status} ${s.name} (${s.provider_type})`);
  });
  
  const enabledCount = sites.filter(s => s.enabled === 1).length;
  console.log(`\n🎯 已启用: ${enabledCount}/${sites.length}`);
  
  await connection.end();
  console.log('\n✅ 平台配置同步完成！\n');
}

insertAllPlatforms().catch(console.error);