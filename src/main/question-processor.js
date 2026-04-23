/**
 * 问题处理器 - 重构版
 * 使用 Provider 模式，整合 ConfigManager 和增强的错误处理
 */

const { EnhancedBrowserManager } = require('./browser-manager');
const { DatabaseManager } = require('../shared/database');
const { ConfigManager } = require('../shared/config');
const { Logger } = require('./logger');
const { AnswerAdapter } = require('./answer-adapter');
const { providerRegistry } = require('../shared/providers');

class QuestionProcessor {
  constructor() {
    this.browserManager = null;  // 延迟初始化
    this.dbManager = new DatabaseManager();
    this.configManager = new ConfigManager(this.dbManager);
    this.logger = new Logger('QuestionProcessor');
    this.circuitBreaker = new CircuitBreaker({
      threshold: 5,
      timeout: 30000,
      resetTimeout: 60000
    });
    this.responseCache = new ResponseCache(this.dbManager);
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    this.logger.info('Initializing QuestionProcessor');
    
    try {
      // 初始化数据库
      await this.dbManager.init();
      
      // 初始化浏览器管理器
      this.browserManager = new EnhancedBrowserManager();
      await this.browserManager.init();
      
      // 加载 Provider 注册表
      providerRegistry.loadDefaultProviders();
      
      this.initialized = true;
      this.logger.info('QuestionProcessor initialized successfully');
      console.log('✅ 系统初始化完成');
      console.log(`📦 已加载 ${providerRegistry.providers.size} 个 Provider`);
      console.log(`🌐 浏览器管理器: ${this.attachOnly ? '连接模式' : '启动模式'}`);
      
    } catch (error) {
      this.logger.error('Failed to initialize QuestionProcessor:', error);
      throw error;
    }
  }

  /**
   * 处理问题的主入口
   */
  async processQuestion(question, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    this.logger.info(`[${requestId}] Processing question: ${question.substring(0, 50)}...`);
    
    try {
      // 1. 验证输入
      this.validateQuestion(question);
      
      // 2. 检查缓存（如果启用）
      if (options.useCache !== false) {
        const cached = await this.responseCache.get(question);
        if (cached) {
          this.logger.info(`[${requestId}] Cache hit`);
          return {
            ...cached,
            fromCache: true,
            requestId
          };
        }
      }
      
      // 3. 获取启用的 AI 网站
      const sites = await this.dbManager.getEnabledAiSites();
      
      if (sites.length === 0) {
        throw new Error('没有启用任何AI网站，请在网站管理中启用至少一个网站');
      }
      
      this.logger.info(`[${requestId}] Found ${sites.length} enabled sites: ${sites.map(s => s.name).join(', ')}`);
      
      // 4. 保存初始记录
      const recordId = await this.dbManager.saveQaRecord({
        question,
        answers: [],
        status: 'processing'
      });
      
      // 5. 处理问题（并发批处理）
      const results = await this.processWithPipeline(question, sites, {
        requestId,
        recordId,
        stream: options.stream || false
      });
      
      // 6. 格式化答案
      const adaptedResults = this.adaptAnswers(results);
      
      // 7. 计算统计信息
      const duration = Date.now() - startTime;
      const stats = this.calculateStats(adaptedResults, duration);
      
      // 8. 保存结果
      await this.saveResults(recordId, question, adaptedResults, 'completed', duration);
      
      // 9. 缓存结果（如果启用）
      if (options.cacheResults !== false) {
        await this.responseCache.set(question, {
          question,
          answers: adaptedResults,
          status: 'completed',
          duration
        });
      }
      
      // 10. 记录指标
      await this.recordMetric('question.processed', 1, {
        siteCount: sites.length,
        successCount: stats.successCount,
        duration
      });
      
      return {
        requestId,
        question,
        answers: adaptedResults,
        status: 'completed',
        duration,
        stats
      };
      
    } catch (error) {
      this.logger.error(`[${requestId}] Failed to process question:`, error);
      
      // 记录失败指标
      await this.recordMetric('question.failed', 1, { error: error.message });
      
      throw error;
    }
  }

