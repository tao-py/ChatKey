const puppeteer = require('puppeteer');
const { DatabaseManager } = require('../shared/database');
const { Logger } = require('./logger');

// 网站适配器类 - 处理不同网站的特殊交互逻辑
class SiteAdapter {
  static async adapt(page, site, question) {
    const siteName = site.name;
    
    // 首先检查登录状态（如果失败会抛出错误，由重试机制处理）
    await this.checkLoginStatus(page, site);
    
    // 网站特定处理
    switch (siteName) {
      case 'deepseek':
        return await this.handleDeepSeek(page, site, question);
      case '通义千问':
      case 'tongyi':
        return await this.handleTongyi(page, site, question);
      case 'doubao':
      case '豆包':
        return await this.handleDoubao(page, site, question);
      case '文心一言':
      case 'yiyan':
      case 'baidu':
        return await this.handleYiyan(page, site, question);
      default:
        return await this.handleGeneric(page, site, question);
    }
  }
  
  static async handleDeepSeek(page, site, question) {
    console.log(`[${site.name}] Using DeepSeek specific adapter`);
    
    // DeepSeek 可能需要处理欢迎界面
    try {
      // 检查是否有欢迎界面
      const welcomeSelectors = [
        'button:has-text("开始聊天")',
        'button:has-text("开始对话")',
        'button:has-text("Start Chat")',
        'button[class*="welcome"]',
        'button[class*="start"]'
      ];
      
      for (const selector of welcomeSelectors) {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          console.log(`[${site.name}] Found welcome button, clicking it`);
          await element.click();
          await page.waitForTimeout(1000);
          break;
        }
      }
    } catch (error) {
      console.log(`[${site.name}] No welcome screen found or error:`, error.message);
    }
    
