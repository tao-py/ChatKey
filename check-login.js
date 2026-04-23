#!/usr/bin/env node

/**
 * ChatKey Cookie 管理器
 * 功能：
 * 1. 连接到调试中的Chrome实例
 * 2. 提取所有AI平台的登录Cookie
 * 3. 保存到数据库或配置文件
 * 4. 验证登录状态
 */

const { spawn } = require('child_process');
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');

const DEBUG_PORT = 9222;
const COOKIE_DIR = path.join(__dirname, 'auth');
const PLATFORM_DOMAINS = {
  deepseek: ['chat.deepseek.com'],
  chatgpt: ['chatgpt.com', 'openai.com'],
  claude: ['claude.ai', 'anthropic.com'],
  gemini: ['gemini.google.com'],
  grok: ['grok.com', 'x.ai'],
  perplexity: ['perplexity.ai'],
  kimi: ['kimi.com', 'moonshot.cn'],
  qwen: ['chat2.qianwen.com', 'chat.qwen.ai'],
  doubao: ['doubao.com'],
  glm: ['chatglm.cn', 'z.ai']
};

async function extractCookies() {
  console.log('🔍 Connecting to Chrome...');
  
  try {
    const client = await CDP({ port: DEBUG_PORT });
    const { Runtime, Network } = client;
    
    // 启用Network
    await Network.enable();
    
    console.log('✅ Connected to Chrome\n');
    console.log('📋 Extracting cookies for AI platforms...\n');
    
    const cookies = await Network.getAllCookies();
    const platformCookies = {};
    
    for (const [platform, domains] of Object.entries(PLATFORM_DOMAINS)) {
      const relevant = cookies.cookies.filter(cookie => 
        domains.some(domain => cookie.domain.includes(domain))
      );
      
      if (relevant.length > 0) {
        platformCookies[platform] = relevant;
        console.log(`✅ ${platform.toUpperCase()}: ${relevant.length} cookies`);
        
        // 显示关键cookie
        const keyCookies = relevant.filter(c => 
          c.name.toLowerCase().includes('session') || 
          c.name.toLowerCase().includes('token') ||
          c.name.toLowerCase().includes('auth')
        );
        if (keyCookies.length > 0) {
          keyCookies.forEach(c => {
            console.log(`   🔑 ${c.name}=${c.value.substring(0, 30)}...`);
          });
        }
      } else {
        console.log(`❌ ${platform.toUpperCase()}: Not logged in`);
      }
    }
    
    // 保存到文件
    if (!fs.existsSync(COOKIE_DIR)) {
      fs.mkdirSync(COOKIE_DIR, { recursive: true });
    }
    
    const saveData = {
      timestamp: new Date().toISOString(),
      platforms: {}
    };
    
    for (const [platform, cookies] of Object.entries(platformCookies)) {
      saveData.platforms[platform] = cookies.reduce((acc, c) => {
        acc[c.name] = c.value;
        return acc;
      }, {});
    }
    
    const savePath = path.join(COOKIE_DIR, `cookies-${Date.now()}.json`);
    fs.writeFileSync(savePath, JSON.stringify(saveData, null, 2));
    console.log(`\n💾 Cookies saved to: ${savePath}`);
    
    // 统计登录平台
    const loggedInCount = Object.keys(platformCookies).length;
    console.log(`\n📊 Login Status: ${loggedInCount}/${Object.keys(PLATFORM_DOMAINS).length} platforms logged in`);
    
    if (loggedInCount === 0) {
      console.log('\n⚠️  No AI platforms are logged in!');
      console.log('   Please open Chrome and log in to at least one platform.');
    } else {
      console.log('\n✅ You can now restart the API server to use these sessions!');
    }
    
    client.close();
    
  } catch (err) {
    console.error('\n❌ Failed to connect to Chrome:', err.message);
    console.log('\n💡 Make sure Chrome is running with:');
    console.log(`   chrome.exe --remote-debugging-port=${DEBUG_PORT} --user-data-dir="${path.join(__dirname, 'auth')}"`);
    console.log('\nOr run: npm run debug:browser\n');
  }
}

extractCookies().catch(console.error);