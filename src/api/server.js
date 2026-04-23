/**
 * API 网关 - 增强版
 * 基于 openclaw-zero-token 的网关设计理念
 * 支持限流、熔断、缓存、监控和流式响应
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { DatabaseManager } = require('../shared/database');
const { QuestionProcessor } = require('../main/question-processor');
const { Logger } = require('../main/logger');
const { providerRegistry } = require('../shared/providers');

class ApiGateway {
  constructor() {
    this.app = express();
    this.dbManager = new DatabaseManager();
    this.questionProcessor = null;
    this.logger = new Logger('ApiGateway');
    
    // 中间件实例
    this.rateLimiter = new RateLimiter({
      windowMs: 60000, // 1分钟
      maxRequests: 100,
      keyGenerator: (req) => req.ip || 'unknown'
    });
    
    this.circuitBreaker = new CircuitBreakerManager();
    this.responseCache = new GatewayCache(this.dbManager);
    this.metrics = new MetricsCollector();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
      credentials: true
    }));
    
    // Body parser
    this.app.use(bodyParser.json({ limit: '10mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
    
    // 请求日志
    this.app.use(this.requestLogger.bind(this));
    
    // 认证中间件
    this.app.use(this.authMiddleware.bind(this));
    
    // 限流中间件
    this.app.use(this.rateLimitMiddleware.bind(this));
    
    // 指标收集中间件
    this.app.use(this.metricsMiddleware.bind(this));
  }

  setupRoutes() {
    // 健康检查
    this.app.get('/health', this.handleHealth.bind(this));
    
    // OpenAI 兼容的聊天接口
    this.app.post('/v1/chat/completions', this.handleChatCompletion.bind(this));
    
    // 模型列表
    this.app.get('/v1/models', this.handleModels.bind(this));
    
    // Provider 信息
    this.app.get('/providers', this.handleGetProviders.bind(this));
    
    // 统计信息
    this.app.get('/stats', this.handleGetStats.bind(this));
    
    // 清空缓存
    this.app.post('/cache/clear', this.handleClearCache.bind(this));
    
    // 系统状态
    this.app.get('/system/status', this.handleSystemStatus.bind(this));
    
    // 404 处理
    this.app.use(this.notFoundHandler.bind(this));
  }

  setupErrorHandling() {
    // 统一错误处理
    this.app.use(this.errorHandler.bind(this));
  }

  // ============ 中间件 ============

  async authMiddleware(req, res, next) {
    // 跳过公开路径
    if (['/health', '/metrics'].includes(req.path)) {
      return next();
    }

    const authHeader = req.headers.authorization || req.headers['x-api-key'];
    
    if (!authHeader) {
      return res.status(401).json({
        error: {
          code: 'missing_auth',
          message: 'API key is required'
        }
      });
    }

    const apiKey = authHeader.replace('Bearer ', '').replace('X-API-Key ', '');
    
    try {
      const config = await this.dbManager.getApiConfig();
      if (!config || config.api_key !== apiKey) {
        return res.status(401).json({
          error: {
            code: 'invalid_auth',
            message: 'Invalid API key'
          }
        });
      }
      
      // 将用户信息附加到请求对象
      req.user = { apiKey, config };
      next();
    } catch (error) {
      this.logger.error('Auth error:', error);
      res.status(500).json({
        error: {
          code: 'auth_error',
          message: 'Authentication error'
        }
      });
    }
  }

  async rateLimitMiddleware(req, res, next) {
    const key = req.ip || 'unknown';
    const allowed = await this.rateLimiter.allow(key);
    
    if (!allowed) {
      this.logger.warn(`Rate limit exceeded for ${key}`);
      return res.status(429).json({
        error: {
          code: 'rate_limit_exceeded',
          message: 'Too many requests, please try again later'
        },
        headers: {
          'X-RateLimit-Limit': this.rateLimiter.maxRequests,
          'X-RateLimit-Remaining': 0,
          'Retry-After': Math.ceil(this.rateLimiter.windowMs / 1000)
        }
      });
    }
    
    // 添加限流头
    res.setHeader('X-RateLimit-Limit', this.rateLimiter.maxRequests);
    res.setHeader('X-RateLimit-Remaining', await this.rateLimiter.remaining(key));
    
    next();
  }

  requestLogger(req, res, next) {
    const start = Date.now();
    const requestId = this.generateRequestId();
    
    // 添加请求 ID
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);
    
    // 记录请求
    this.logger.info(`[${requestId}] ${req.method} ${req.path}`);
    
    // 记录响应
    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.info(`[${requestId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      
      // 记录指标
      this.metrics.record('http.requests', 1, {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration
      });
    });
    
    next();
  }

  metricsMiddleware(req, res, next) {
    // 记录请求开始
    this.metrics.increment('http.requests.total');
    next();
  }

  // ============ 路由处理器 ============

  async handleHealth(req, res) {
    const dbHealth = await this.dbManager.healthCheck();
    const dbStats = await this.dbManager.getStats();
    
    const healthy = dbHealth.healthy;
    
    res.json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth,
        databaseStats: dbStats
      }
    });
  }

  async handleChatCompletion(req, res) {
    const requestId = req.id;
    const { messages, model = 'ai-comparison', stream = false, temperature = 0.7 } = req.body;
    
    this.logger.info(`[${requestId}] Chat completion request - model: ${model}, stream: ${stream}`);
    
    // 验证请求
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          code: 'invalid_request',
          message: 'Messages array is required and cannot be empty'
        }
      });
    }
    
    const lastMessage = messages[messages.length - 1];
    const question = lastMessage.content || lastMessage;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: {
          code: 'invalid_request',
          message: 'Message content must be a non-empty string'
        }
      });
    }
    
    try {
      // 初始化 QuestionProcessor（如果还没有）
      if (!this.questionProcessor) {
        this.logger.info(`[${requestId}] Initializing QuestionProcessor...`);
        this.questionProcessor = new QuestionProcessor();
        await this.questionProcessor.init();
      }
      
      // 检查熔断器
      const circuitKey = `model:${model}`;
      if (this.circuitBreaker.isOpen(circuitKey)) {
        return res.status(503).json({
          error: {
            code: 'circuit_open',
            message: 'Service temporarily unavailable'
          }
        });
      }
      
      const startTime = Date.now();
      
      if (stream) {
        // 流式响应
        await this.handleStreamingResponse(req, res, question, model, requestId);
      } else {
        // 非流式响应
        const result = await this.questionProcessor.processQuestion(question, {
          useCache: true,
          cacheResults: true
        });
        
        const duration = Date.now() - startTime;
        
        // 记录成功
        this.circuitBreaker.recordSuccess(circuitKey);
        
        // 构建 OpenAI 兼容响应
        const response = this.buildOpenAICompatibleResponse(result, model);
        
        res.json(response);
        
        this.logger.info(`[${requestId}] Completed in ${duration}ms`);
      }
      
    } catch (error) {
      this.logger.error(`[${requestId}] Error:`, error);
      
      // 记录熔断器失败
      this.circuitBreaker.recordFailure(`model:${model}`);
      
      res.status(500).json({
        error: {
          code: 'server_error',
          message: error.message,
          requestId
        }
      });
    }
  }

  async handleStreamingResponse(req, res, question, model, requestId) {
    this.logger.info(`[${requestId}] Starting streaming response`);
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    
    try {
      // TODO: 实现真实的流式处理
      // 当前使用模拟方式
      
      // 发送初始数据
      const initChunk = {
        id: `chatcmpl-${requestId}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          delta: { role: 'assistant' },
          finish_reason: null
        }]
      };
      res.write(`data: ${JSON.stringify(initChunk)}\n\n`);
      
      // 获取回答（非流式，然后模拟流式输出）
      const result = await this.questionProcessor.processQuestion(question, {
        useCache: false
      });
      
      const answer = this.aggregateAnswers(result.answers);
      
      // 模拟流式输出
      const words = answer.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = {
          id: `chatcmpl-${requestId}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{
            index: 0,
            delta: {
              content: (i === 0 ? '' : ' ') + words[i]
            },
            finish_reason: null
          }]
        };
        
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      // 结束标记
      const finalChunk = {
        id: `chatcmpl-${requestId}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop'
        }]
      };
      
      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      
    } catch (error) {
      this.logger.error(`[${requestId}] Streaming error:`, error);
      res.write(`data: ${JSON.stringify({
        error: {
          code: 'stream_error',
          message: error.message
        }
      })}\n\n`);
      res.end();
    }
  }

  async handleModels(req, res) {
    try {
      // 获取所有 Provider 信息
      const providers = providerRegistry.getAllProviderInfo();
      
      // 添加组合模型
      const models = [
        {
          id: 'ai-comparison',
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'ChatKey',
          description: 'AI Comparison - 聚合所有启用的AI模型的回答',
          capabilities: ['comparison', 'aggregation']
        },
        ...providers.map(p => ({
          id: p.type,
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: p.name,
          description: `${p.name} - ${p.type}`,
          capabilities: Object.entries(p.capabilities)
            .filter(([_, v]) => v)
            .map(([k]) => k)
        }))
      ];
      
      res.json({
        object: 'list',
        data: models
      });
      
    } catch (error) {
      this.logger.error('Models error:', error);
      res.status(500).json({
        error: {
          code: 'server_error',
          message: 'Failed to fetch models'
        }
      });
    }
  }

  async handleGetProviders(req, res) {
    try {
      const providers = providerRegistry.getAllProviderInfo();
      const sites = await this.dbManager.getAiSites();
      
      res.json({
        providers,
        sites,
        registry: providerRegistry.getRegisteredTypes()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async handleGetStats(req, res) {
    try {
      const stats = await this.questionProcessor?.getStatsSummary() || {};
      const metrics = await this.metrics.getTopMetrics(10);
      
      res.json({
        stats,
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async handleClearCache(req, res) {
    try {
      await this.questionProcessor?.clearCache();
      res.json({ success: true, message: 'Cache cleared' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async handleSystemStatus(req, res) {
    try {
      const status = await this.questionProcessor?.getHealthStatus() || {};
      const cacheStats = await this.responseCache.getStats();
      
      res.json({
        ...status,
        cache: cacheStats,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  notFoundHandler(req, res) {
    res.status(404).json({
      error: {
        code: 'not_found',
        message: `Route ${req.method} ${req.path} not found`,
        path: req.path,
        method: req.method
      }
    });
  }

  errorHandler(err, req, res, next) {
    this.logger.error(`[${req.id}] Unhandled error:`, err);
    
    const statusCode = err.status || 500;
    const code = err.code || 'internal_error';
    
    res.status(statusCode).json({
      error: {
        code,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    });
  }

  // ============ 辅助方法 ============

  buildOpenAICompatibleResponse(result, model) {
    const answer = this.aggregateAnswers(result.answers);
    
    return {
      id: `chatcmpl-${result.requestId || Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: answer
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: result.question?.length || 0,
        completion_tokens: answer.length,
        total_tokens: (result.question?.length || 0) + answer.length
      },
      ...(result.duration && { duration: result.duration })
    };
  }

  aggregateAnswers(answers) {
    if (!answers || answers.length === 0) {
      return '抱歉，暂时无法获取任何AI的回答。';
    }
    
    const successful = answers.filter(a => a.status === 'success');
    if (successful.length === 0) {
      return '所有AI平台都返回了错误，请稍后重试。';
    }
    
    if (successful.length === 1) {
      const a = successful[0];
      return a.adaptedAnswer?.formattedText || a.answer;
    }
    
    // 多个回答，合并展示
    let combined = '## AI 回答对比\n\n';
    
    successful.forEach((answer, idx) => {
      const siteName = answer.site;
      const content = answer.adaptedAnswer?.formattedText || answer.answer;
      const summary = answer.adaptedAnswer?.summary;
      
      combined += `### ${idx + 1}. ${siteName}\n\n`;
      if (summary) {
        combined += `**摘要**: ${summary}\n\n`;
      }
      combined += `${content}\n\n---\n\n`;
    });
    
    return combined;
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============ 启动和停止 ============

   async start(port = 8080) {
     // 避免重复启动
     if (this.server) {
       const address = this.server.address();
       const currentPort = address ? address.port : port;
       console.log(`API Gateway already running on port ${currentPort}`);
       return currentPort;
     }
     
     try {
       // 初始化数据库
       await this.dbManager.init();
       this.logger.info('Database initialized');
       
       return new Promise((resolve, reject) => {
         this.server = this.app.listen(port, async (err) => {
           if (err) {
             this.server = null;
             reject(err);
             return;
           }
           
           console.log(`🚀 API Gateway 启动在端口 ${port}`);
           console.log(`📋 OpenAPI 兼容端点: http://localhost:${port}/v1`);
           console.log(`🔍 健康检查: http://localhost:${port}/health`);
           console.log(`📊 统计: http://localhost:${port}/stats`);
           
           // 记录启动指标
           await this.metrics.record('server.start', 1, { port });
           
           resolve(port);
         });
       });
     } catch (error) {
       this.logger.error('Failed to initialize API Gateway:', error);
       throw error;
     }
   }

  async stop() {
    if (this.server) {
      await new Promise(resolve => this.server.close(resolve));
      console.log('API Gateway 已停止');
    }
    
    if (this.questionProcessor) {
      await this.questionProcessor.close();
    }
  }
}

// ============ 辅助类 ============

/**
 * 令牌桶限流器
 */
