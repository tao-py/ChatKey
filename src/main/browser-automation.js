const puppeteer = require('puppeteer');
const { DatabaseManager } = require('../shared/database');
const { Logger } = require('./logger');

// 网站适配器类 - 处理不同网站的特殊交互逻辑
class SiteAdapter {
  static async adapt(page, site, question) {
    const siteName = site.name.toLowerCase();
    
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
    console.log('Using DeepSeek specific adapter');
    
    // DeepSeek 可能需要登录或处理欢迎界面
    try {
      // 检查是否有欢迎界面或登录提示
      const welcomeButton = await page.$('button:has-text("开始聊天")');
      if (welcomeButton) {
        await welcomeButton.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      console.log('No welcome screen found or already dismissed');
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
  
  static async handleGeneric(page, site, question) {
    console.log('Using generic adapter');
    
    // 通用的处理逻辑 - 与原有的sendQuestionToSite逻辑类似
    const config = site.config ? JSON.parse(site.config) : {};
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
      this.browser = await puppeteer.launch({
        headless: false, // 开发时设置为false方便调试
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });
      this.logger.info('BrowserAutomation initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize BrowserAutomation:', error);
      throw error;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        
        if (i === retries - 1) {
          // 最后一次尝试失败，返回错误结果
          this.logger.error(`All attempts failed for ${site.name}`);
          return {
            site: site.name,
            answer: '',
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: typeof error.message === 'string' ? error.message : String(error)
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

    const page = await this.browser.newPage();
    
    try {
      // 设置页面超时和视口
      page.setDefaultTimeout(30000);
      await page.setViewport({ width: 1280, height: 720 });
      
      // 设置用户代理以避免被检测为机器人
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      
      // 导航到网站
      this.logger.info(`Navigating to ${site.name}: ${site.url}`);
      await page.goto(site.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // 使用网站特定的适配器处理交互
      await SiteAdapter.adapt(page, site, question);
      
      // 等待回答出现 - 使用多种策略
      this.logger.info(`Waiting for answer selector: ${site.selector}`);
      
      try {
        // 主要策略：等待选择器出现
        await page.waitForSelector(site.selector, { timeout: 15000 });
      } catch {
        this.logger.warn(`Primary selector failed for ${site.name}, trying fallback strategies`);
        
        // 备选策略1：等待更长时间
        await page.waitForTimeout(5000);
        
        // 备选策略2：检查是否有加载指示器
        const loadingSelectors = ['.loading', '.spinner', '[data-loading]', '.animate-pulse'];
        for (const loadingSelector of loadingSelectors) {
          const loadingElement = await page.$(loadingSelector);
          if (loadingElement) {
            this.logger.info(`Found loading element, waiting for it to disappear`);
            await page.waitForFunction(
              (selector) => !document.querySelector(selector),
              { timeout: 10000 },
              loadingSelector
            );
            break;
          }
        }
        
        // 备选策略3：等待内容出现
        await page.waitForFunction(
          (selector) => {
            const element = document.querySelector(selector);
            return element && element.textContent && element.textContent.trim().length > 0;
          },
          { timeout: 10000 },
          site.selector
        );
      }
      
      // 获取回答内容 - 尝试多种选择器
      let answer = '';
      const selectorsToTry = [site.selector];
      
      // 为特定网站添加备选选择器
      if (site.name.toLowerCase().includes('deepseek')) {
        selectorsToTry.push('.markdown-content', '.message-content', '[data-testid*="content"]');
      } else if (site.name.toLowerCase().includes('tongyi') || site.name.includes('通义')) {
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
            this.logger.info(`Got answer using selector: ${selector}`);
            break;
          }
        } catch (e) {
          this.logger.warn(`Selector ${selector} failed: ${e.message}`);
          continue;
        }
      }
      
      if (!answer || answer.length === 0) {
        throw new Error(`Could not extract answer content from ${site.name}`);
      }
      
      this.logger.info(`Successfully got answer from ${site.name}: ${answer.substring(0, 100)}...`);
      
      return {
        site: site.name,
        answer: answer,
        timestamp: new Date().toISOString(),
        status: 'success'
      };
      
    } catch (error) {
      console.error(`Error on ${site.name}:`, error);
      throw error; // 重新抛出错误，让重试机制处理
    } finally {
      await page.close();
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
}

module.exports = { BrowserAutomation };