const { BrowserAutomation } = require('./browser-automation');
const { DatabaseManager } = require('../shared/database');
const { Logger } = require('./logger');
const { AnswerAdapter } = require('./answer-adapter');

class QuestionProcessor {
  constructor(dbManager = null) {
    this.automation = new BrowserAutomation();
    // 如果提供了数据库管理器实例，则使用它；否则创建新的实例
    this.dbManager = dbManager || new DatabaseManager();
    this.logger = new Logger('QuestionProcessor');
  }

  async init() {
    this.logger.info('Initializing QuestionProcessor');
    try {
      await this.automation.init();
      // 不在这里初始化dbManager，因为它可能已在别处初始化
      this.logger.info('QuestionProcessor initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize QuestionProcessor:', error);
      throw error;
    }
  }

  async processQuestion(question) {
    this.logger.info('Processing question:', question);
    const startTime = Date.now();
    
    try {
      // 获取启用的AI网站
      const sites = await this.dbManager.getAiSites();
      const enabledSites = sites.filter(site => site.enabled);

      if (enabledSites.length === 0) {
        const error = new Error('没有启用任何AI网站');
        this.logger.error('No AI sites enabled');
        throw error;
      }

      this.logger.info(`Found ${enabledSites.length} enabled AI sites:`, 
        enabledSites.map(site => site.name));

      // 保存初始记录
      const recordId = await this.dbManager.saveQaRecord({
        question,
        answers: [],
        status: 'pending'
      });

      this.logger.info(`Created QA record with ID: ${recordId}`);

      // 向多个网站发送问题
      const answers = await this.automation.sendQuestionToMultipleSites(question, enabledSites);
      
      // 使用回答适配器统一格式
      const adaptedAnswers = answers.map(answer => {
        if (answer.status === 'success' && answer.answer) {
          try {
            const adapted = AnswerAdapter.adapt(answer.answer, answer.site);
            return {
              ...answer,
              adaptedAnswer: adapted
            };
          } catch (adaptError) {
            this.logger.warn(`Failed to adapt answer for ${answer.site}:`, adaptError.message);
            return answer;
          }
        }
        return answer;
      });
      
      const successCount = answers.filter(answer => answer.status === 'success').length;
      const failedCount = answers.filter(answer => answer.status === 'failed').length;
      
      this.logger.info(`Question processing completed. Success: ${successCount}, Failed: ${failedCount}`);

      // 更新记录
      await this.dbManager.saveQaRecord({
        id: recordId,
        question,
        answers: adaptedAnswers,
        status: 'completed'
      });

      const duration = Date.now() - startTime;
      this.logger.info(`Question processing finished in ${duration}ms`);

      return {
        question,
        answers: adaptedAnswers,
        status: 'completed',
        duration
      };

    } catch (error) {
      this.logger.error('Failed to process question:', error);
      
      // 尝试保存错误记录
      try {
        await this.dbManager.saveQaRecord({
          question,
          answers: [],
          status: 'failed',
          error: error.message
        });
      } catch (dbError) {
        this.logger.error('Failed to save error record:', dbError);
      }
      
      throw error;
    }
  }

  async close() {
    this.logger.info('Closing QuestionProcessor');
    try {
      await this.automation.close();
      // 不关闭dbManager，因为它可能在其他地方使用
      this.logger.info('QuestionProcessor closed successfully');
    } catch (error) {
      this.logger.error('Error while closing QuestionProcessor:', error);
      throw error;
    }
  }
}

module.exports = { QuestionProcessor };