class RateLimiter {
  constructor({ windowMs = 60000, maxRequests = 100, keyGenerator = (req) => req.ip } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.keyGenerator = keyGenerator;
    this.requests = new Map(); // key -> [{ timestamp }]
  }

  async allow(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key).filter(t => t > windowStart);
    
    if (requests.length >= this.maxRequests) {
      return false;
    }
    
    requests.push(now);
    this.requests.set(key, requests);
    return true;
  }

  async remaining(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requests = this.requests.get(key)?.filter(t => t > windowStart) || [];
    return Math.max(0, this.maxRequests - requests.length);
  }
}

/**
 * 熔断器管理器
 */
class CircuitBreakerManager {
  constructor() {
    this.circuits = new Map();
  }

  isOpen(key) {
    const circuit = this.circuits.get(key);
    return circuit && circuit.state === 'open';
  }

  recordSuccess(key) {
    const circuit = this.circuits.get(key) || this.createCircuit(key);
    circuit.state = 'closed';
    circuit.failures = 0;
    circuit.lastSuccess = Date.now();
    this.circuits.set(key, circuit);
  }

  recordFailure(key) {
    const circuit = this.circuits.get(key) || this.createCircuit(key);
    circuit.failures++;
    circuit.lastFailure = Date.now();
    
    if (circuit.failures >= 5 && circuit.state !== 'open') {
      circuit.state = 'open';
      circuit.openedAt = Date.now();
      console.warn(`Circuit ${key} opened`);
    }
    
    this.circuits.set(key, circuit);
  }

