/**
 * ChatKey 浏览器管理器 - 增强版
 * 基于 openclaw-zero-token 的设计
 * 功能：
 * 1. 连接到用户已有的Chrome实例（保持登录状态）
 * 2. 自动注入和更新Cookie
 * 3. 页面池管理
 * 4. 认证状态检测
 */

const puppeteer = require('puppeteer');
const { DatabaseManager } = require('../shared/database');
const { Logger } = require('./logger');
const { providerRegistry } = require('../shared/providers');
const path = require('path');
const fs = require('fs');

class EnhancedBrowserManager {
  constructor() {
    this.browser = null;
    this.dbManager = new DatabaseManager();
    this.logger = new Logger('BrowserManager');
    this.maxConcurrency = 3;
    this.pagesPool = [];
    this.activePages = new Set();
    this.providerCache = new Map();
    
    // Chrome连接配置
    this.chromePath = process.env.CHROME_PATH || '';
    this.userDataDir = process.env.CHROME_USER_DATA_DIR || 
                      path.join(__dirname, '..', 'auth', 'chrome-profile');
    this.debugPort = parseInt(process.env.CHROME_DEBUG_PORT) || 9222;
    this.attachOnly = process.env.CHROME_ATTACH_ONLY === 'true';
  }

  async init() {
    this.logger.info('Initializing EnhancedBrowserManager');
    
    try {
      await this.dbManager.init();
      
      if (this.attachOnly) {
        // 连接到已有Chrome
        await this.connectToExistingChrome();
      } else {
        // 启动新Chrome
        await this.launchChrome();
      }
      
      // 创建页面池
      await this.createPagePool();
      
      // 注入保存的Cookies
      await this.injectSavedCookies();
      
      this.logger.info('EnhancedBrowserManager initialized');
      console.log('✅ 浏览器管理器已就绪');
      console.log(`   ${this.attachOnly ? '🔗 已连接到现有Chrome' : '🚀 已启动新Chrome'}`);
      console.log(`   📁 用户数据: ${this.userDataDir}`);
      console.log(`   🧩 页面池: ${this.pagesPool.length} 页`);
    } catch (error) {
      this.logger.error('Failed to init BrowserManager:', error);
      throw error;
    }
  }

