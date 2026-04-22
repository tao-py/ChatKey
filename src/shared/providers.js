/**
 * Provider 接口规范与注册中心
 * 基于 openclaw-zero-token 的 provider 设计模式
 * 提供可插拔的 AI 平台适配器架构
 */

// ============ 类型定义 ============

/**
 * Provider 配置接口
 */
class ProviderConfig {
  constructor({
    id,
    name,
    baseUrl,
    providerType = 'generic',
    authType = 'cookie',
    selectors = {},
    timeout = 30000,
    retry = 3,
    waitTime = 2000,
    ...rest
  } = {}) {
    this.id = id;
    this.name = name;
    this.baseUrl = baseUrl;
    this.providerType = providerType;
    this.authType = authType;
    this.selectors = {
      // 默认选择器
      input: 'textarea, input[type="text"]',
      submit: 'button[type="submit"], button',
      answer: '.message-content, [data-testid*="content"]',
      ...selectors
    };
    this.timeout = timeout;
    this.retry = retry;
    this.waitTime = waitTime;
    this.metadata = rest;
  }
}

/**
 * Provider 能力接口
 */
class ProviderCapability {
  constructor({
    streaming = false,
    tools = false,
    vision = false,
    code = false,
    reasoning = false,
    maxTokens = 4096,
    contextWindow = 8192
  } = {}) {
    this.streaming = streaming;
    this.tools = tools;
    this.vision = vision;
    this.code = code;
    this.reasoning = reasoning;
    this.maxTokens = maxTokens;
    this.contextWindow = contextWindow;
  }
}

/**
 * Provider 状态枚举
 */
const ProviderStatus = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error',
  DISABLED: 'disabled',
  AUTH_REQUIRED: 'auth_required'
};

/**
 * Provider 结果接口
 */
class ProviderResult {
  constructor({
    content,
    tokensUsed = 0,
    model = null,
    finishReason = 'stop',
    metadata = {}
  }) {
    this.content = content;
    this.tokensUsed = tokensUsed;
    this.model = model;
    this.finishReason = finishReason;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

// ============ Provider 抽象基类 ============

/**
 * 抽象 Provider 类 - 所有 AI 平台 Provider 的基类
 * 定义了统一的接口规范
 */
class BaseProvider {
  constructor(config) {
    this.config = config instanceof ProviderConfig ? config : new ProviderConfig(config);
    this.status = ProviderStatus.INITIALIZING;
    this.capabilities = new ProviderCapability();
    this.credentials = null;
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      totalLatency: 0,
      avgLatency: 0
    };
  }

  /**
   * 必须实现的抽象方法
   */
  
  // 初始化 Provider
  async initialize() {
    throw new Error('initialize() must be implemented');
  }

  // 认证
  async authenticate(page) {
    throw new Error('authenticate() must be implemented');
  }

  // 发送问题
  async sendQuestion(page, question) {
    throw new Error('sendQuestion() must be implemented');
  }

  // 提取答案
  async extractAnswer(page) {
    throw new Error('extractAnswer() must be implemented');
  }

  // 检查登录状态
  async checkLoginStatus(page) {
    throw new Error('checkLoginStatus() must be implemented');
  }

  // 流式响应（可选）
  async streamQuestion(page, question, onChunk) {
    // 默认实现：非流式，可以被子类覆盖
    const answer = await this.sendQuestion(page, question);
    onChunk(answer);
  }

  /**
   * 可选覆盖的方法
   */
  
  // 准备页面（在导航后调用）
  async preparePage(page) {
    // 默认：等待页面加载
    await page.waitForTimeout(this.config.waitTime);
  }

  // 处理欢迎页面
  async handleWelcome(page) {
    // 默认：无操作
  }

  // 验证响应
  async validateResponse(page) {
    // 默认：检查选择器是否存在
    const element = await page.$(this.config.selectors.answer);
    if (!element) {
      throw new Error('Answer element not found');
    }
  }

  // 清理资源
  async cleanup() {
    // 默认：无操作
  }

  /**
   * 工具方法
   */

  // 等待选择器
  async waitForSelector(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      return false;
    }
  }