  createCircuit(key) {
    return {
      key,
      state: 'closed',
      failures: 0,
      lastSuccess: null,
      lastFailure: null,
      openedAt: null
    };
  }
}

/**
 * 网关缓存
 */
class GatewayCache {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.memoryCache = new Map();
  }

  async get(key) {
    // 内存缓存优先
    const mem = this.memoryCache.get(key);
    if (mem && mem.expires > Date.now()) {
      return mem.value;
    }
    
    // 数据库缓存
    try {
      const rows = await this.dbManager.all(
        'SELECT response_data, expires_at FROM response_cache WHERE question_hash = ?',
        [key]
      );
      
      if (rows.length > 0 && new Date(rows[0].expires_at) > new Date()) {
        const value = JSON.parse(rows[0].response_data);
        this.memoryCache.set(key, { value, expires: new Date(rows[0].expires_at).getTime() });
        return value;
      }
    } catch (error) {
      // ignore
    }
    
    return null;
  }

  async set(key, value, ttl = 3600000) {
    const expiresAt = new Date(Date.now() + ttl);
    this.memoryCache.set(key, { value, expires: expiresAt.getTime() });
    
    try {
      await this.dbManager.run(`
        INSERT INTO response_cache (question_hash, response_data, expires_at)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE response_data = ?, expires_at = ?
      `, [key, JSON.stringify(value), expiresAt.toISOString(), JSON.stringify(value), expiresAt.toISOString()]);
    } catch (error) {
      console.warn('Cache set failed:', error.message);
    }
  }

  async clear() {
    this.memoryCache.clear();
    try {
      await this.dbManager.run('DELETE FROM response_cache');
    } catch (error) {
      // ignore
    }
  }

  async getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      ttl: 300000
    };
  }
}

/**
 * 指标收集器
 */
class MetricsCollector {
  constructor() {
    this.metrics = new Map();
  }

  record(name, value, tags = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { count: 0, sum: 0, min: Infinity, max: -Infinity });
    }
    
    const m = this.metrics.get(name);
    m.count++;
    m.sum += value;
    m.min = Math.min(m.min, value);
    m.max = Math.max(m.max, value);
  }

  increment(name, tags) {
    this.record(name, 1, tags);
  }

  getTopMetrics(limit = 10) {
    return Array.from(this.metrics.entries())
      .slice(0, limit)
      .map(([name, data]) => ({
        name,
        ...data,
        avg: data.sum / data.count
      }));
  }
}

// 导出
module.exports = { ApiGateway };