  /**
   * 处理管道（支持并行和流式）
   */
  async processWithPipeline(question, sites, context) {
    const { stream = false } = context;
    
    if (stream) {
      // 流式处理（未来实现）
      return this.processStreaming(question, sites, context);
    } else {
      // 批量并行处理
      return await this.processBatch(question, sites, context);
    }
  }

  /**
   * 批量并行处理（使用BrowserManager）
   */
  async processBatch(question, sites, context) {
    const results = [];
    
    // 分批处理以控制并发
    for (let i = 0; i < sites.length; i += this.browserManager.maxConcurrency) {
      const batch = sites.slice(i, i + this.browserManager.maxConcurrency);
      
      const batchPromises = batch.map(site => 
        this.processSiteWithCircuitBreaker(site, question, context)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            site: 'unknown',
            answer: '',
            status: 'failed',
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
    }
    
    return results;
  }

  /**
   * 带熔断器的单站点处理
   */
  async processSiteWithCircuitBreaker(site, question, context) {
    const circuitKey = `site:${site.id}`;
    
    // 检查熔断器状态
    if (this.circuitBreaker.isOpen(circuitKey)) {
      this.logger.warn(`[${site.name}] Circuit breaker is OPEN, skipping`);
      return {
        site: site.name,
        answer: '',
        status: 'failed',
        error: 'Service temporarily unavailable (circuit breaker open)',
        circuitBreakerOpen: true
      };
    }
    
    try {
      const result = await this.browserManager.sendQuestionToSite(site, question);
      
      // 记录成功
      this.circuitBreaker.recordSuccess(circuitKey);
      
      return result;
    } catch (error) {
      // 记录失败
      this.circuitBreaker.recordFailure(circuitKey);
      throw error;
    }
  }

  /**
   * 流式处理（占位实现）
   */
  async processStreaming(question, sites, context) {
    // TODO: 实现流式处理
    // 1. 对每个 site 启动流式请求
    // 2. 使用 AsyncGenerator 实时产出结果
    // 3. 通过 EventEmitter 推送到前端
    throw new Error('Streaming mode not yet implemented');
  }

  /**
   * 格式化答案
   */
  adaptAnswers(results) {
    return results.map(answer => {
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
  }

  /**
   * 计算统计信息
   */
  calculateStats(results, duration) {
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const avgLatency = results.reduce((sum, r) => sum + (r.latency || 0), 0) / results.length;
    
    return {
      totalSites: results.length,
      successCount,
      failedCount,
      successRate: (successCount / results.length * 100).toFixed(1) + '%',
      avgLatency: Math.round(avgLatency),
      duration
    };
  }

  /**
   * 保存结果
   */
  async saveResults(recordId, question, answers, status, duration) {
    await this.dbManager.saveQaRecord({
      id: recordId,
      question,
      answers,
      status,
      duration
    });
  }

  /**
   * 验证问题
   */
  validateQuestion(question) {
    if (!question || typeof question !== 'string') {
      throw new Error('问题必须是非空字符串');
    }
    
    if (question.trim().length === 0) {
      throw new Error('问题不能只包含空白字符');
    }
    
    if (question.length > 10000) {
      throw new Error('问题长度不能超过10000字符');
    }
  }

  /**
   * 生成请求 ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 记录指标
   */
  async recordMetric(name, value, tags = {}) {
    try {
      await this.dbManager.recordMetric(name, value, tags);
    } catch (error) {
      this.logger.warn('Failed to record metric:', error.message);
    }
  }

  /**
   * 获取统计摘要
   */
  async getStatsSummary() {
    return await this.dbManager.getStatsSummary();
  }

  /**
   * 获取系统健康状态
   */
  async getHealthStatus() {
    const dbHealth = await this.dbManager.healthCheck();
    const browserStatus = await this.browserManager?.getStatus() || { initialized: false };
    const providerStats = await this.browserManager?.getAllProviderStats() || [];
    
    return {
      status: dbHealth.healthy && browserStatus.initialized ? 'healthy' : 'unhealthy',
      database: dbHealth,
      browser: browserStatus,
      providers: providerStats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 清理缓存
   */
  async clearCache() {
    await this.responseCache.clear();
    this.browserManager?.clearAllProviderCache();
    this.logger.info('Cache cleared');
  }

  /**
   * 关闭资源
   */
  async close() {
    if (this.browserManager) {
      await this.browserManager.close();
    }
    this.dbManager.close();
    this.logger.info('QuestionProcessor closed');
  }
}

/**
 * 熔断器 - 防止 cascading failures
 */
class CircuitBreaker {
  constructor({ threshold = 5, timeout = 30000, resetTimeout = 60000 } = {}) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
    this.states = new Map(); // key -> { state, failures, lastFailureTime }
  }

  isOpen(key) {
    const state = this.states.get(key);
    return state && state.state === 'open';
  }

  recordSuccess(key) {
    const state = this.states.get(key) || { state: 'closed', failures: 0 };
    state.state = 'closed';
    state.failures = 0;
    state.lastFailureTime = null;
    this.states.set(key, state);
  }

  recordFailure(key) {
    let state = this.states.get(key);
    
    if (!state) {
      state = { state: 'closed', failures: 0, lastFailureTime: null };
    }
    
    state.failures++;
    state.lastFailureTime = Date.now();
    
    if (state.failures >= this.threshold) {
      state.state = 'open';
      console.warn(`Circuit breaker opened for ${key}`);
      
      // 设置自动恢复计时器
      setTimeout(() => {
        state.state = 'half-open';
        this.states.set(key, state);
        console.log(`Circuit breaker half-open for ${key}`);
      }, this.timeout);
    }
    
    this.states.set(key, state);
  }

  tryAllow(key) {
    const state = this.states.get(key);
    
    if (!state || state.state === 'closed') {
      return true;
    }
    
    if (state.state === 'half-open') {
      return true; // 允许一次试探请求
    }
    
    return false;
  }
}

/**
 * 响应缓存 - 基于问题哈希的缓存
 */
class ResponseCache {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.memoryCache = new Map();
    this.memoryTTL = 300000; // 5分钟内存缓存
  }

  async get(question) {
    const hash = this.hashQuestion(question);
    
    // 1. 检查内存缓存
    const memoryEntry = this.memoryCache.get(hash);
    if (memoryEntry && memoryEntry.expires > Date.now()) {
      return memoryEntry.value;
    }
    
    // 2. 检查数据库缓存
    try {
      const rows = await this.dbManager.all(
        'SELECT response_data, expires_at FROM response_cache WHERE question_hash = ?',
        [hash]
      );
      
      if (rows.length > 0) {
        const row = rows[0];
        const expiresAt = new Date(row.expires_at);
        
        if (expiresAt > new Date()) {
          const value = JSON.parse(row.response_data);
          
          // 更新内存缓存
          this.memoryCache.set(hash, {
            value,
            expires: expiresAt.getTime()
          });
          
          return value;
        }
      }
    } catch (error) {
      console.warn('Cache get error:', error.message);
    }
    
    return null;
  }

  async set(question, value, ttl = 3600000) {
    const hash = this.hashQuestion(question);
    const expiresAt = new Date(Date.now() + ttl);
    
    // 更新内存缓存
    this.memoryCache.set(hash, {
      value,
      expires: expiresAt.getTime()
    });
    
    // 保存到数据库 - 使用 MySQL TIMESTAMP 格式
    const mysqlTimestamp = expiresAt.toISOString().replace('T', ' ').substring(0, 19);
    
    try {
      await this.dbManager.run(`
        INSERT INTO response_cache (question_hash, question_text, response_data, expires_at)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE response_data = ?, expires_at = ?
      `, [
        hash,
        question.substring(0, 500),
        JSON.stringify(value),
        mysqlTimestamp,
        JSON.stringify(value),
        mysqlTimestamp
      ]);
    } catch (error) {
      console.warn('Cache set error:', error.message);
    }
  }

  async clear() {
    this.memoryCache.clear();
    try {
      await this.dbManager.run('DELETE FROM response_cache');
    } catch (error) {
      console.warn('Cache clear error:', error.message);
    }
  }

  hashQuestion(question) {
    // 简单的哈希函数（生产环境应该用更健壮的）
    let hash = 0;
    for (let i = 0; i < question.length; i++) {
      const char = question.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `q_${Math.abs(hash)}`;
  }
}

module.exports = { QuestionProcessor };