  async connectToExistingChrome() {
    console.log(`🔗 Connecting to Chrome on port ${this.debugPort}...`);
    
    try {
      // 尝试CDP连接
      this.browser = await puppeteer.connect({
        browserURL: `http://127.0.0.1:${this.debugPort}`,
        defaultViewport: { width: 1280, height: 720 }
      });
      
      console.log('✅ Connected via CDP');
    } catch (err) {
      console.log('⚠️  CDP connection failed, trying puppeteer.launch with userDataDir...');
      
      // 回退：使用用户数据目录启动
      this.browser = await puppeteer.launch({
        headless: false,
        userDataDir: this.userDataDir,
        defaultViewport: { width: 1280, height: 720 },
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage'
        ]
      });
      
      console.log('✅ Launched new Chrome with user profile');
    }
  }

  async launchChrome() {
    console.log('🚀 Launching new Chrome instance...');
    
    // 确保用户数据目录存在
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }
    
    this.browser = await puppeteer.launch({
      headless: false,
      userDataDir: this.userDataDir,
      defaultViewport: { width: 1280, height: 720 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote'
      ]
    });
    
    console.log('✅ Chrome launched');
  }

  async createPagePool() {
    console.log('🏊 Creating page pool...');
    
    for (let i = 0; i < this.maxConcurrency; i++) {
      const page = await this.browser.newPage();
      
      // 设置用户代理
      await page.setUserAgent(this.getRandomUserAgent());
      
      // 设置视窗
      await page.setViewport({ width: 1280, height: 720 });
      
      this.pagesPool.push(page);
      console.log(`   Page ${i + 1} created`);
    }
    
    console.log(`✅ Page pool ready (${this.pagesPool.length} pages)`);
  }

  async injectSavedCookies() {
    console.log('🍪 Loading saved cookies...');
    
    try {
      const cookieDir = path.join(__dirname, '..', 'auth');
      if (!fs.existsSync(cookieDir)) {
        console.log('   No saved cookies found');
        return;
      }
      
      // 查找最新的cookie文件
      const files = fs.readdirSync(cookieDir)
        .filter(f => f.startsWith('cookies-') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        console.log('   No saved cookies found');
        return;
      }
      
      const latestFile = path.join(cookieDir, files[0]);
      const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
      
      let injectedCount = 0;
      for (const [platform, cookies] of Object.entries(data.platforms || {})) {
        const domain = this.getDomainForPlatform(platform);
        if (!domain) continue;
        
        // 构建cookie数组
        const cookieArray = Object.entries(cookies).map(([name, value]) => ({
          name,
          value,
          domain,
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'Lax'
        }));
        
        // 注入到所有页面
        for (const page of this.pagesPool) {
          try {
            await page.setCookie(...cookieArray);
            injectedCount += cookieArray.length;
          } catch (err) {
            // 忽略单个cookie错误
          }
        }
      }
      
      console.log(`✅ Injected ${injectedCount} cookies from saved sessions`);
      
    } catch (error) {
      console.log('⚠️  Cookie loading error:', error.message);
    }
  }

  getDomainForPlatform(platform) {
    const domainMap = {
      deepseek: 'chat.deepseek.com',
      chatgpt: 'chatgpt.com',
      claude: 'claude.ai',
      gemini: 'gemini.google.com',
      grok: 'grok.com',
      perplexity: 'perplexity.ai',
      kimi: 'kimi.com',
      qwen: 'chat2.qianwen.com',
      doubao: 'doubao.com',
      glm: 'chatglm.cn'
    };
    return domainMap[platform];
  }

  getRandomUserAgent() {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  /**
   * 为指定站点获取页面
   */
  async getPage(site) {
    // 从池中获取可用页面
    const availablePage = this.pagesPool.find(p => !this.activePages.has(p));
    if (availablePage) {
      this.activePages.add(availablePage);
      
      // 导航到目标站点（如果需要）
      try {
        const currentUrl = availablePage.url();
        if (!currentUrl.includes(site.url.replace(/^https?:\/\//, ''))) {
          await availablePage.goto(site.url, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          });
          await availablePage.waitForTimeout(2000);
        }
      } catch (err) {
        this.logger.warn(`[${site.name}] Navigation warning:`, err.message);
      }
      
      return availablePage;
    }
    
    throw new Error('No available pages in pool');
  }

  /**
   * 释放页面回池
   */
  releasePage(page) {
    this.activePages.delete(page);
  }

  /**
   * 获取Provider（使用缓存）
   */
  async getProvider(site) {
    if (this.providerCache.has(site.id)) {
      return this.providerCache.get(site.id);
    }
    
    const { providerFactory } = require('../shared/providers');
    const provider = await providerFactory.createFromDatabase(site);
    
    this.providerCache.set(site.id, provider);
    this.logger.info(`[${site.name}] Created provider: ${provider.config.providerType}`);
    
    return provider;
  }

  /**
   * 发送问题到站点
   */
  async sendQuestionToSite(site, question) {
    const page = await this.getPage(site);
    const provider = await this.getProvider(site);
    
    try {
      // 认证检查
      const authenticated = await provider.authenticate(page);
      if (!authenticated) {
        throw new Error(`${site.name} requires authentication`);
      }
      
      // 发送问题
      const answer = await provider.sendQuestion(page, question);
      
      return {
        site: site.name,
        answer,
        status: 'success',
        latency: Date.now()
      };
      
    } catch (error) {
      this.logger.error(`[${site.name}] Error:`, error);
      throw error;
    } finally {
      this.releasePage(page);
    }
  }

  /**
   * 批量发送问题
   */
  async sendQuestionBatch(question, sites) {
    const results = [];
    
    for (let i = 0; i < sites.length; i += this.maxConcurrency) {
      const batch = sites.slice(i, i + this.maxConcurrency);
      const promises = batch.map(site => 
        this.sendQuestionToSite(site, question).catch(err => ({
          site: site.name,
          answer: '',
          status: 'failed',
          error: err.message
        }))
      );
      
      const batchResults = await Promise.allSettled(promises);
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
    }
    
    return results;
  }

  /**
   * 获取所有Provider状态
   */
  async getAllProviderStats() {
    const stats = [];
    for (const [siteId, provider] of this.providerCache) {
      stats.push({
        siteId,
        type: provider.config.providerType,
        status: provider.getStatus(),
        stats: provider.getStats()
      });
    }
    return stats;
  }

  /**
   * 清理缓存
   */
  clearAllProviderCache() {
    this.providerCache.clear();
  }

  /**
   * 获取健康状态
   */
  async getStatus() {
    const pages = this.browser.pages();
    return {
      initialized: this.browser !== null,
      pages: (await pages).length,
      activePages: this.activePages.size,
      cachedProviders: this.providerCache.size
    };
  }

  /**
   * 关闭
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.dbManager.close();
  }
}

module.exports = { EnhancedBrowserManager };