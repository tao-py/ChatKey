/**
 * ChatKey 扩展 Provider 实现
 * 基于 openclaw-zero-token 项目的设计模式
 * 包含: ChatGPT, Claude, Gemini, Grok, Perplexity, Kimi
 */

const { BaseProvider, ProviderConfig, ProviderCapability, ProviderStatus } = require('./providers');

// ============ ChatGPT Web Provider ============

class ChatGPTProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      providerType: 'chatgpt-web',
      selectors: {
        input: '#prompt-textarea, textarea[placeholder], textarea, [contenteditable="true"]',
        submit: '', // 使用Enter键
        answer: 'div[data-message-author-role="assistant"], [class*="markdown"], article',
        ...config.selectors
      }
    });
    this.capabilities = new ProviderCapability({
      streaming: true,
      code: true,
      reasoning: false,
      maxTokens: 128000,
      contextWindow: 128000
    });
  }

  async initialize() {
    this.setStatus(ProviderStatus.READY);
  }

  async authenticate(page) {
    console.log(`[${this.config.name}] Authenticating...`);
    
    // 检查登录状态 - ChatGPT登录按钮
    const loginSelectors = [
      'a[href*="login"]',
      'button:has-text("Sign in")',
      'button:has-text("Log in")'
    ];
    
    for (const selector of loginSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          console.log(`[${this.config.name}] Login required`);
          this.setStatus(ProviderStatus.AUTH_REQUIRED);
          return false;
        }
      } catch (err) {}
    }
    
    this.setStatus(ProviderStatus.READY);
    return true;
  }

  async sendQuestion(page, question) {
    await this.preparePage(page);
    
    // ChatGPT使用Enter键提交
    const inputSelector = this.config.selectors.input.split(',')[0].trim();
    
    // 点击输入框
    const inputEl = await page.$(inputSelector);
    if (!inputEl) throw new Error(`Cannot find input element for ${this.config.name}`);
    
    await inputEl.click();
    await page.waitForTimeout(500);
    
    // 清空并输入
    await inputEl.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.keyboard.type(question, { delay: 20 });
    
    // 按Enter提交
    await page.keyboard.press('Enter');
    
    // 等待回答
    await this.waitForAnswer(page);
    
    return await this.extractAnswer(page);
  }

  async waitForAnswer(page) {
    // 等待流式完成 - 检查Stop按钮消失
    await page.waitForFunction(
      () => {
        const stopBtn = document.querySelector('[aria-label*="Stop"]') || 
                       document.querySelector('button.bg-black .icon-lg');
        return !stopBtn;
      },
      { timeout: 90000 }
    ).catch(() => {});
    
    // 额外等待确保稳定
    await page.waitForTimeout(2000);
  }

  async extractAnswer(page) {
    // 尝试多个选择器获取最后一条助手消息
    const selectors = [
      'div[data-message-author-role="assistant"]',
      '[class*="markdown"]',
      'article'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          const last = elements[elements.length - 1];
          const text = await page.evaluate(el => el.textContent.trim(), last);
          if (text && text.length > 20) {
            return text;
          }
        }
      } catch (err) {}
    }
    
    throw new Error('Could not extract answer from ChatGPT page');
  }
}

// ============ Claude Web Provider ============

class ClaudeProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      providerType: 'claude-web',
      selectors: {
        input: '[contenteditable="true"]',
        submit: '',
        answer: '[class*="message"] [class*="content"], article',
        ...config.selectors
      }
    });
    this.capabilities = new ProviderCapability({
      streaming: true,
      code: true,
      reasoning: true,
      maxTokens: 200000,
      contextWindow: 200000
    });
  }

  async initialize() {
    this.setStatus(ProviderStatus.READY);
  }

  async authenticate(page) {
    console.log(`[${this.config.name}] Authenticating...`);
    
    const loginSelectors = [
      'a[href*="login"]',
      'button:has-text("Sign in")',
      'button:has-text("Sign up")'
    ];
    
    for (const selector of loginSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          console.log(`[${this.config.name}] Login required`);
          this.setStatus(ProviderStatus.AUTH_REQUIRED);
          return false;
        }
      } catch (err) {}
    }
    
    this.setStatus(ProviderStatus.READY);
    return true;
  }

  async sendQuestion(page, question) {
    await this.preparePage(page);
    
    // Claude通过API发送（在页面上下文中执行）
    const result = await page.evaluate(async (msg) => {
      // 尝试获取organization
      let orgId = '';
      try {
        const orgRes = await fetch('/api/organizations');
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          orgId = orgData?.id || orgData?.[0]?.id || '';
        }
      } catch (e) {}
      
      // 创建对话
      const createRes = await fetch(`/api/chat_conversations?${orgId ? `organization_id=${orgId}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!createRes.ok) throw new Error('Failed to create conversation');
      
      const convData = await createRes.json();
      const chatId = convData.uuid;
      
      // 发送消息
      const chatRes = await fetch(`/api/chat_conversations/${chatId}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: msg,
          streaming: true,
          model: 'claude-3-5-sonnet'
        })
      });
      
      if (!chatRes.ok) throw new Error('Failed to send message');
      
      // 读取流式响应
      const reader = chatRes.body.getReader();
      let text = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content_block_delta') {
                text += data.delta?.text || '';
              }
            } catch (e) {}
          }
        }
      }
      
      return text;
    }, question);
    
    return result;
  }

  async extractAnswer(page) {
    // Claude通过API直接返回，不需要DOM提取
    return ''; // 已在sendQuestion中返回
  }
}

// ============ Gemini Web Provider ============

class GeminiProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      providerType: 'gemini-web',
      selectors: {
        input: 'textarea[placeholder*="Gemini"], textarea[placeholder*="问问"], textarea[aria-label*="prompt"], textarea, [contenteditable="true"], div[role="textbox"]',
        submit: '', // Enter键
        answer: 'model-response message-content, [data-message-author="model"] [class*="markdown"], article',
        ...config.selectors
      }
    });
    this.capabilities = new ProviderCapability({
      streaming: true,
      code: true,
      maxTokens: 1000000,
      contextWindow: 1000000
    });
  }

  async initialize() {
    this.setStatus(ProviderStatus.READY);
  }

  async authenticate(page) {
    console.log(`[${this.config.name}] Authenticating...`);
    
    const loginSelectors = [
      'a[href*="signin"]',
      'button:has-text("Sign in")'
    ];
    
    for (const selector of loginSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          console.log(`[${this.config.name}] Login required`);
          this.setStatus(ProviderStatus.AUTH_REQUIRED);
          return false;
        }
      } catch (err) {}
    }
    
    this.setStatus(ProviderStatus.READY);
    return true;
  }

  async sendQuestion(page, question) {
    await this.preparePage(page);
    
    // 输入问题
    const inputSelector = this.config.selectors.input.split(',')[0].trim();
    const inputEl = await page.$(inputSelector);
    if (!inputEl) throw new Error(`Cannot find input for ${this.config.name}`);
    
    await inputEl.click();
    await page.waitForTimeout(300);
    await page.keyboard.type(question, { delay: 30 });
    await page.keyboard.press('Enter');
    
    // 等待回答
    await this.waitForAnswer(page);
    
    return await this.extractAnswer(page);
  }

  async waitForAnswer(page) {
    // 等待流式完成
    await page.waitForFunction(
      () => {
        const stopBtn = document.querySelector('[aria-label*="Stop"]');
        return !stopBtn;
      },
      { timeout: 120000 }
    ).catch(() => {});
    
    await page.waitForTimeout(2000);
  }

  async extractAnswer(page) {
    const selectors = [
      'model-response message-content',
      '[data-message-author="model"]',
      '[class*="model-response"]',
      'article'
    ];
    
    for (const selector of selectors) {
      try {
        const els = await page.$$(selector);
        if (els.length > 0) {
          const text = await page.evaluate(el => 
            (el.textContent || '').replace(/(复制|分享|修改|朗读|Ask Gemini|问问 Gemini).*$/g, '').trim(),
            els[els.length - 1]
          );
          if (text && text.length > 40) return text;
        }
      } catch (err) {}
    }
    
    throw new Error('Could not extract answer from Gemini');
  }
}

// ============ Grok Web Provider ============

class GrokProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      providerType: 'grok-web',
      selectors: {
        input: '[contenteditable="true"], textarea[placeholder], textarea, div[role="textbox"]',
        submit: '',
        answer: '[data-role="assistant"], [class*="assistant"], [class*="response"], article, [class*="markdown"]',
        ...config.selectors
      }
    });
    this.capabilities = new ProviderCapability({
      streaming: true,
      code: true,
      maxTokens: 128000,
      contextWindow: 128000
    });
  }

  async initialize() {
    this.setStatus(ProviderStatus.READY);
  }

  async authenticate(page) {
    console.log(`[${this.config.name}] Authenticating...`);
    
    // 检测cookie或登录按钮
    const cookies = await page.context().cookies();
    const hasAuth = cookies.some(c => c.name.includes('sso') || c.name.includes('_ga'));
    
    if (hasAuth) {
      this.setStatus(ProviderStatus.READY);
      return true;
    }
    
    const loginBtn = await page.$('a[href*="login"], button:has-text("Sign in")');
    if (loginBtn) {
      this.setStatus(ProviderStatus.AUTH_REQUIRED);
      return false;
    }
    
    this.setStatus(ProviderStatus.READY);
    return true;
  }

  async sendQuestion(page, question) {
    await this.preparePage(page);
    
    // 尝试API方式
    try {
      return await this.sendViaAPI(page, question);
    } catch (err) {
      console.log(`[${this.config.name}] API failed, falling back to DOM`);
      return await this.sendViaDOM(page, question);
    }
  }

  async sendViaAPI(page, question) {
    // 通过page.evaluate调用Grok API
    const answer = await page.evaluate(async (msg) => {
      const response = await fetch('/rest/app-chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) throw new Error('Failed to create conversation');
      
      const data = await response.json();
      const convId = data.uuid || data.id;
      
      // 发送消息
      const chatRes = await fetch(`/rest/app-chat/conversations/${convId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          sender: 'user'
        })
      });
      
      if (!chatRes.ok) throw new Error('Failed to send message');
      
      const chatData = await chatRes.json();
      return chatData.response?.text || chatData.text || JSON.stringify(chatData);
    }, question);
    
    return answer;
  }

  async sendViaDOM(page, question) {
    // DOM模拟方式
    const inputSelector = this.config.selectors.input.split(',')[0].trim();
    const inputEl = await page.$(inputSelector);
    if (!inputEl) throw new Error('Cannot find input');
    
    await inputEl.click();
    await page.keyboard.type(question, { delay: 20 });
    await page.keyboard.press('Enter');
    
    await this.waitForAnswer(page);
    return await this.extractAnswer(page);
  }

  async waitForAnswer(page) {
    await page.waitForFunction(
      () => !document.querySelector('[aria-label*="Stop"]'),
      { timeout: 90000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
  }

  async extractAnswer(page) {
    const selectors = [
      '[data-role="assistant"]',
      '[class*="assistant"]',
      'article'
    ];
    
    for (const selector of selectors) {
      try {
        const els = await page.$$(selector);
        if (els.length > 0) {
          const text = await page.evaluate(el => el.textContent.trim(), els[els.length - 1]);
          if (text && text.length > 10) return text;
        }
      } catch (err) {}
    }
    
    throw new Error('No answer found');
  }
}

// ============ Perplexity Provider ============

class PerplexityProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      providerType: 'perplexity-web',
      selectors: {
        input: 'div[contenteditable="true"], [role="textbox"], textarea',
        submit: '',
        answer: '[class*="prose"], [class*="break-words"], article',
        ...config.selectors
      }
    });
    this.capabilities = new ProviderCapability({
      streaming: true,
      code: true,
      maxTokens: 8000,
      contextWindow: 8000
    });
  }

  async initialize() {
    this.setStatus(ProviderStatus.READY);
  }

  async authenticate(page) {
    console.log(`[${this.config.name}] Authenticating...`);
    
    // 检查是否有登录按钮
    const loginBtn = await page.$('button:has-text("Sign in"), a[href*="login"]');
    if (loginBtn) {
      this.setStatus(ProviderStatus.AUTH_REQUIRED);
      return false;
    }
    
    this.setStatus(ProviderStatus.READY);
    return true;
  }

  async sendQuestion(page, question) {
    await this.preparePage(page);
    
    // 使用DOM交互
    const inputSelector = this.config.selectors.input.split(',')[0].trim();
    const inputEl = await page.$(inputSelector);
    if (!inputEl) throw new Error('Cannot find input');
    
    await inputEl.click();
    await page.keyboard.type(question, { delay: 20 });
    await page.keyboard.press('Enter');
    
    // 等待URL变化或新内容
    await page.waitForFunction(
      () => window.location.pathname.includes('/search/') || 
            window.location.pathname.includes('/c/'),
      { timeout: 30000 }
    ).catch(() => {});
    
    await this.waitForAnswer(page);
    return await this.extractAnswer(page);
  }

  async waitForAnswer(page) {
    await page.waitForFunction(
      () => {
        const stopBtn = document.querySelector('[aria-label*="Stop"]');
        return !stopBtn;
      },
      { timeout: 120000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);
  }

  async extractAnswer(page) {
    const selectors = [
      '[class*="prose"]',
      'article'
    ];
    
    for (const selector of selectors) {
      try {
        const els = await page.$$(selector);
        if (els.length > 0) {
          const text = await page.evaluate(el => el.textContent.trim(), els[els.length - 1]);
          if (text && text.length > 20) return text;
        }
      } catch (err) {}
    }
    
    throw new Error('No answer found');
  }
}

