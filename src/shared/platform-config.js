/**
 * ChatKey AI 平台完整配置
 * 基于 openclaw-zero-token 项目的选择器配置
 */

// ============ 平台基础URL ============
export const PLATFORM_URLS = {
  // 国内平台
  deepseek: 'https://chat.deepseek.com',
  qwen: 'https://chat2.qianwen.com',      // 国内版
  qwen_intl: 'https://chat.qwen.ai',      // 国际版
  doubao: 'https://www.doubao.com/chat/',
  kimi: 'https://www.kimi.com/',
  glm: 'https://chatglm.cn',
  
  // 国际平台
  chatgpt: 'https://chatgpt.com',
  claude: 'https://claude.ai',
  gemini: 'https://gemini.google.com/app',
  grok: 'https://grok.com',
  perplexity: 'https://www.perplexity.ai',
  glm_intl: 'https://chat.z.ai',
  xiaomimo: 'https://aistudio.xiaomimimo.com'
};

// ============ 输入框选择器（多选择器降级链）============
export const INPUT_SELECTORS = {
  deepseek: [
    'textarea[placeholder*="输入"]',
    'textarea[placeholder*="输入问题"]',
    'textarea',
    '[contenteditable="true"]'
  ],
  
  qwen: [
    'textarea[placeholder*="输入"]',
    'textarea[placeholder*="问题"]',
    'textarea',
    '[contenteditable="true"]'
  ],
  
  qwen_intl: [
    'textarea[placeholder*="Ask"]',
    'textarea',
    '[contenteditable="true"]'
  ],
  
  doubao: [
    'textarea[placeholder*="输入"]',
    'textarea',
    '[contenteditable="true"]'
  ],
  
  kimi: [
    'textarea[placeholder*="输入"]',
    'textarea',
    '[contenteditable="true"]'
  ],
  
  glm: [
    'textarea[placeholder*="输入"]',
    'textarea',
    '[contenteditable="true"]'
  ],
  
  chatgpt: [
    '#prompt-textarea',
    'textarea[placeholder]',
    'textarea',
    '[contenteditable="true"]'
  ],
  
  claude: [
    '[contenteditable="true"]',
    'textarea',
    'div[role="textbox"]'
  ],
  
  gemini: [
    'textarea[placeholder*="Gemini"]',
    'textarea[placeholder*="问问"]',
    'textarea[aria-label*="prompt"]',
    'textarea',
    '[contenteditable="true"]',
    'div[role="textbox"]'
  ],
  
  grok: [
    '[contenteditable="true"]',
    'textarea[placeholder]',
    'textarea',
    'div[role="textbox"]'
  ],
  
  perplexity: [
    'div[contenteditable="true"]',
    '[role="textbox"]',
    'textarea'
  ],
  
  glm_intl: [
    'textarea',
    '[contenteditable="true"]'
  ],
  
  xiaomimo: [
    'textarea',
    '[contenteditable="true"]'
  ]
};

// ============ 提交按钮选择器 ============
export const SUBMIT_SELECTORS = {
  deepseek: [
    'button[type="submit"]',
    'button[class*="send"]',
    'button[aria-label*="发送"]',
    'button:has-text("发送")'
  ],
  
  qwen: [
    'button[type="submit"]',
    'button[class*="send"]',
    'button[aria-label*="发送"]'
  ],
  
  qwen_intl: [
    'button[type="submit"]',
    'button[class*="send"]',
    'button[aria-label*="Send"]'
  ],
  
  doubao: [
    'button[type="submit"]',
    'button[class*="send"]',
    'button[aria-label*="发送"]'
  ],
  
  kimi: [
    'button[type="submit"]',
    'button[class*="send"]',
    'button[aria-label*="发送"]'
  ],
  
  glm: [
    'button[type="submit"]',
    'button[class*="send"]'
  ],
  
  chatgpt: [], // 使用Enter键提交
  
  claude: [], // API提交
  
  gemini: [], // Enter键提交
  
  grok: [], // Enter键提交
  
  perplexity: [], // Enter键提交
  
  glm_intl: [
    'button.sendMessageButton',
    'button[aria-label*="Send"]',
    'button:has-text("发送")'
  ],
  
  xiaomimo: [] // API提交
};