  // 点击元素
  async clickElement(page, selector) {
    const element = await page.$(selector);
    if (element) {
      await element.click();
      await page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  // 输入文本
  async inputText(page, selector, text) {
    const element = await page.$(selector);
    if (element) {
      await element.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type(selector, text, { delay: 50 });
      return true;
    }
    return false;
  }

  // 更新统计
  updateStats(success, latency) {
    this.stats.requests++;
    if (success) {
      this.stats.successes++;
    } else {
      this.stats.failures++;
    }
    this.stats.totalLatency += latency;
    this.stats.avgLatency = this.stats.totalLatency / this.stats.requests;
  }

  // 获取统计信息
  getStats() {
    return { ...this.stats };
  }

  // 获取状态
  getStatus() {
    return this.status;
  }

  // 设置状态
  setStatus(status) {
    this.status = status;
  }

  /**
   * 序列化
   */
  toJSON() {
    return {
      id: this.config.id,
      name: this.config.name,
      type: this.config.providerType,
      status: this.status,
      capabilities: this.capabilities,
      stats: this.stats,
      config: {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        waitTime: this.config.waitTime
      }
    };
  }
}

// ============ 具体 Provider 实现 ============

/**
 * DeepSeek Web Provider
 */
class DeepSeekProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      providerType: 'deepseek-web',
      selectors: {
        input: 'textarea[placeholder*="输入"]',
        submit: 'button[type="submit"], button[class*="send"]',
        answer: '[data-testid="conversation-turn-content"], .markdown-body',
        ...config.selectors
      }
    });
    this.capabilities = new ProviderCapability({
      streaming: true,
      code: true,
      reasoning: true,
      maxTokens: 4096,
      contextWindow: 64000
    });
  }

  async initialize() {
    this.setStatus(ProviderStatus.READY);
  }

  async authenticate(page) {
    // DeepSeek 认证逻辑
    console.log(`[${this.config.name}] Authenticating...`);
    
    // 检查是否需要登录
    const loginSelectors = [
      'a[href*="login"]',
      'button[class*="login"]',
      '.login-tab',
      'button:has-text("登录")'
    ];
    
    for (const selector of loginSelectors) {
      const element = await page.$(selector);
      if (element && await element.isVisible()) {
        console.log(`[${this.config.name}] Login required`);
        this.setStatus(ProviderStatus.AUTH_REQUIRED);
        return false;
      }
    }
    
    this.setStatus(ProviderStatus.READY);
    return true;
  }

  async sendQuestion(page, question) {
    await this.preparePage(page);
    
    // 输入问题
    const inputSuccess = await this.inputText(page, this.config.selectors.input, question);
    if (!inputSuccess) {
      throw new Error(`Failed to input question for ${this.config.name}`);
    }
    
    // 提交
    const submitSuccess = await this.clickElement(page, this.config.selectors.submit);
    if (!submitSuccess) {
      throw new Error(`Failed to submit question for ${this.config.name}`);
    }
    
    // 等待回答
    await this.waitForAnswer(page);
    
    // 提取答案
    return await this.extractAnswer(page);
  }

  async waitForAnswer(page) {
    // DeepSeek 特定的等待逻辑
    const loadingSelectors = [
      '.loading', '.spinner', '[data-testid="thinking"]', 
      '.animate-pulse', 'button[disabled]'
    ];
    
    // 等待加载完成
    for (const selector of loadingSelectors) {
      await page.waitForFunction(
        (sel) => !document.querySelector(sel),
        { timeout: 60000 },
        selector
      ).catch(() => {});
    }
    
    // 等待答案出现
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && el.textContent && el.textContent.trim().length > 50;
      },
      { timeout: 60000 },
      this.config.selectors.answer
    );
  }

  async extractAnswer(page) {
    const answer = await page.$eval(this.config.selectors.answer, element => {
      // 清理文本内容
      let text = element.textContent || '';
      text = text.replace(/\s+/g, ' ').trim();
      return text;
    });
    
    if (!answer || answer.length < 10) {
      throw new Error('Answer too short or empty');
    }
    
    return answer;
  }
}

/**
 * 通义千问 Provider
 */
class TongyiProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      providerType: 'qwen-web',
      selectors: {
        input: 'textarea[placeholder*="输入"], textarea[id="input"]',
        submit: 'button[type="submit"], button[class*="send"]',
        answer: '.message-content, .chat-message-content, .output-content',
        ...config.selectors
      }
    });
    this.capabilities = new ProviderCapability({
      streaming: true,
      code: true,
      maxTokens: 4096,
      contextWindow: 32000
    });
  }

  async initialize() {
    this.setStatus(ProviderStatus.READY);
  }

  async sendQuestion(page, question) {
    await this.preparePage(page);
    
    // 关闭可能的弹窗
    await this.closeModals(page);
    
    // 输入并提交
    await this.inputText(page, this.config.selectors.input, question);
    await this.clickElement(page, this.config.selectors.submit);
    
    // 等待回答
    await page.waitForTimeout(3000);
    
    // 通义千问可能需要等待思考
    await page.waitForFunction(
      () => {
        const loading = document.querySelector('.loading, .spinner');
        return !loading || loading.offsetParent === null;
      },
      { timeout: 60000 }
    ).catch(() => {});
    
    return await this.extractAnswer(page);
  }

  async extractAnswer(page) {
    // 尝试多个选择器
    const selectors = [
      this.config.selectors.answer,
      '.response-content',
      '.chat-content',
      '[data-message-id]'
    ];
    
    for (const selector of selectors) {
      try {
        const content = await page.$eval(selector, el => el.textContent.trim());
        if (content && content.length > 10) {
          return content;
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('Could not extract answer from Tongyi page');
  }

  async closeModals(page) {
    const closeSelectors = [
      '.ant-modal-close',
      '.close-btn',
      'button[aria-label="close"]',
      '.modal-close'
    ];
    
    for (const selector of closeSelectors) {
      const btn = await page.$(selector);
      if (btn && await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    }
  }
}

/**
 * 豆包 Provider
 */
class DoubaoProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      providerType: 'doubao-web',
      selectors: {
        input: 'textarea[placeholder*="输入"]',
        submit: 'button[type="submit"]',
        answer: '.message-content, .assistant-message',
        ...config.selectors
      }
    });
    this.capabilities = new ProviderCapability({
      streaming: false,
      code: false,
      maxTokens: 4096,
      contextWindow: 32000
    });
  }

  async sendQuestion(page, question) {
    await this.preparePage(page);
    
    // 豆包可能需要等待页面完全加载
    await page.waitForTimeout(3000);
    
    // 检查登录
    const loginBtn = await page.$('button:has-text("登录")');
    if (loginBtn) {
      throw new Error('Doubao requires login. Please login manually first.');
    }
    
    await this.inputText(page, this.config.selectors.input, question);
    await this.clickElement(page, this.config.selectors.submit);
    
    // 豆包响应通常较慢
    await page.waitForTimeout(5000);
    
    return await this.extractAnswer(page);
  }

  async extractAnswer(page) {
    // 等待消息出现
    await page.waitForFunction(
      () => {
        const messages = document.querySelectorAll('.message-content, .assistant-message');
        return messages.length > 0;
      },
      { timeout: 30000 }
    );
    
    // 获取最新的助手消息
    const messages = await page.$$('.message-content, .assistant-message');
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      return await page.evaluate(el => el.textContent.trim(), lastMessage);
    }
    
    throw new Error('No messages found');
  }
}

/**
 * 文心一言 Provider
 */
class YiyanProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      providerType: 'yiyan-web',
      selectors: {
        input: 'textarea[placeholder*="输入"], textarea[id="editor"]',
        submit: 'button[type="submit"], button[class*="send"]',
        answer: '.message-content, .result-content',
        ...config.selectors
      }
    });
    this.capabilities = new ProviderCapability({
      streaming: false,
      code: true,
      maxTokens: 4096,
      contextWindow: 32000
    });
  }

  async sendQuestion(page, question) {
    await this.preparePage(page);
    
    // 检查是否需要开始对话
    const startBtn = await page.$('button:has-text("开始对话")');
    if (startBtn) {
      await startBtn.click();
      await page.waitForTimeout(2000);
    }
    
    await this.inputText(page, this.config.selectors.input, question);
    await this.clickElement(page, this.config.selectors.submit);
    
    // 等待回答
    await page.waitForTimeout(4000);
    
    return await this.extractAnswer(page);
  }

  async extractAnswer(page) {
    // 文心一言的回答可能有多个部分
    const answerParts = await page.$$('.message-content, .result-content');
    if (answerParts.length === 0) {
      throw new Error('No answer found');
    }
    
    // 合并所有部分
    const parts = [];
    for (const part of answerParts) {
      const text = await page.evaluate(el => el.textContent.trim(), part);
      if (text) parts.push(text);
    }
    
    return parts.join('\n\n');
  }
}

// ============ Provider 注册中心 ============

/**
 * Provider 注册表 - 单例模式
 * 管理所有可用 Provider 的注册和获取
 */
