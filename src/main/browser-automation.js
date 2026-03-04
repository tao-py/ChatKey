const puppeteer = require('puppeteer');
const { DatabaseManager } = require('../shared/database');

class BrowserAutomation {
  constructor() {
    this.browser = null;
    this.dbManager = new DatabaseManager();
  }

  async init() {
    await this.dbManager.init();
    this.browser = await puppeteer.launch({
      headless: false, // 开发时设置为false方便调试
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async sendQuestionToSite(site, question) {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    try {
      // 导航到网站
      await page.goto(site.url, { waitUntil: 'networkidle2' });
      
      // 等待页面加载完成
      await page.waitForTimeout(2000);
      
      // 找到输入框并输入问题
      await page.waitForSelector(site.input_selector);
      await page.type(site.input_selector, question);
      
      // 点击提交按钮
      await page.waitForSelector(site.submit_selector);
      await page.click(site.submit_selector);
      
      // 等待回答出现
      await page.waitForSelector(site.selector, { timeout: 10000 });
      
      // 获取回答内容
      const answer = await page.$eval(site.selector, element => {
        // 清理文本内容
        let text = element.textContent || '';
        text = text.replace(/\s+/g, ' ').trim();
        return text;
      });
      
      return {
        site: site.name,
        answer: answer,
        timestamp: new Date().toISOString(),
        status: 'success'
      };
      
    } catch (error) {
      console.error(`Error on ${site.name}:`, error);
      return {
        site: site.name,
        answer: '',
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      };
    } finally {
      await page.close();
    }
  }

  async sendQuestionToMultipleSites(question, sites) {
    const results = [];
    
    for (const site of sites) {
      if (site.enabled) {
        const result = await this.sendQuestionToSite(site, question);
        results.push(result);
      }
    }
    
    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
    this.dbManager.close();
  }
}

module.exports = { BrowserAutomation };