// ============ 回答内容选择器（按优先级）============
export const ANSWER_SELECTORS = {
  deepseek: [
    '[data-testid="conversation-turn-content"]',
    '.message-content',
    '[class*="markdown-body"]',
    '.markdown-body',
    'article'
  ],
  
  qwen: [
    '.message-content',
    '.chat-message-content',
    '.output-content',
    '[data-message-id]',
    'article'
  ],
  
  qwen_intl: [
    '[data-message-id]',
    '.message-content',
    'article'
  ],
  
  doubao: [
    '.message-content',
    '.assistant-message',
    '[data-message-id]',
    'article'
  ],
  
  kimi: [
    '[class*="message"] [class*="content"]',
    '.message-content',
    'article'
  ],
  
  glm: [
    '.message-content',
    '.response-content',
    '[data-message-id]',
    'article'
  ],
  
  chatgpt: [
    'div[data-message-author-role="assistant"]',
    '[class*="markdown"]',
    '.agent-turn [data-message-author-role="assistant"]',
    'article'
  ],
  
  claude: [
    '[class*="message"] [class*="content"]',
    '.message-content',
    'article'
  ],
  
  gemini: [
    'model-response message-content',
    '[data-message-author="model"] .message-content',
    '[data-message-author="model"]',
    '[data-sender="model"]',
    '[class*="model-response"] [class*="markdown"]',
    '[class*="response-content"] [class*="markdown"]',
    'article'
  ],
  
  grok: [
    '[data-role="assistant"]',
    '[class*="assistant"]',
    '[class*="response"]',
    '[class*="message"]',
    'article',
    '[class*="markdown"]',
    '.prose'
  ],
  
  perplexity: [
    '[class*="prose"]',
    '[class*="break-words"][class*="font-sans"]',
    '[class*="markdown"]',
    '[class*="threadConten"] [class*="gap-y-sm"]',
    'article'
  ],
  
  glm_intl: [
    '.chat-assistant',
    '[class*="assistant"]',
    'article'
  ],
  
  xiaomimo: [
    '[class*="response"]',
    'article'
  ]
};

// ============ 登录检测选择器 ============
export const LOGIN_SELECTORS = {
  deepseek: [
    'a[href*="login"]',
    'button[class*="login"]',
    'button:has-text("登录")'
  ],
  
  qwen: [
    'a[href*="login"]',
    'button:has-text("登录")',
    '.login-button'
  ],
  
  qwen_intl: [
    'a[href*="login"]',
    'button:has-text("Sign in")',
    'button:has-text("Log in")'
  ],
  
  doubao: [
    'button:has-text("登录")',
    'a[href*="login"]'
  ],
  
  kimi: [
    'button:has-text("登录")',
    'a[href*="login"]'
  ],
  
  glm: [
    'button:has-text("登录")',
    'a[href*="login"]'
  ],
  
  chatgpt: [
    'a[href*="login"]',
    'button:has-text("Sign in")',
    'button:has-text("Log in")'
  ],
  
  claude: [
    'a[href*="login"]',
    'button:has-text("Sign in")',
    'button:has-text("Sign up")'
  ],
  
  gemini: [
    'a[href*="signin"]',
    'button:has-text("Sign in")'
  ],
  
  grok: [
    'a[href*="login"]',
    'button:has-text("Sign in")'
  ],
  
  perplexity: [
    'button:has-text("Sign in")',
    'a[href*="login"]'
  ],
  
  glm_intl: [
    'button:has-text("Sign in")',
    'a[href*="login"]'
  ],
  
  xiaomimo: [
    'button:has-text("登录")',
    'a[href*="login"]'
  ]
};

// ============ Cookie名称（用于登录检测）============
export const COOKIE_NAMES = {
  deepseek: ['d_id', 'ds_session_id', 'HWSID'],
  qwen: ['qwen_session'],
  qwen_intl: ['qwen_session'],
  doubao: ['sessionid', 'ttwid'],
  kimi: ['kimi-auth', 'access_token'],
  glm: ['chatglm_token', 'chatglm_refresh_token', 'access_token'],
  chatgpt: ['__Secure-next-auth.session-token', 'next-auth.session-token'],
  claude: ['sessionKey', '__Secure-next-auth.session-token'],
  gemini: ['SID', '__Secure-1PSID'],
  grok: ['sso', '_ga'],
  perplexity: ['__Secure-next-auth.session-token', 'next-auth.session-token', 'intercom_session'],
  glm_intl: ['chatglm_token', 'access_token', 'auth_token', 'token'],
  xiaomimo: ['sessionid', 'token']
};