// ============ Kimi Web Provider ============

class KimiProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      providerType: 'kimi-web',
      selectors: {
        input: 'textarea[placeholder*="输入"], textarea, [contenteditable="true"]',
        submit: '', // API提交
        answer: '[class*="message"] [class*="content"], article',
        ...config.selectors
      }
    });
    this.capabilities = new ProviderCapability({
      streaming: true,
      code: true,
      maxTokens: 200000,
      contextWindow: 200000
    });
  }

  async initialize() {
    this.setStatus(ProviderStatus.READY);
  }

  async authenticate(page) {
    console.log(`[${this.config.name}] Authenticating...`);
    
    // 检查cookie
    const cookies = await page.context().cookies();
    const hasAuth = cookies.some(c => c.name.includes('kimi-auth') || c.name.includes('access_token'));
    
    if (hasAuth) {
      this.setStatus(ProviderStatus.READY);
      return true;
    }
    
    const loginBtn = await page.$('button:has-text("登录")');
    if (loginBtn) {
      this.setStatus(ProviderStatus.AUTH_REQUIRED);
      return false;
    }
    
    this.setStatus(ProviderStatus.READY);
    return true;
  }

  async sendQuestion(page, question) {
    await this.preparePage(page);
    
    // Kimi使用Connect RPC协议
    const answer = await page.evaluate(async (msg) => {
      // 构建Connect协议请求
      const endpoint = '/apiv2/kimi.gateway.chat.v1.ChatService/Chat';
      
      const payload = JSON.stringify({
        "messages": [
          {
            "role": "user",
            "content": msg
          }
        ],
        "use_search": false,
        "extend": {}
      });
      
      // Connect协议头部: 5字节 + 数据
      const encoder = new TextEncoder();
      const encoded = encoder.encode(payload);
      const length = encoded.length;
      
      // 构造buffer: [length MSB, length mid, length LSB, 0, 0] + payload
      const buffer = new Uint8Array(5 + length);
      buffer[0] = (length >> 24) & 0xFF;
      buffer[1] = (length >> 16) & 0xFF;
      buffer[2] = (length >> 8) & 0xFF;
      buffer[3] = length & 0xFF;
      buffer[4] = 0;
      buffer.set(encoded, 5);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/connect+json',
          'Accept': 'application/connect+json'
        },
        body: buffer
      });
      
      if (!response.ok) throw new Error('Kimi API request failed');
      
      const reader = response.body.getReader();
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解析Connect流式响应
        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const data = JSON.parse(line.slice(2));
              if (data.answer) fullText += data.answer;
            } catch (e) {}
          }
        }
      }
      
      return fullText;
    }, question);
    
    return answer;
  }

  async extractAnswer(page) {
    return ''; // 已在sendQuestion中返回
  }
}

// ============ 导出 ============

module.exports = {
  ChatGPTProvider,
  ClaudeProvider,
  GeminiProvider,
  GrokProvider,
  PerplexityProvider,
  KimiProvider
};