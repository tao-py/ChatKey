/**
 * 浏览器自动化引擎 - 重构版
 * 使用 Provider 模式替代原来的 SiteAdapter
 * 基于 openclaw-zero-token 的浏览器管理设计
 */

const puppeteer = require('puppeteer');
const { DatabaseManager } = require('../shared/database');
const { Logger } = require('./logger');
const { providerRegistry, providerFactory } = require('../shared/providers');

class BrowserAutomation {
  constructor() {
    this.browser = null;
    this.dbManager = new DatabaseManager();
    this.logger = new Logger('BrowserAutomation');
    this.maxConcurrency = 3;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.providerCache = new Map(); // Provider 实例缓存
    this.pagesPool = []; // 页面池
    this.activePages = new Set();
  }

  async init() {
    this.logger.info('Initializing BrowserAutomation');
    try {
      await this.dbManager.init();
      
      const launchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1280,720'
      ];

      this.browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 720 },
        args: launchArgs,
        // 改进：使用持久化的用户数据目录
        userDataDir: process.env.CHROME_USER_DATA_DIR || null
      });

      this.logger.info('BrowserAutomation initialized successfully');
      console.log('🚀 浏览器已启动');
    } catch (error) {
      this.logger.error('Failed to initialize BrowserAutomation:', error);
      throw error;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 为网站获取或创建 Provider 实例
   */
  async getProvider(site) {
    // 检查缓存
    if (this.providerCache.has(site.id)) {
      return this.providerCache.get(site.id);
    }

    // 从数据库记录创建 Provider
    const provider = await providerFactory.createFromDatabase(site);
    
    // 缓存 Provider
    this.providerCache.set(site.id, provider);
    
    this.logger.info(`[${site.name}] Created ${provider.config.providerType} provider`);
    return provider;
  }

  /**
   * 清除 Provider 缓存
   */
  clearProviderCache(siteId) {
    this.providerCache.delete(siteId);
  }

  clearAllProviderCache() {
    this.providerCache.clear();
  }

  /**
   * 获取页面（从池或新建）
   */
  async getPage() {
    // 尝试从池中获取可用页面
    const availablePage = this.pagesPool.find(p => !this.activePages.has(p));
    if (availablePage) {
      this.activePages.add(availablePage);
      return availablePage;
    }

    // 创建新页面
    const page = await this.browser.newPage();
    
    // 设置默认超时和视口
    page.setDefaultTimeout(30000);
    await page.setViewport({ width: 1280, height: 720 });
    
    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    this.activePages.add(page);
    return page;
  }

  /**
   * 释放页面回池
   */
  async releasePage(page) {
    try {
      // 清理页面状态
      await page.evaluate(() => {
        window.stop();
        document.body.innerHTML = '';
      });
      
      this.activePages.delete(page);
      
      // 如果页面池未满，保留页面以供重用
      if (this.pagesPool.length < this.maxConcurrency * 2) {
        this.pagesPool.push(page);
      } else {
        await page.close();
      }
    } catch (error) {
      this.logger.warn('Error releasing page:', error.message);
      try {
        await page.close();
      } catch (closeError) {
        // ignore
      }
      this.activePages.delete(page);
    }
  }

  /**
   * Cookie 管理方法
   */
  async saveCookies(site, page) {
    try {
      const cookies = await page.cookies();
      const cookiesKey = this.getCookiesKey(site);
      
      await this.dbManager.run(
        'INSERT INTO cookies (site_key, cookies_data, created_at) VALUES (?, ?, NOW()) ' +
        'ON DUPLICATE KEY UPDATE cookies_data = ?, updated_at = NOW()',
        [cookiesKey, JSON.stringify(cookies), JSON.stringify(cookies)]
      );
      
      this.logger.info(`Saved cookies for ${site.name} (${cookies.length} cookies)`);
    } catch (error) {
      this.logger.warn(`Failed to save cookies for ${site.name}:`, error.message);
    }
  }

  async loadCookies(site, page) {
    try {
      const cookiesKey = this.getCookiesKey(site);
      const rows = await this.dbManager.all(
        'SELECT cookies_data FROM cookies WHERE site_key = ? ORDER BY updated_at DESC LIMIT 1',
        [cookiesKey]
      );
      
      if (rows.length > 0) {
        const cookies = JSON.parse(rows[0].cookies_data);
        if (cookies.length > 0) {
          const cookiesToSet = cookies.map(c => ({
            ...c,
            url: site.url
          }));
          await page.setCookie(...cookiesToSet);
          this.logger.info(`Loaded ${cookies.length} cookies for ${site.name}`);
          return true;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to load cookies for ${site.name}:`, error.message);
    }
    return false;
  }

  getCookiesKey(site) {
    const url = new URL(site.url);
    return `${url.hostname}`;
  }

  /**
   * 发送问题到单个网站（使用 Provider）
   */
  async sendQuestionToSite(site, question) {
    const startTime = Date.now();
    let page = null;
    
    try {
      // 获取 Provider
      const provider = await this.getProvider(site);
      
      // 获取页面
      page = await this.getPage();
      
      this.logger.info(`[${site.name}] Starting request with ${provider.config.providerType}`);
      
      // 加载保存的 cookies
      const hasCookies = await this.loadCookies(site, page);
      if (hasCookies) {
        this.logger.info(`[${site.name}] Using saved cookies`);
      }

      // 导航到网站
      await page.goto(site.url, { 
        waitUntil: 'networkidle2',
        timeout: site.timeout || 30000
      });
      
      this.logger.info(`[${site.name}] Page loaded`);

      // 认证检查
      const authenticated = await provider.authenticate(page);
      if (!authenticated) {
        return {
          site: site.name,
          answer: '',
          timestamp: new Date().toISOString(),
          status: 'failed',
          error: `Login required for ${site.name}`,
          requiresLogin: true
        };
      }

      // 发送问题
      const answer = await provider.sendQuestion(page, question);
      
      // 保存 cookies
      await this.saveCookies(site, page);

      const latency = Date.now() - startTime;
      provider.updateStats(true, latency);
      
      this.logger.info(`[${site.name}] Successfully got answer (${answer.length} chars)`);

      return {
        site: site.name,
        answer: answer,
        timestamp: new Date().toISOString(),
        status: 'success',
        latency,
        provider: provider.config.providerType
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      
      // 更新 Provider 统计
      const provider = this.providerCache.get(site.id);
      if (provider) {
        provider.updateStats(false, latency);
      }
      
      this.logger.error(`[${site.name}] Error:`, error);
      
      // 提取错误信息
      let errorMessage;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      
      const isLoginError = errorMessage.toLowerCase().includes('login') || 
                          errorMessage.includes('登录') ||
                          errorMessage.includes('需要登录');
      
      return {
        site: site.name,
        answer: '',
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: errorMessage,
        requiresLogin: isLoginError,
        latency
      };
    } finally {
      if (page) {
        await this.releasePage(page);
      }
    }
  }

  /**
   * 带重试机制的问题发送
   */
  async sendQuestionToSiteWithRetry(site, question, maxRetries = null) {
    const retries = maxRetries || this.maxRetries;
    
    for (let i = 0; i < retries; i++) {
      const result = await this.sendQuestionToSite(site, question);
      
      if (result.status === 'success' || result.requiresLogin) {
        return result;
      }
      
      this.logger.warn(`Attempt ${i + 1} failed for ${site.name}: ${result.error}`);
      
      if (i === retries - 1) {
        return result;
      }
      
      // 指数退避
      const delayTime = this.retryDelay * Math.pow(2, i);
      this.logger.info(`Retrying ${site.name} after ${delayTime}ms delay`);
      await this.delay(delayTime);
    }
  }

  /**
   * 并发发送问题到多个网站
   */
  async sendQuestionToMultipleSites(question, sites) {
    const enabledSites = sites.filter(site => site.enabled);
    this.logger.info(`Processing ${enabledSites.length} enabled sites`);
    
    const results = [];
    
    // 分批处理以控制并发
    for (let i = 0; i < enabledSites.length; i += this.maxConcurrency) {
      const batch = enabledSites.slice(i, i + this.maxConcurrency);
      this.logger.info(`Processing batch ${Math.floor(i / this.maxConcurrency) + 1} of ${Math.ceil(enabledSites.length / this.maxConcurrency)}`);
      
      const batchPromises = batch.map(site => 
        this.sendQuestionToSiteWithRetry(site, question)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // 处理结果
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const site = batch[index];
          this.logger.error(`Unexpected error for ${site.name}:`, result.reason);
          results.push({
            site: site.name,
            answer: '',
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    this.logger.info(`Completed: Success: ${successCount}, Failed: ${failedCount}`);
    
    return results;
  }

  /**
   * 流式发送问题（未来实现）
   */
  async streamQuestionToSite(site, question, onChunk, onComplete, onError) {
    // TODO: 实现真实的流式处理
    // 1. 创建页面
    // 2. 使用 provider.streamQuestion()
    // 3. 实时推送 chunk 到回调
    throw new Error('Streaming not yet implemented');
  }

  /**
   * 获取所有 Provider 统计
   */
  async getAllProviderStats() {
    const stats = {};
    for (const [siteId, provider] of this.providerCache) {
      stats[provider.config.name] = provider.getStats();
    }
    return stats;
  }

  /**
   * 获取 Provider 信息
   */
  async getProviderInfo(siteId) {
    const provider = this.providerCache.get(siteId);
    if (!provider) return null;
    
    return {
      name: provider.config.name,
      type: provider.config.providerType,
      status: provider.status,
      capabilities: provider.capabilities,
      stats: provider.getStats()
    };
  }

  /**
   * 控制浏览器窗口
   */
  async showBrowser() {
    if (this.browser) {
      try {
        const pages = await this.browser.pages();
        for (const page of pages) {
          await page.bringToFront();
        }
        this.logger.info('Browser windows brought to front');
        return { success: true };
      } catch (error) {
        this.logger.error('Error showing browser:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Browser not initialized' };
  }

  async hideBrowser() {
    if (this.browser) {
      try {
        const pages = await this.browser.pages();
        for (const page of pages) {
          // 最小化窗口
          await page.evaluate(() => {
            window.moveTo(-10000, -10000);
          }).catch(() => {});
        }
        this.logger.info('Browser windows minimized');
        return { success: true };
      } catch (error) {
        this.logger.error('Error hiding browser:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Browser not initialized' };
  }

  /**
   * 关闭资源
   */
  async close() {
    this.logger.info('Closing BrowserAutomation');
    try {
      // 关闭所有页面
      for (const page of this.pagesPool) {
        try {
          await page.close();
        } catch (error) {
          this.logger.warn('Error closing page:', error.message);
        }
      }
      this.pagesPool = [];
      this.activePages.clear();
      
      // 关闭浏览器
      if (this.browser) {
        await this.browser.close();
        this.logger.info('Browser closed successfully');
      }
      
      // 关闭数据库
      this.dbManager.close();
      this.logger.info('Database connection closed');
    } catch (error) {
      this.logger.error('Error while closing BrowserAutomation:', error);
      throw error;
    }
  }

  /**
   * 获取浏览器状态
   */
  async getStatus() {
    const status = {
      initialized: this.browser !== null,
      pages: {
        pool: this.pagesPool.length,
        active: this.activePages.size
      },
      providers: this.providerCache.size,
      concurrency: this.maxConcurrency
    };
    
    if (this.browser) {
      try {
        const browserWSEndpoint = this.browser.wsEndpoint();
        status.wsEndpoint = browserWSEndpoint;
      } catch (error) {
        // ignore
      }
    }
    
    return status;
  }
}

module.exports = { BrowserAutomation };