    return await this.handleGeneric(page, site, question);
  }
  
  static async handleTongyi(page, site, question) {
    console.log('Using Tongyi specific adapter');
    
    // 通义千问可能需要处理弹窗或引导
    try {
      // 关闭可能的引导弹窗
      const closeButton = await page.$('button.ant-modal-close, .close-btn');
      if (closeButton) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    } catch {
      console.log('No modal found or already closed');
    }
    
    return await this.handleGeneric(page, site, question);
  }
  
  static async handleDoubao(page, site, question) {
    console.log('Using Doubao specific adapter');
    
    // 豆包可能需要处理特定的交互逻辑
    try {
      // 等待页面完全加载
      await page.waitForTimeout(3000);
      
      // 检查是否需要登录
      const loginButton = await page.$('button:has-text("登录")');
      if (loginButton) {
        throw new Error('Doubao requires login. Please login manually first.');
      }
    } catch (error) {
      if (error.message.includes('requires login')) {
        throw error;
      }
      console.log('Login check passed or not required');
    }
    
    return await this.handleGeneric(page, site, question);
  }
  
  static async handleYiyan(page, site, question) {
    console.log('Using Yiyan specific adapter');
    
    // 文心一言可能需要处理特定的加载逻辑
    try {
      // 等待页面加载完成
      await page.waitForLoadState('networkidle');
      
      // 检查是否有开始对话的按钮
      const startButton = await page.$('button:has-text("开始对话")');
      if (startButton) {
        await startButton.click();
        await page.waitForTimeout(2000);
      }
    } catch {
      console.log('No start conversation button found or already started');
    }
    
    return await this.handleGeneric(page, site, question);
  }
  
   static async checkLoginStatus(page, site) {
     console.log(`[${site.name}] Checking login status`);

     // 常见的登录提示选择器
     const loginSelectors = [
       // 通用
       'button:has-text("登录")',
       'button:has-text("Log in")',
       'button:has-text("Sign in")',
       'button:has-text("登录 / 注册")',
       'a:has-text("登录")',
       'a:has-text("Log in")',
       'a:has-text("Sign in")',
       'input[type="password"]',
       'input[placeholder*="密码"]',
       'input[placeholder*="Password"]',
       '.login-button',
       '.signin-button',
       '[data-testid*="login"]',
       '[id*="login"]',
       '[class*="login"]',
       '[class*="signin"]',
       
       // DeepSeek 特定
       'a[href*="login"]',
       'button[class*="login"]',
       '.login-tab',
       '[data-testid="login-button"]',
       
       // 通义千问特定
       '.ant-modal-body button:has-text("登录")',
       '.ant-modal-body a:has-text("登录")',
       
       // 豆包特定
       '[class*="Login"]',
       
       // 文心一言特定
       '.login-btn'
     ];

     // 检查是否有登录提示
     let loginVisible = false;
     let matchingSelector = null;
     for (const selector of loginSelectors) {
       try {
         const element = await page.$(selector);
         if (element) {
           const isVisible = await element.isVisible();
           if (isVisible) {
             loginVisible = true;
             matchingSelector = selector;
             break;
           }
         }
       } catch {
         // 忽略选择器错误
       }
     }

     if (loginVisible) {
       console.log(`[${site.name}] Login required (detected: ${matchingSelector})`);
       console.log(`[${site.name}] ============================================`);
       console.log(`[${site.name}] 检测到需要登录 ${site.name}`);
       console.log(`[${site.name}] 请在弹出的浏览器窗口中手动登录`);
       console.log(`[${site.name}] 登录成功后，程序将自动继续...`);
       console.log(`[${site.name}] ============================================`);
       
        // 发送通知到渲染进程（如果可用）
        try {
          if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.showLoginNotification) {
            await window.electronAPI.showLoginNotification(`请登录 ${site.name}`);
          }
        } catch {
          // 忽略，可能不在渲染进程
        }

       const timeout = 120000; // 2 minutes
       const startTime = Date.now();
       let loggedIn = false;

       while (Date.now() - startTime < timeout) {
         // Re-check if any login selector is still visible
         loginVisible = false;
         for (const selector of loginSelectors) {
           try {
             const element = await page.$(selector);
             if (element && await element.isVisible()) {
               loginVisible = true;
               break;
             }
           } catch {
             // ignore
           }
         }

         if (!loginVisible) {
           loggedIn = true;
           console.log(`[${site.name}] Login detected! Continuing...`);
           break;
         }

         // Wait before next check
         await page.waitForTimeout(2000);
         const elapsed = Math.floor((Date.now() - startTime) / 1000);
         if (elapsed % 10 === 0) { // 每10秒输出一次
           console.log(`[${site.name}] Still waiting for login... (${elapsed}s elapsed)`);
         }
       }

       if (!loggedIn) {
         throw new Error(`登录 ${site.name} 超时（2分钟）。请手动登录后重试。`);
       }

       // Give the page a moment to stabilize after login
       await page.waitForTimeout(3000);
     }

     // 检查是否有欢迎/开始聊天按钮（这可能是登录后的状态）
     const welcomeSelectors = [
       'button:has-text("开始聊天")',
       'button:has-text("开始对话")',
       'button:has-text("Start Chat")',
       'button:has-text("New Chat")',
       // DeepSeek特定
       '[class*="welcome"] button',
       '[class*="start"] button'
     ];

     for (const selector of welcomeSelectors) {
       try {
         const element = await page.$(selector);
         if (element) {
           const isVisible = await element.isVisible();
           if (isVisible) {
             console.log(`[${site.name}] Welcome screen detected, clicking to dismiss`);
             await element.click();
             await page.waitForTimeout(2000);
           }
         }
       } catch {
         // 忽略选择器错误
       }
     }

     console.log(`[${site.name}] Login check passed`);
     return true;
   }
  
  static async handleGeneric(page, site, question) {
    console.log('Using generic adapter');
    
    // 通用的处理逻辑 - 与原有的sendQuestionToSite逻辑类似
    let config = {};
    if (site.config) {
      if (typeof site.config === 'string') {
        try {
          config = JSON.parse(site.config);
        } catch (error) {
          console.error('Failed to parse config string:', error);
          config = {};
        }
      } else if (typeof site.config === 'object' && site.config !== null) {
        config = site.config;
      }
    }
    const waitTime = config.waitTime || 2000;
    
    // 等待页面加载
    await page.waitForTimeout(waitTime);
    
    // 处理输入框
    await page.waitForSelector(site.input_selector, { timeout: 10000 });
    
    // 清除现有内容并输入新问题
    await page.click(site.input_selector, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type(site.input_selector, question);
    
    // 提交问题
    await page.waitForSelector(site.submit_selector, { timeout: 10000 });
    await page.click(site.submit_selector);
    
    return true;
  }
}