class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.defaultProviders = new Map();
    this.loaded = false;
  }

  /**
   * 注册 Provider 类
   */
  register(providerClass) {
    const tempInstance = new providerClass({ name: 'temp' });
    const type = tempInstance.config.providerType;
    
    this.providers.set(type, providerClass);
    console.log(`[ProviderRegistry] Registered provider: ${type}`);
    
    return this;
  }

  /**
   * 注册默认 Provider
   */
  registerDefault(providerType, providerClass) {
    this.defaultProviders.set(providerType, providerClass);
    return this;
  }

  /**
   * 从配置创建 Provider 实例
   */
  async createProvider(config) {
    const providerType = config.providerType || 'generic';
    
    // 查找 Provider 类
    const ProviderClass = this.providers.get(providerType);
    if (!ProviderClass) {
      console.warn(`[ProviderRegistry] Unknown provider type: ${providerType}, using generic`);
      return this.createGenericProvider(config);
    }
    
    try {
      const instance = new ProviderClass(config);
      await instance.initialize();
      return instance;
    } catch (error) {
      console.error(`[ProviderRegistry] Failed to create provider ${providerType}:`, error);
      throw error;
    }
  }

  /**
   * 创建通用 Provider
   */
  createGenericProvider(config) {
    return new GenericProvider(config);
  }

  /**
   * 获取所有已注册的 Provider 类型
   */
  getRegisteredTypes() {
    return Array.from(this.providers.keys());
  }

  /**
   * 检查是否支持某个 Provider 类型
   */
  isSupported(type) {
    return this.providers.has(type);
  }

  /**
   * 获取 Provider 信息
   */
  getProviderInfo(type) {
    if (!this.providers.has(type)) return null;
    
    const ProviderClass = this.providers.get(type);
    const temp = new ProviderClass({ name: type });
    
    return {
      type,
      name: temp.config.name,
      capabilities: temp.capabilities,
      selectors: temp.config.selectors
    };
  }

  /**
   * 获取所有 Provider 信息
   */
  getAllProviderInfo() {
    const infos = [];
    for (const type of this.providers.keys()) {
      infos.push(this.getProviderInfo(type));
    }
    return infos;
  }

  /**
   * 加载所有默认 Provider
   */
  loadDefaultProviders() {
    // 注册内置 Provider
    this.register(DeepSeekProvider);
    this.register(TongyiProvider);
    this.register(DoubaoProvider);
    this.register(YiyanProvider);
    
    // 可以继续添加更多...
    // this.register(ChatGPTProvider);
    // this.register(ClaudeProvider);
    
    this.loaded = true;
    console.log(`[ProviderRegistry] Loaded ${this.providers.size} providers`);
  }
}

/**
 * 通用 Provider - 用于未专门支持的网站
 */
class GenericProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.capabilities = new ProviderCapability({
      streaming: false,
      code: false,
      maxTokens: 2048,
      contextWindow: 4096
    });
  }

  async initialize() {
    this.setStatus(ProviderStatus.READY);
  }

  async sendQuestion(page, question) {
    await this.preparePage(page);
    
    // 使用通用选择器
    await this.inputText(page, this.config.selectors.input, question);
    await this.clickElement(page, this.config.selectors.submit);
    
    // 等待
    await page.waitForTimeout(this.config.waitTime);
    
    return await this.extractAnswer(page);
  }

  async extractAnswer(page) {
    // 尝试多种通用选择器
    const selectors = [
      this.config.selectors.answer,
      '.message:last-child',
      '[data-message-id]:last-child',
      '.response:last-child',
      'main p:last-of-type'
    ];
    
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await page.evaluate(el => el.textContent.trim(), element);
          if (text && text.length > 10) {
            return text;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('Could not extract answer with generic provider');
  }
}

// ============ 工厂模式 ============

/**
 * Provider 工厂 - 根据配置动态创建 Provider
 */
class ProviderFactory {
  constructor(registry) {
    this.registry = registry;
  }

  async create(config) {
    if (!config || !config.providerType) {
      throw new Error('Provider config must include providerType');
    }
    
    return await this.registry.createProvider(config);
  }

  // 从数据库记录创建
  async createFromDatabase(siteRecord) {
    const config = new ProviderConfig({
      id: siteRecord.id,
      name: siteRecord.name,
      baseUrl: siteRecord.url,
      providerType: siteRecord.provider_type || 'generic',
      selectors: {
        input: siteRecord.input_selector,
        submit: siteRecord.submit_selector,
        answer: siteRecord.selector
      },
      ...(siteRecord.config ? JSON.parse(siteRecord.config) : {})
    });
    
    return await this.create(config);
  }
}

// ============ 单例导出 ============

// Provider 注册表单例
const providerRegistry = new ProviderRegistry();
providerRegistry.loadDefaultProviders();

// Provider 工厂单例
const providerFactory = new ProviderFactory(providerRegistry);

// 导出的模块
module.exports = {
  // 类和接口
  BaseProvider,
  ProviderConfig,
  ProviderCapability,
  ProviderResult,
  ProviderStatus,
  
  // 具体实现
  DeepSeekProvider,
  TongyiProvider,
  DoubaoProvider,
  YiyanProvider,
  GenericProvider,
  
  // 注册和工厂
  ProviderRegistry,
  ProviderFactory,
  
  // 单例
  providerRegistry,
  providerFactory
};