// ============ 平台能力配置 ============
export const PLATFORM_CAPABILITIES = {
  deepseek: { streaming: true, code: true, reasoning: true, maxTokens: 64000 },
  qwen: { streaming: true, code: true, maxTokens: 32000 },
  qwen_intl: { streaming: true, code: true, maxTokens: 32000 },
  doubao: { streaming: false, code: false, maxTokens: 32000 },
  kimi: { streaming: true, code: true, maxTokens: 200000 }, // 长上下文
  glm: { streaming: true, code: true, maxTokens: 128000 },
  chatgpt: { streaming: true, code: true, reasoning: false, maxTokens: 128000 },
  claude: { streaming: true, code: true, reasoning: true, maxTokens: 200000 },
  gemini: { streaming: true, code: true, maxTokens: 1000000 }, // 超长上下文
  grok: { streaming: true, code: true, maxTokens: 128000 },
  perplexity: { streaming: true, code: true, maxTokens: 8000 },
  glm_intl: { streaming: true, code: true, maxTokens: 128000 },
  xiaomimo: { streaming: true, code: true, maxTokens: 128000 }
};

// ============ 默认模型映射 ============
export const DEFAULT_MODELS = {
  deepseek: 'deepseek-chat',
  qwen: 'qwen-turbo',
  qwen_intl: 'qwen-plus',
  doubao: 'doubao-pro',
  kimi: 'kimi-moonshot',
  glm: 'glm-4',
  chatgpt: 'gpt-4',
  claude: 'claude-3-5-sonnet',
  gemini: 'gemini-1.5-pro',
  grok: 'grok-2',
  perplexity: 'perplexity-sonar',
  glm_intl: 'glm-4',
  xiaomimo: 'xiaomimo-1.0'
};

// ============ 等待超时配置 ============
export const PLATFORM_TIMEOUTS = {
  deepseek: 60000,
  qwen: 60000,
  qwen_intl: 60000,
  doubao: 8000,
  kimi: 60000,
  glm: 60000,
  chatgpt: 90000,
  claude: 90000,
  gemini: 120000,
  grok: 90000,
  perplexity: 120000,
  glm_intl: 60000,
  xiaomimo: 60000
};

// ============ 平台类型枚举 ============
export const PlatformType = {
  DEEPSEEK: 'deepseek-web',
  QWEN: 'qwen-web',
  QWEN_INTL: 'qwen-intl-web',
  DOUBAO: 'doubao-web',
  KIMI: 'kimi-web',
  GLM: 'glm-web',
  CHATGPT: 'chatgpt-web',
  CLAUDE: 'claude-web',
  GEMINI: 'gemini-web',
  GROK: 'grok-web',
  PERPLEXITY: 'perplexity-web',
  GLM_INTL: 'glm-intl-web',
  XIAOMIMO: 'xiaomimo-web'
};

// ============ 快速查找映射 ============
export function getSelectors(platform) {
  return {
    input: INPUT_SELECTORS[platform] || ['textarea', '[contenteditable="true"]'],
    submit: SUBMIT_SELECTORS[platform] || ['button[type="submit"]'],
    answer: ANSWER_SELECTORS[platform] || ['[class*="message"]', 'article']
  };
}

export function getLoginSelectors(platform) {
  return LOGIN_SELECTORS[platform] || [
    'a[href*="login"]',
    'button:has-text("登录")',
    'button:has-text("Sign in")'
  ];
}

export function getCookieNames(platform) {
  return COOKIE_NAMES[platform] || [];
}

export function getPlatformConfig(platform) {
  return {
    url: PLATFORM_URLS[platform],
    selectors: getSelectors(platform),
    loginSelectors: getLoginSelectors(platform),
    cookieNames: getCookieNames(platform),
    capabilities: PLATFORM_CAPABILITIES[platform],
    defaultModel: DEFAULT_MODELS[platform],
    timeout: PLATFORM_TIMEOUTS[platform]
  };
}