class BrowserAutomation {
  constructor() {
    this.browser = null;
    this.dbManager = new DatabaseManager();
    this.logger = new Logger('BrowserAutomation');
    this.maxConcurrency = 3; // 最大并发数
    this.maxRetries = 3; // 最大重试次数
    this.retryDelay = 1000; // 基础重试延迟（毫秒）
  }

  async init() {
    this.logger.info('Initializing BrowserAutomation');
    try {
      await this.dbManager.init();
      
      // 根据环境决定启动参数
      const launchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage', // 避免共享内存问题
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote'
      ];
      
      // 在Windows上添加特定参数
      if (process.platform === 'win32') {
        launchArgs.push('--disable-gpu');
      }
      
      this.browser = await puppeteer.launch({
        headless: false, // 始终显示浏览器窗口
        defaultViewport: null,
        args: launchArgs,
        // Windows上需要指定executablePath（可选）
        // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      });
      
      this.logger.info('BrowserAutomation initialized successfully');
      console.log('🚀 浏览器已启动，窗口应该可见');
    } catch (error) {
      this.logger.error('Failed to initialize BrowserAutomation:', error);
      throw error;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cookie管理方法
  async saveCookies(site, page) {
    try {
      const cookies = await page.cookies();
      const cookiesKey = this.getCookiesKey(site);
      // 将cookies保存到数据库
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
        const cookiesData = rows[0].cookies_data;
        if (cookiesData) {
          const cookies = JSON.parse(cookiesData);
        if (cookies.length > 0) {
          // Prepare cookies for setting: include url to avoid navigation requirement, and remove read-only fields
          const cookiesToSet = cookies.map(c => {
            const cookie = { ...c };
            delete cookie.size;
            return { ...cookie, url: site.url };
          });
          await page.setCookie(...cookiesToSet);
          this.logger.info(`Loaded ${cookies.length} cookies for ${site.name}`);
          return true;
        }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to load cookies for ${site.name}:`, error.message);
    }
    return false;
  }

  getCookiesKey(site) {
    // 使用网站URL作为键，去除协议和路径部分
    const url = new URL(site.url);
    return `${url.hostname}`;
  }

  async sendQuestionToSiteWithRetry(site, question, maxRetries = null) {
    const retries = maxRetries || this.maxRetries;
    this.logger.info(`Starting question processing for ${site.name} with ${retries} max retries`);
    
    for (let i = 0; i < retries; i++) {
      try {
        const result = await this.sendQuestionToSite(site, question);
        this.logger.info(`Successfully processed ${site.name} on attempt ${i + 1}`);
        return result;
       } catch (error) {
        this.logger.warn(`Attempt ${i + 1} failed for ${site.name}:`, error.message);
        
         // 提取错误信息，避免 '[object Object]' 情况
         let errorMessage;
         if (typeof error === 'string') {
           errorMessage = error;
         } else if (error instanceof Error) {
           errorMessage = error.message;
         } else if (error && typeof error === 'object') {
           try {
             errorMessage = JSON.stringify(error);
           } catch {
             errorMessage = String(error);
           }
         } else {
           errorMessage = String(error);
         }
         
         const isLoginError = errorMessage.includes('登录') || 
                             errorMessage.toLowerCase().includes('login') || 
                             errorMessage.includes('需要登录') ||
                             errorMessage.includes('请手动登录');
         
         if (isLoginError) {
           // 如果是登录错误，立即返回，不进行重试
           this.logger.error(`[${site.name}] Login required: ${errorMessage}`);
           return {
             site: site.name,
             answer: '',
             timestamp: new Date().toISOString(),
             status: 'failed',
             error: errorMessage,
             requiresLogin: true
           };
         }
        
        if (i === retries - 1) {
          // 最后一次尝试失败，返回错误结果
          this.logger.error(`All attempts failed for ${site.name}`);
          return {
            site: site.name,
            answer: '',
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: errorMessage
          };
        }
        
        // 指数退避延迟
        const delayTime = this.retryDelay * Math.pow(2, i);
        this.logger.info(`Retrying ${site.name} after ${delayTime}ms delay`);
        await this.delay(delayTime);
      }
    }
  }

   async sendQuestionToSite(site, question) {
     if (!this.browser) {
       throw new Error('Browser not initialized');
     }

     // 确保浏览器窗口可见（在发送问题前自动显示）
     try {
       const pages = await this.browser.pages();
       if (pages.length > 0) {
         await pages[0].bringToFront();
         this.logger.info(`Browser window brought to front`);
       }
     } catch (error) {
       this.logger.warn(`Could not bring browser to front:`, error.message);
     }

     const page = await this.browser.newPage();
     const siteName = site.name;
     
     try {
       this.logger.info(`[${siteName}] Starting sendQuestionToSite`);
       
       // 设置页面超时和视口
       page.setDefaultTimeout(30000);
       await page.setViewport({ width: 1280, height: 720 });
       
       // 设置用户代理以避免被检测为机器人
       await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
       
       // 加载之前保存的cookies（如果存在）
       const hasCookies = await this.loadCookies(site, page);
       if (hasCookies) {
         this.logger.info(`[${siteName}] Using saved cookies`);
       } else {
         this.logger.info(`[${siteName}] No saved cookies found`);
       }
       
       // 导航到网站
       this.logger.info(`[${siteName}] Navigating to ${site.url}`);
       await page.goto(site.url, { 
         waitUntil: 'networkidle2',
         timeout: 30000
       });
       this.logger.info(`[${siteName}] Page loaded`);
       
       // 使用网站特定的适配器处理交互
       this.logger.info(`[${siteName}] Running site adapter`);
       await SiteAdapter.adapt(page, site, question);
       this.logger.info(`[${siteName}] Site adapter completed`);
       
       // 等待回答出现 - 使用多种策略
       this.logger.info(`[${siteName}] Waiting for answer selector: ${site.selector}`);
       
       try {
         // 主要策略：等待选择器出现
         await page.waitForSelector(site.selector, { timeout: 15000 });
         this.logger.info(`[${siteName}] Primary selector found`);
       } catch (primaryError) {
         this.logger.warn(`[${siteName}] Primary selector failed: ${primaryError.message}, trying fallback strategies`);
         
         // 备选策略1：等待更长时间
         await page.waitForTimeout(5000);
         
         // 备选策略2：检查是否有加载指示器
         const loadingSelectors = ['.loading', '.spinner', '[data-loading]', '.animate-pulse'];
         for (const loadingSelector of loadingSelectors) {
           const loadingElement = await page.$(loadingSelector);
           if (loadingElement) {
             this.logger.info(`[${siteName}] Found loading element, waiting for it to disappear`);
             await page.waitForFunction(
               (selector) => !document.querySelector(selector),
               { timeout: 10000 },
               loadingSelector
             );
             break;
           }
         }
         
         // 备选策略3：等待内容出现
         this.logger.info(`[${siteName}] Waiting for content to appear using fallback`);
         await page.waitForFunction(
           (selector) => {
             const element = document.querySelector(selector);
             return element && element.textContent && element.textContent.trim().length > 0;
           },
           { timeout: 10000 },
           site.selector
         );
       }
       
       this.logger.info(`[${siteName}] Answer should be available, attempting to extract`);
       
       // 获取回答内容 - 尝试多种选择器
       let answer = '';
       const selectorsToTry = [site.selector];
       
       // 为特定网站添加备选选择器
       if (siteName.toLowerCase().includes('deepseek')) {
         selectorsToTry.push('.markdown-content', '.message-content', '[data-testid*="content"]');
       } else if (siteName.toLowerCase().includes('tongyi') || siteName.includes('通义')) {
         selectorsToTry.push('.bubble-content', '.message-text', '.chat-message');
       }
       
       for (const selector of selectorsToTry) {
         try {
           answer = await page.$eval(selector, element => {
             // 清理文本内容
             let text = element.textContent || '';
             text = text.replace(/\s+/g, ' ').trim();
             return text;
           });
           
           if (answer && answer.length > 0) {
             this.logger.info(`[${siteName}] Got answer using selector: ${selector}, length: ${answer.length}`);
             break;
           }
         } catch (e) {
           this.logger.warn(`[${siteName}] Selector ${selector} failed: ${e.message}`);
           continue;
         }
       }
       
       if (!answer || answer.length === 0) {
         throw new Error(`Could not extract answer content from ${siteName}`);
       }
       
       this.logger.info(`[${siteName}] Successfully got answer: ${answer.substring(0, 100)}...`);
       
       // 保存cookies以便下次使用
       await this.saveCookies(site, page);
       
       return {
         site: siteName,
         answer: answer,
         timestamp: new Date().toISOString(),
         status: 'success'
       };
       
     } catch (error) {
       this.logger.error(`[${siteName}] Error in sendQuestionToSite:`, error);
       throw error; // 重新抛出错误，让重试机制处理
     } finally {
       try {
         await page.close();
         this.logger.info(`[${siteName}] Page closed`);
       } catch (closeError) {
         this.logger.warn(`[${siteName}] Error closing page:`, closeError);
       }
     }
   }

  async sendQuestionToMultipleSites(question, sites) {
    const enabledSites = sites.filter(site => site.enabled);
    this.logger.info(`Processing ${enabledSites.length} enabled sites`);
    
    // 使用Promise.allSettled实现并发控制
    const results = [];
    
    // 分批处理，控制并发数
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
          // 处理被拒绝的情况（理论上不应该发生，因为重试机制已经处理了错误）
          const site = batch[index];
          this.logger.error(`Unexpected error for ${site.name}:`, result.reason);
          let errorMessage = 'Unknown error';
          if (result.reason) {
            if (typeof result.reason === 'object' && result.reason.message) {
              errorMessage = result.reason.message;
            } else {
              errorMessage = String(result.reason);
            }
          }
          results.push({
            site: site.name,
            answer: '',
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: errorMessage
          });
        }
      });
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    this.logger.info(`Completed processing all sites. Success: ${successCount}, Failed: ${failedCount}`);
    return results;
  }

  async close() {
    this.logger.info('Closing BrowserAutomation');
    try {
      if (this.browser) {
        await this.browser.close();
        this.logger.info('Browser closed successfully');
      }
      this.dbManager.close();
      this.logger.info('Database connection closed');
    } catch (error) {
      this.logger.error('Error while closing BrowserAutomation:', error);
      throw error;
    }
  }

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
          // 最小化窗口（通过Electron API或浏览器API）
          await page.evaluate(() => {
            if (window.electronAPI && window.electronAPI.minimizeWindow) {
              window.electronAPI.minimizeWindow();
            } else {
              // 对于普通浏览器，只能最小化到后台（通过将窗口移出屏幕）
              window.moveTo(-10000, -10000);
            }
          }).catch(() => {
            // 忽略evaluate错误，某些页面可能不支持
          });
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
}

module.exports = { BrowserAutomation };