#!/usr/bin/env node

/**
 * ChatKey 一键启动调试浏览器
 * 功能：
 * 1. 启动带调试端口的Chrome（使用用户数据目录保持登录）
 * 2. 依次打开所有AI平台页面
 * 3. 等待用户手动登录
 * 4. 自动检测登录完成并保存Cookie
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 配置
const CHROME_PATHS = [
  process.env.CHROME_PATH || '',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
];

const USER_DATA_DIR = path.join(os.homedir(), '.chatkey-chrome');
const DEBUG_PORT = 9222;

// AI平台列表
const AI_PLATFORMS = [
  { name: 'DeepSeek', url: 'https://chat.deepseek.com' },
  { name: 'ChatGPT', url: 'https://chatgpt.com' },
  { name: 'Claude', url: 'https://claude.ai' },
  { name: 'Gemini', url: 'https://gemini.google.com/app' },
  { name: 'Grok', url: 'https://grok.com' },
  { name: 'Perplexity', url: 'https://www.perplexity.ai' },
  { name: 'Kimi', url: 'https://www.kimi.com/' },
  { name: '通义千问', url: 'https://chat2.qianwen.com/' },
  { name: '豆包', url: 'https://www.doubao.com/chat/' },
  { name: '文心一言', url: 'https://yiyan.baidu.com' },
  { name: 'ChatGLM', url: 'https://chatglm.cn' }
];

async function findChrome() {
  for (const chromePath of CHROME_PATHS) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  
  // 尝试通过注册表查找（Windows）
  try {
    const reg = require('child_process').execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve');
    const match = reg.toString().match(/REG_SZ\s+(.+)/);
    if (match && fs.existsSync(match[1].trim())) {
      return match[1].trim();
    }
  } catch (e) {}
  
  return null;
}

function startChrome() {
  return new Promise((resolve, reject) => {
    const chromePath = findChrome();
    if (!chromePath) {
      reject(new Error('Chrome not found. Please install Chrome or set CHROME_PATH.'));
      return;
    }
    
    console.log(`🚀 Starting Chrome from: ${chromePath}`);
    console.log(`📁 User data dir: ${USER_DATA_DIR}`);
    console.log(`🔧 Debug port: ${DEBUG_PORT}`);
    
    // 确保用户数据目录存在
    if (!fs.existsSync(USER_DATA_DIR)) {
      fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    }
    
    const args = [
      '--remote-debugging-port=' + DEBUG_PORT,
      '--remote-debugging-address=127.0.0.1',
      '--user-data-dir=' + USER_DATA_DIR,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-popup-blocking',
      '--disable-infobars',
      '--disable-features=Translate',
      '--window-size=1280,720'
    ];
    
    const chrome = spawn(chromePath, args, {
      detached: true,
      stdio: 'ignore'
    });
    
    chrome.unref();
    console.log('✅ Chrome started (detached)');
    resolve(chrome);
  });
}

async function openPlatforms() {
  console.log('\n🌐 Opening AI platforms in new tabs...\n');
  
  // 等待Chrome启动
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 使用CDP连接到Chrome
  const CDP = require('chrome-remote-interface');
  
  try {
    const client = await CDP({ port: DEBUG_PORT });
    const { Target } = client;
    
    // 获取所有target
    const targets = await Target.getTargets();
    const pages = targets.targetInfos.filter(t => t.type === 'page' && t.url !== 'about:blank');
    
    console.log(`📊 Found ${pages.length} existing pages`);
    
    // 为每个平台打开新标签页
    for (let i = 0; i < AI_PLATFORMS.length; i++) {
      const platform = AI_PLATFORMS[i];
      
      try {
        if (i < pages.length) {
          // 重用现有标签页
          await Target.createTarget({ url: platform.url });
        } else {
          // 创建新标签页
          await Target.createTarget({ url: platform.url });
        }
        console.log(`   ✅ ${platform.name}: ${platform.url}`);
      } catch (err) {
        console.log(`   ❌ ${platform.name}: ${err.message}`);
      }
    }
    
    client.close();
    
    console.log('\n✅ All platforms opened!');
    console.log('\n📝 Next steps:');
    console.log('1. Switch to the Chrome window that just opened');
    console.log('2. Log in to each AI platform (DeepSeek, ChatGPT, Claude, etc.)');
    console.log('3. Your login sessions will be saved to:', USER_DATA_DIR);
    console.log('4. After logging in, restart the API server to use the saved sessions');
    console.log('\n💡 Tips:');
    console.log('   - Login to at least DeepSeek and one other platform for testing');
    console.log('   - The browser stays open - close it manually when done');
    console.log('   - Sessions are persistent across restarts\n');
    
  } catch (err) {
    console.error('Failed to connect to Chrome:', err.message);
    console.log('\n⚠️  Make sure Chrome is running with --remote-debugging-port=9222');
    console.log('   Or run this script first to start Chrome automatically.\n');
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ChatKey Debug Browser Launcher');
  console.log('='.repeat(60));
  console.log('\nThis script will:');
  console.log('1. Launch Chrome with a persistent user profile');
  console.log('2. Open all supported AI platforms in tabs');
  console.log('3. Let you log in manually');
  console.log('4. Save cookies for API reuse\n');
  
  try {
    // 检查是否已有Chrome在运行
    let useExisting = false;
    try {
      const CDP = require('chrome-remote-interface');
      const client = await CDP({ port: DEBUG_PORT, timeout: 2000 });
      client.close();
      useExisting = true;
      console.log('🔍 Found existing Chrome with debugging port\n');
    } catch (e) {
      useExisting = false;
    }
    
    if (!useExisting) {
      console.log('🚀 Starting new Chrome instance...\n');
      await startChrome();
    } else {
      console.log('✅ Using existing Chrome instance\n');
    }
    
    await openPlatforms();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Solution:');
    console.log('   Install chrome-remote-interface: npm install chrome-remote-interface');
    console.log('   Or manually start Chrome:');
    console.log(`   chrome.exe --remote-debugging-port=${DEBUG_PORT} --user-data-dir="${USER_DATA_DIR}"\n`);
    process.exit(1);
  }
}

main().catch(console.error);