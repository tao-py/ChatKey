const { BrowserAutomation } = require('./browser-automation');
const { DatabaseManager } = require('../shared/database');

class QuestionProcessor {
  constructor() {
    this.automation = new BrowserAutomation();
    this.dbManager = new DatabaseManager();
  }

  async init() {
    await this.automation.init();
    await this.dbManager.init();
  }

  async processQuestion(question) {
    try {
      // 获取启用的AI网站
      const sites = await this.dbManager.getAiSites();
      const enabledSites = sites.filter(site => site.enabled);

      if (enabledSites.length === 0) {
        throw new Error('没有启用任何AI网站');
      }

      // 保存初始记录
      const recordId = await this.dbManager.saveQaRecord({
        question,
        answers: [],
        status: 'pending'
      });

      // 向多个网站发送问题
      const answers = await this.automation.sendQuestionToMultipleSites(question, enabledSites);

      // 更新记录
      await this.dbManager.saveQaRecord({
        id: recordId,
        question,
        answers,
        status: 'completed'
      });

      return {
        question,
        answers,
        status: 'completed'
      };

    } catch (error) {
      console.error('处理问题失败:', error);
      throw error;
    }
  }

  async close() {
    await this.automation.close();
    this.dbManager.close();
  }
}

module.exports = { QuestionProcessor };